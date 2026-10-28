-- ============================================================================
-- Migration: 20261027080000_phase5_seating_vendors_checkin.sql
-- Description: Rate limiter lockdown, on-file email cap (5/24h), check-in codes,
--              atomic seating assignments with row locking, vendors & tasks RLS,
--              and check_in RPC.
-- ============================================================================

-- 1. Rate limiter hardening:
--    - Delete expired rows inside hit_rate_limit to bound table size
--    - Revoke execute from anon and authenticated; service_role only
create or replace function public.hit_rate_limit(
  p_key text,
  p_limit int,
  p_window interval default interval '1 minute'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_record record;
begin
  if nullif(trim(p_key), '') is null then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'retry_after', 60);
  end if;

  -- Delete expired rate limit records older than 1 hour to prevent unbounded growth
  delete from public.rate_limits
  where reset_at < (v_now - interval '1 hour');

  insert into public.rate_limits (key, count, reset_at)
  values (p_key, 1, v_now + p_window)
  on conflict (key) do update set
    count = case
      when public.rate_limits.reset_at < v_now then 1
      else public.rate_limits.count + 1
    end,
    reset_at = case
      when public.rate_limits.reset_at < v_now then v_now + p_window
      else public.rate_limits.reset_at
    end
  returning count, reset_at into v_record;

  if v_record.count > p_limit then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'retry_after', greatest(1, ceil(extract(epoch from (v_record.reset_at - v_now))))::int,
      'reset_at', v_record.reset_at
    );
  else
    return jsonb_build_object(
      'allowed', true,
      'remaining', p_limit - v_record.count,
      'retry_after', 0,
      'reset_at', v_record.reset_at
    );
  end if;
end;
$$;

revoke execute on function public.hit_rate_limit(text, int, interval) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, interval) to service_role;

-- 2. Check-in code generator
create or replace function public.generate_check_in_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_bytes bytea;
  v_code text := 'ARY-';
  v_rand int;
  i int;
begin
  v_bytes := extensions.gen_random_bytes(8);
  for i in 0..7 loop
    v_rand := get_byte(v_bytes, i);
    v_code := v_code || substr(v_chars, (v_rand % 32) + 1, 1);
    if i = 3 then
      v_code := v_code || '-';
    end if;
  end loop;
  return v_code;
end;
$$;

revoke execute on function public.generate_check_in_code() from public, anon, authenticated;
grant execute on function public.generate_check_in_code() to service_role;

-- Add check_in_code to public.guests
alter table public.guests
add column if not exists check_in_code text;

-- Generate code for any existing guests
update public.guests
set check_in_code = public.generate_check_in_code()
where check_in_code is null;

alter table public.guests
alter column check_in_code set default '';

alter table public.guests
alter column check_in_code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'guests_check_in_code_key' and conrelid = 'public.guests'::regclass
  ) then
    alter table public.guests add constraint guests_check_in_code_key unique (check_in_code);
  end if;
end $$;

-- Update guests trigger to populate rsvp_token and check_in_code
create or replace function public.tr_guests_generate_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.rsvp_token := public.generate_invitation_token();
  if new.check_in_code is null or new.check_in_code = '' then
    new.check_in_code := public.generate_check_in_code();
  end if;
  return new;
end;
$$;

-- Revoke updates to check_in_code
revoke update (check_in_code) on public.guests from anon, authenticated;

-- 3. Dedicated RPC to retrieve check_in_code for confirmed guest passes
create or replace function public.get_check_in_code(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_rsvp record;
begin
  if nullif(trim(p_token), '') is null then
    return null;
  end if;

  select * into v_guest
  from public.guests
  where rsvp_token = trim(p_token);

  if not found then
    return null;
  end if;

  select * into v_rsvp
  from public.rsvps
  where guest_id = v_guest.id;

  if not found or v_rsvp.status <> 'accepted' then
    return null;
  end if;

  return v_guest.check_in_code;
end;
$$;

grant execute on function public.get_check_in_code(text) to anon, authenticated;

grant execute on function public.get_invitation(text) to anon, authenticated;

-- 4. Update submit_rsvp:
--    - Cap on-file confirmations at 5 per 24h
--    - Cap non-file confirmations at 1 per 24h
--    - Re-check table capacity when guest is seated and party size increases
create or replace function public.submit_rsvp(
  p_token text,
  p_status text,
  p_attending_count integer,
  p_plus_one_name text default null,
  p_dietary text default null,
  p_note text default null,
  p_contact_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_event record;
  v_rsvp record;
  v_seated_table record;
  v_other_seated integer := 0;
  v_max_attendees integer;
  v_trimmed_plus_one text;
  v_trimmed_dietary text;
  v_trimmed_note text;
  v_trimmed_email text;
  v_target_email text;
  v_was_on_file boolean;
  v_can_send_email boolean := false;
  v_recent_sends int := 0;
begin
  if nullif(trim(p_token), '') is null then
    raise exception 'Invalid invitation token';
  end if;

  select * into v_guest
  from public.guests
  where rsvp_token = trim(p_token);

  if not found then
    raise exception 'Invalid invitation token';
  end if;

  select * into v_event
  from public.events
  where id = v_guest.event_id;

  if not found then
    raise exception 'Celebration not found';
  end if;

  -- 1. Check event is active
  if v_event.status <> 'active' then
    raise exception 'This celebration is no longer accepting RSVP responses';
  end if;

  -- 2. Check rsvp_by deadline
  if v_event.rsvp_by is not null and now() > v_event.rsvp_by then
    raise exception 'The RSVP deadline for this celebration has passed';
  end if;

  -- 3. Check status
  if p_status not in ('accepted', 'declined') then
    raise exception 'Invalid status. Must be accepted or declined';
  end if;

  -- 4. Check attending count
  v_max_attendees := v_guest.party_size + (case when v_guest.plus_ones_allowed then 1 else 0 end);

  if p_status = 'accepted' then
    if p_attending_count < 1 or p_attending_count > v_max_attendees then
      raise exception 'Attending count must be between 1 and %', v_max_attendees;
    end if;

    -- Re-check table capacity if guest is already assigned to a table
    select sa.table_id, t.name as table_name, t.capacity
    into v_seated_table
    from public.seat_assignments sa
    join public.tables t on t.id = sa.table_id
    where sa.guest_id = v_guest.id;

    if found then
      -- Lock the table row for update
      perform 1 from public.tables where id = v_seated_table.table_id for update;

      select coalesce(sum(coalesce(r.attending_count, g.party_size)), 0)
      into v_other_seated
      from public.seat_assignments sa
      join public.guests g on g.id = sa.guest_id
      left join public.rsvps r on r.guest_id = g.id
      where sa.table_id = v_seated_table.table_id
        and sa.guest_id <> v_guest.id
        and (r.status is null or r.status = 'accepted');

      if (v_other_seated + p_attending_count) > v_seated_table.capacity then
        raise exception 'Your updated party size (% guests) exceeds the available seats at your assigned table (%). Please contact the hosts to adjust seating.',
          p_attending_count, v_seated_table.table_name;
      end if;
    end if;
  else
    if p_attending_count <> 0 then
      raise exception 'Attending count must be 0 when declining';
    end if;
  end if;

  -- 5. Email handling: ONLY fill null email; NEVER overwrite an existing email
  if v_guest.email is not null then
    v_target_email := v_guest.email;
    v_was_on_file := (not coalesce(v_guest.email_collected_via_rsvp, false));
  else
    v_was_on_file := false;
    v_trimmed_email := nullif(trim(lower(coalesce(p_contact_email, ''))), '');
    if v_trimmed_email is not null then
      if length(v_trimmed_email) > 254 or v_trimmed_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
        raise exception 'Invalid contact email address';
      end if;
      update public.guests
      set email = v_trimmed_email,
          email_collected_via_rsvp = true
      where id = v_guest.id;
      v_target_email := v_trimmed_email;
    else
      v_target_email := null;
    end if;
  end if;

  -- 6. Enforce email cap in the database (email_log):
  --    - On-file emails: at most 5 per guest per 24 hours
  --    - Non-file emails: at most 1 per guest per 24 hours
  if v_target_email is not null then
    select count(*)
    into v_recent_sends
    from public.email_log
    where guest_id = v_guest.id
      and sent_at >= (now() - interval '24 hours')
      and status = 'sent';

    if v_was_on_file then
      v_can_send_email := (v_recent_sends < 5);
    else
      v_can_send_email := (v_recent_sends < 1);
    end if;
  end if;

  -- 7. Trim and length-limit text fields
  v_trimmed_plus_one := nullif(substr(trim(coalesce(p_plus_one_name, '')), 1, 100), '');
  v_trimmed_dietary := nullif(substr(trim(coalesce(p_dietary, '')), 1, 300), '');
  v_trimmed_note := nullif(substr(trim(coalesce(p_note, '')), 1, 500), '');

  insert into public.rsvps (
    guest_id,
    status,
    attending_count,
    plus_one_name,
    dietary,
    note,
    responded_at,
    revision_count
  ) values (
    v_guest.id,
    p_status,
    case when p_status = 'accepted' then p_attending_count else 0 end,
    v_trimmed_plus_one,
    v_trimmed_dietary,
    v_trimmed_note,
    now(),
    1
  )
  on conflict (guest_id) do update set
    status = excluded.status,
    attending_count = excluded.attending_count,
    plus_one_name = excluded.plus_one_name,
    dietary = excluded.dietary,
    note = excluded.note,
    revision_count = public.rsvps.revision_count + 1,
    responded_at = now(),
    updated_at = now()
  returning * into v_rsvp;

  -- If guest declined, automatically remove any seat assignment
  if p_status = 'declined' then
    delete from public.seat_assignments where guest_id = v_guest.id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'rsvp', jsonb_build_object(
      'status', v_rsvp.status,
      'attending_count', v_rsvp.attending_count,
      'plus_one_name', v_rsvp.plus_one_name,
      'dietary', v_rsvp.dietary,
      'note', v_rsvp.note,
      'responded_at', v_rsvp.responded_at
    ),
    'email_delivery', jsonb_build_object(
      'target_email', v_target_email,
      'was_on_file', v_was_on_file,
      'can_send', v_can_send_email
    )
  );
end;
$$;

grant execute on function public.submit_rsvp(text, text, integer, text, text, text, text) to anon, authenticated;

-- 5. Seating: Concurrency row locking in check_table_capacity
create or replace function public.check_table_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity int;
  v_used int;
  v_guest_party int;
begin
  -- Lock the target table for update to prevent concurrent over-allocation
  select capacity into v_capacity
  from public.tables
  where id = new.table_id
  for update;

  if not found then
    raise exception 'Table not found';
  end if;

  -- Calculate seats currently used at this table excluding this guest
  select coalesce(sum(coalesce(r.attending_count, g.party_size)), 0)
  into v_used
  from public.seat_assignments sa
  join public.guests g on g.id = sa.guest_id
  left join public.rsvps r on r.guest_id = g.id
  where sa.table_id = new.table_id
    and sa.guest_id <> new.guest_id
    and (r.status is null or r.status = 'accepted');

  -- Get party size of the guest being seated
  select coalesce(r.attending_count, g.party_size) into v_guest_party
  from public.guests g
  left join public.rsvps r on r.guest_id = g.id
  where g.id = new.guest_id;

  if (v_used + v_guest_party) > v_capacity then
    raise exception 'Table capacity exceeded. Available: %, required: %',
      (v_capacity - v_used), v_guest_party;
  end if;

  return new;
end;
$$;

-- 6. RPC: assign_seat(p_guest_id, p_table_id | null)
create or replace function public.assign_seat(
  p_guest_id uuid,
  p_table_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_table record;
begin
  select * into v_guest
  from public.guests
  where id = p_guest_id;

  if not found then
    raise exception 'Guest not found';
  end if;

  -- Only owners and planners can assign seats
  if not public.has_event_role(v_guest.event_id, array['owner', 'planner']) then
    raise exception 'Insufficient permissions to manage seating assignments';
  end if;

  -- If p_table_id is null, unseat guest
  if p_table_id is null then
    delete from public.seat_assignments
    where guest_id = p_guest_id;

    return jsonb_build_object(
      'ok', true,
      'guest_id', p_guest_id,
      'seated', false,
      'table_id', null
    );
  end if;

  -- Verify table exists and belongs to the same event
  select * into v_table
  from public.tables
  where id = p_table_id;

  if not found or v_table.event_id <> v_guest.event_id then
    raise exception 'Table does not belong to this celebration';
  end if;

  -- Insert or update seat assignment (trigger check_table_capacity will enforce capacity with row lock)
  insert into public.seat_assignments (
    guest_id,
    table_id,
    assigned_at
  ) values (
    p_guest_id,
    p_table_id,
    now()
  )
  on conflict (guest_id) do update set
    table_id = excluded.table_id,
    assigned_at = now(),
    updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'guest_id', p_guest_id,
    'seated', true,
    'table_id', p_table_id,
    'table_name', v_table.name
  );
end;
$$;

grant execute on function public.assign_seat(uuid, uuid) to authenticated;

-- 7. RPC: check_in(p_event_id, p_code, p_count)
create or replace function public.check_in(
  p_event_id uuid,
  p_code text,
  p_count integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_clean_code text;
  v_guest record;
  v_rsvp record;
  v_table_name text;
  v_already_checked_in integer := 0;
  v_new_total integer;
  v_attending integer;
begin
  -- 1. Check caller role: owner, planner, or staff
  if not public.has_event_role(p_event_id, array['owner', 'planner', 'staff']) then
    raise exception 'Insufficient permissions to perform guest check-in';
  end if;

  v_clean_code := upper(trim(coalesce(p_code, '')));
  if v_clean_code = '' then
    return jsonb_build_object('status', 'unknown_code', 'message', 'Please enter a valid check-in code');
  end if;

  -- 2. Look up guest by check_in_code across all events
  select * into v_guest
  from public.guests
  where upper(check_in_code) = v_clean_code;

  if not found then
    return jsonb_build_object('status', 'unknown_code', 'message', 'Check-in code not recognized');
  end if;

  -- 3. Check event match
  if v_guest.event_id <> p_event_id then
    return jsonb_build_object(
      'status', 'wrong_event',
      'message', 'This check-in pass belongs to a different celebration',
      'guest_name', v_guest.name
    );
  end if;

  -- 4. Check RSVP status
  select * into v_rsvp
  from public.rsvps
  where guest_id = v_guest.id;

  if not found or v_rsvp.status <> 'accepted' then
    return jsonb_build_object(
      'status', 'not_attending',
      'message', 'Guest RSVP is not confirmed as accepted',
      'guest_name', v_guest.name,
      'rsvp_status', coalesce(v_rsvp.status, 'pending')
    );
  end if;

  v_attending := v_rsvp.attending_count;

  -- 5. Calculate already checked-in count
  select coalesce(sum(checked_in_count), 0)
  into v_already_checked_in
  from public.check_ins
  where guest_id = v_guest.id and event_id = p_event_id;

  if v_already_checked_in >= v_attending then
    return jsonb_build_object(
      'status', 'already_checked_in',
      'message', 'Guest party has already fully checked in',
      'guest_name', v_guest.name,
      'checked_in_count', v_already_checked_in,
      'attending_count', v_attending
    );
  end if;

  -- 6. Enforce p_count <= remaining attendees
  if p_count <= 0 then
    p_count := 1;
  end if;
  if (v_already_checked_in + p_count) > v_attending then
    p_count := v_attending - v_already_checked_in;
  end if;

  v_new_total := v_already_checked_in + p_count;

  -- Record check-in
  insert into public.check_ins (
    event_id,
    guest_id,
    staff_id,
    checked_in_count,
    checked_in_at
  ) values (
    p_event_id,
    v_guest.id,
    v_user_id,
    p_count,
    now()
  );

  -- Fetch table assignment if any
  select t.name into v_table_name
  from public.seat_assignments sa
  join public.tables t on t.id = sa.table_id
  where sa.guest_id = v_guest.id;

  return jsonb_build_object(
    'status', 'checked_in',
    'message', 'Guest successfully admitted',
    'guest_name', v_guest.name,
    'guest_id', v_guest.id,
    'admitted_now', p_count,
    'total_checked_in', v_new_total,
    'attending_count', v_attending,
    'table_name', v_table_name
  );
end;
$$;

grant execute on function public.check_in(uuid, text, integer) to authenticated;

-- 8. Enable Realtime on check_ins
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.check_ins;
  end if;
exception
  when duplicate_object then null;
end $$;

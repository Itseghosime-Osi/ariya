-- Migration: 20261027120000_phase6_core_fixes.sql
-- Description: Add table_seats_used helper, seating_conflict_at flag,
--              structured SQLSTATE/HINT error handling, and unified metrics.

-- 1. Add seating_conflict_at to public.guests
alter table public.guests
  add column if not exists seating_conflict_at timestamptz;

-- 2. Core seating calculation function
-- Rule: accepted -> attending_count, pending/null -> party_size, declined -> 0
create or replace function public.table_seats_used(
  p_table_id uuid,
  p_exclude_guest uuid default null
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_used integer := 0;
begin
  select coalesce(sum(
    case
      when r.status = 'accepted' then r.attending_count
      when r.status = 'declined' then 0
      else g.party_size
    end
  ), 0)
  into v_used
  from public.seat_assignments sa
  join public.guests g on g.id = sa.guest_id
  left join public.rsvps r on r.guest_id = g.id
  where sa.table_id = p_table_id
    and (p_exclude_guest is null or sa.guest_id <> p_exclude_guest);

  return v_used;
end;
$$;

grant execute on function public.table_seats_used(uuid, uuid) to authenticated, anon;

-- 3. Update check_table_capacity to use table_seats_used and raise structured HINT
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
    raise exception 'Table not found'
      using errcode = 'P0001', hint = 'TABLE_NOT_FOUND';
  end if;

  -- Calculate seats currently used at this table excluding this guest
  v_used := public.table_seats_used(new.table_id, new.guest_id);

  -- Determine seats required by this guest
  select coalesce(
    case
      when r.status = 'accepted' then r.attending_count
      when r.status = 'declined' then 0
      else g.party_size
    end,
    g.party_size
  ) into v_guest_party
  from public.guests g
  left join public.rsvps r on r.guest_id = g.id
  where g.id = new.guest_id;

  if (v_used + v_guest_party) > v_capacity then
    raise exception 'Table capacity exceeded. Available: %, required: %',
      greatest(0, v_capacity - v_used), v_guest_party
      using errcode = 'P0001', hint = 'CAPACITY_EXCEEDED';
  end if;

  return new;
end;
$$;

-- 4. Update submit_rsvp:
--    - Over-capacity on an RSVP: accept the guest's RSVP, remove seat assignment,
--      record seating_conflict_at flag. Guest sees normal confirmation.
--    - Structured HINTs for invalid states.
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
    raise exception 'Invalid invitation token'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  select * into v_guest
  from public.guests
  where rsvp_token = trim(p_token);

  if not found then
    raise exception 'Invalid invitation token'
      using errcode = 'P0001', hint = 'GUEST_NOT_FOUND';
  end if;

  select * into v_event
  from public.events
  where id = v_guest.event_id;

  if not found then
    raise exception 'Celebration not found'
      using errcode = 'P0001', hint = 'EVENT_NOT_FOUND';
  end if;

  -- 1. Check event is active
  if v_event.status <> 'active' then
    raise exception 'This celebration is no longer accepting RSVP responses'
      using errcode = 'P0001', hint = 'RSVP_CLOSED';
  end if;

  -- 2. Check rsvp_by deadline
  if v_event.rsvp_by is not null and now() > v_event.rsvp_by then
    raise exception 'The RSVP deadline for this celebration has passed'
      using errcode = 'P0001', hint = 'RSVP_DEADLINE_PASSED';
  end if;

  -- 3. Check status
  if p_status not in ('accepted', 'declined') then
    raise exception 'Invalid status. Must be accepted or declined'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  -- 4. Check attending count
  v_max_attendees := v_guest.party_size + (case when v_guest.plus_ones_allowed then 1 else 0 end);

  if p_status = 'accepted' then
    if p_attending_count < 1 or p_attending_count > v_max_attendees then
      raise exception 'Attending count must be between 1 and %', v_max_attendees
        using errcode = 'P0001', hint = 'ATTENDEE_COUNT_INVALID';
    end if;

    -- Check if guest is currently assigned to a table
    select sa.table_id, t.name as table_name, t.capacity
    into v_seated_table
    from public.seat_assignments sa
    join public.tables t on t.id = sa.table_id
    where sa.guest_id = v_guest.id;

    if found then
      -- Lock the table row for update
      perform 1 from public.tables where id = v_seated_table.table_id for update;

      v_other_seated := public.table_seats_used(v_seated_table.table_id, v_guest.id);

      if (v_other_seated + p_attending_count) > v_seated_table.capacity then
        -- Over-capacity: accept RSVP, remove seat assignment, flag seating conflict
        delete from public.seat_assignments where guest_id = v_guest.id;
        update public.guests
        set seating_conflict_at = clock_timestamp()
        where id = v_guest.id;
      else
        -- Fits at table: clear any previous conflict flag
        update public.guests
        set seating_conflict_at = null
        where id = v_guest.id and seating_conflict_at is not null;
      end if;
    end if;
  else
    if p_attending_count <> 0 then
      raise exception 'Attending count must be 0 when declining'
        using errcode = 'P0001', hint = 'ATTENDEE_COUNT_INVALID';
    end if;

    -- If declining, remove seat assignment and clear conflict flag
    delete from public.seat_assignments where guest_id = v_guest.id;
    update public.guests
    set seating_conflict_at = null
    where id = v_guest.id and seating_conflict_at is not null;
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
        raise exception 'Invalid contact email address'
          using errcode = 'P0001', hint = 'ROW_INVALID';
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
    responded_at = now(),
    revision_count = public.rsvps.revision_count + 1
  returning * into v_rsvp;

  return jsonb_build_object(
    'ok', true,
    'guest_id', v_guest.id,
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

-- 5. Update assign_seat: clears seating_conflict_at on assignment, structured HINTs
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
    raise exception 'Guest not found'
      using errcode = 'P0001', hint = 'GUEST_NOT_FOUND';
  end if;

  -- Only owners and planners can assign seats
  if not public.has_event_role(v_guest.event_id, array['owner', 'planner']) then
    raise exception 'Insufficient permissions to manage seating assignments'
      using errcode = '42501', hint = 'NOT_PERMITTED';
  end if;

  -- If p_table_id is null, unseat guest
  if p_table_id is null then
    delete from public.seat_assignments
    where guest_id = p_guest_id;

    -- Note: unseating does not clear conflict flag unless explicitly seated or cleared
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
    raise exception 'Table does not belong to this celebration'
      using errcode = 'P0001', hint = 'TABLE_NOT_FOUND';
  end if;

  -- Insert or update seat assignment (trigger check_table_capacity enforces capacity with row lock)
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

  -- Clear conflict flag since guest is now successfully seated
  update public.guests
  set seating_conflict_at = null
  where id = p_guest_id and seating_conflict_at is not null;

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

-- 6. Update get_user_events_with_metrics to compute seatedGuests using table_seats_used
create or replace function public.get_user_events_with_metrics()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'event', row_to_json(e),
        'role', em.role,
        'metrics', jsonb_build_object(
          'totalParties', coalesce(stats.total_parties, 0),
          'totalAttendees', coalesce(stats.total_attendees, 0),
          'acceptedParties', coalesce(stats.accepted_parties, 0),
          'acceptedGuests', coalesce(stats.accepted_guests, 0),
          'awaitingParties', coalesce(stats.awaiting_parties, 0),
          'awaitingGuests', coalesce(stats.awaiting_guests, 0),
          'declinedParties', coalesce(stats.declined_parties, 0),
          'declinedGuests', coalesce(stats.declined_guests, 0),
          'seatedGuests', coalesce(seats.seated_count, 0),
          'unassignedGuests', greatest(0, coalesce(stats.accepted_guests, 0) - coalesce(seats.seated_count, 0)),
          'readinessPercentage', case
            when coalesce(stats.total_attendees, 0) > 0
            then round((coalesce(stats.accepted_guests, 0)::numeric / stats.total_attendees::numeric) * 1000) / 10
            else 0
          end,
          'daysAway', greatest(0, ceil(extract(epoch from (e.date - now())) / 86400))
        )
      )
      order by e.date asc
    ),
    '[]'::jsonb
  )
  from public.events e
  join public.event_members em on em.event_id = e.id and em.user_id = (select auth.uid())
  left join lateral (
    select
      count(g.id) as total_parties,
      coalesce(sum(g.party_size), 0) as total_attendees,
      count(case when r.status = 'accepted' then 1 end) as accepted_parties,
      coalesce(sum(case when r.status = 'accepted' then r.attending_count else 0 end), 0) as accepted_guests,
      count(case when r.status is null or r.status = 'pending' then 1 end) as awaiting_parties,
      coalesce(sum(case when r.status is null or r.status = 'pending' then g.party_size else 0 end), 0) as awaiting_guests,
      count(case when r.status = 'declined' then 1 end) as declined_parties,
      coalesce(sum(case when r.status = 'declined' then g.party_size else 0 end), 0) as declined_guests
    from public.guests g
    left join public.rsvps r on r.guest_id = g.id
    where g.event_id = e.id
  ) stats on true
  left join lateral (
    select coalesce(sum(public.table_seats_used(t.id)), 0) as seated_count
    from public.tables t
    where t.event_id = e.id
  ) seats on true;
$$;

grant execute on function public.get_user_events_with_metrics to authenticated;
revoke execute on function public.get_user_events_with_metrics from anon;

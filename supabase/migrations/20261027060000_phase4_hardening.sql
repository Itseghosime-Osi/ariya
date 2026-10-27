-- ============================================================================
-- MIGRATION: Phase 4 Hardening - Email Guards, Rate Limiting & Public Event RPC
-- Timestamp: 20261027060000
-- ============================================================================

-- 1. Add is_public column to events (defaults to false)
alter table public.events add column if not exists is_public boolean not null default false;

-- 2. Add error_class column to email_log for failure diagnostics
alter table public.email_log add column if not exists error_class text;

-- 3. Add email_collected_via_rsvp column to guests to track addresses collected from public form
alter table public.guests add column if not exists email_collected_via_rsvp boolean not null default false;

-- 4. Database rate limits table and hit_rate_limit RPC
create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 1,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.hit_rate_limit(
  p_key text,
  p_limit int,
  p_window interval
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
      'retry_after', greatest(1, ceil(extract(epoch from (v_record.reset_at - v_now))))::int
    );
  else
    return jsonb_build_object(
      'allowed', true,
      'remaining', p_limit - v_record.count,
      'retry_after', 0
    );
  end if;
end;
$$;

grant execute on function public.hit_rate_limit(text, int, interval) to anon, authenticated;

-- 4. get_public_event security-definer RPC
create or replace function public.get_public_event(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event record;
begin
  if nullif(trim(p_slug), '') is null then
    return null;
  end if;

  select
    id, slug, title, couple, date, venue, area, dress_code, rsvp_by, status, is_public
  into v_event
  from public.events
  where slug = trim(p_slug)
    and status = 'active'
    and is_public = true;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_event.id,
    'slug', v_event.slug,
    'title', v_event.title,
    'couple', v_event.couple,
    'date', v_event.date,
    'venue', v_event.venue,
    'area', v_event.area,
    'dress_code', v_event.dress_code,
    'rsvp_by', v_event.rsvp_by,
    'status', v_event.status,
    'is_public', v_event.is_public
  );
end;
$$;

grant execute on function public.get_public_event(text) to anon, authenticated;

-- 5. Update submit_rsvp with p_contact_email and database-enforced email cap
drop function if exists public.submit_rsvp(text, text, integer, text, text, text);
drop function if exists public.submit_rsvp(text, text, integer, text, text, text, text);

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

  -- 2. Check rsvp_by deadline has not passed
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
  -- If not on file, send at most 1 confirmation per guest per 24 hours
  if v_target_email is not null then
    if v_was_on_file then
      v_can_send_email := true;
    else
      select count(*)
      into v_recent_sends
      from public.email_log
      where guest_id = v_guest.id
        and sent_at >= (now() - interval '24 hours')
        and status = 'sent';

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

-- Enforce per-token limits inside the RPCs, including direct Data API calls.
-- App-level IP limits remain in place. No hosted database is changed until this
-- migration is explicitly reviewed and applied. Return rather than raise on
-- throttling so the rate-limit counter is committed.

create or replace function public.get_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest record;
  v_event record;
  v_rsvp record;
  v_table_name text;
  v_first_name text;
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

  -- Limit only existing tokens: random guesses must not grow rate_limits.
  if not (public.hit_rate_limit(
    'rpc:get_invitation:' || md5(trim(p_token)), 40, interval '1 minute'
  ) ->> 'allowed')::boolean then
    return null;
  end if;

  select * into v_event
  from public.events
  where id = v_guest.event_id;

  if not found then
    return null;
  end if;

  select * into v_rsvp
  from public.rsvps
  where guest_id = v_guest.id;

  select t.name into v_table_name
  from public.seat_assignments sa
  join public.tables t on t.id = sa.table_id
  where sa.guest_id = v_guest.id;

  v_first_name := split_part(trim(v_guest.name), ' ', 1);

  return jsonb_build_object(
    'guest', jsonb_build_object(
      'id', v_guest.id,
      'first_name', v_first_name,
      'display_name', v_guest.name,
      'party_size', v_guest.party_size,
      'plus_ones_allowed', v_guest.plus_ones_allowed
    ),
    'rsvp', case
      when v_rsvp.id is not null then jsonb_build_object(
        'status', v_rsvp.status,
        'attending_count', v_rsvp.attending_count,
        'plus_one_name', v_rsvp.plus_one_name,
        'dietary', v_rsvp.dietary,
        'note', v_rsvp.note,
        'responded_at', v_rsvp.responded_at
      )
      else null
    end,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'couple', v_event.couple,
      'date', v_event.date,
      'venue', v_event.venue,
      'area', v_event.area,
      'dress_code', v_event.dress_code,
      'rsvp_by', v_event.rsvp_by,
      'status', v_event.status,
      'invitation_theme', v_event.invitation_theme,
      'invitation_headline', v_event.invitation_headline,
      'invitation_subheadline', v_event.invitation_subheadline,
      'invitation_message', v_event.invitation_message
    ),
    'table_name', v_table_name
  );
end;
$$;

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

  -- Limit only existing tokens: random guesses must not grow rate_limits.
  if not (public.hit_rate_limit(
    'rpc:get_check_in_code:' || md5(trim(p_token)), 40, interval '1 minute'
  ) ->> 'allowed')::boolean then
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

  -- Limit only existing tokens: random guesses must not grow rate_limits.
  if not (public.hit_rate_limit(
    'rpc:submit_rsvp:' || md5(trim(p_token)), 10, interval '1 minute'
  ) ->> 'allowed')::boolean then
    return jsonb_build_object('ok', false, 'rate_limited', true);
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

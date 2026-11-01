-- Rollback for 20261101000000_mcp_token_lockdown.sql
--
-- The function bodies below were captured with pg_get_functiondef() from a database built
-- from every migration *before* this one, so they restore the exact prior behaviour.
--
-- This drops the three new tables and their data. Export ai_connection_settings first if
-- any host has already connected an app.

begin;

-- 1. Policies the migration added to existing tables
drop policy if exists "ai_connection_settings_select" on public.ai_connection_settings;
drop policy if exists "ai_connection_settings_insert" on public.ai_connection_settings;
drop policy if exists "ai_connection_settings_update" on public.ai_connection_settings;
drop policy if exists "ai_connection_settings_delete" on public.ai_connection_settings;
drop policy if exists "ai_activity_log_select" on public.ai_activity_log;
drop policy if exists "ai_activity_log_insert" on public.ai_activity_log;
drop policy if exists "ai_app_tokens_cannot_delete" on public.profiles;
drop policy if exists "ai_app_tokens_cannot_delete" on public.events;
drop policy if exists "ai_app_tokens_cannot_delete" on public.event_members;
drop policy if exists "ai_app_tokens_cannot_delete" on public.event_invites;
drop policy if exists "ai_app_tokens_cannot_delete" on public.tables;
drop policy if exists "ai_app_tokens_cannot_delete" on public.guests;
drop policy if exists "ai_app_tokens_cannot_delete" on public.rsvps;
drop policy if exists "ai_app_tokens_cannot_delete" on public.seat_assignments;
drop policy if exists "ai_app_tokens_cannot_delete" on public.vendors;
drop policy if exists "ai_app_tokens_cannot_delete" on public.vendor_tasks;
drop policy if exists "ai_app_tokens_cannot_delete" on public.email_log;
drop policy if exists "ai_app_tokens_cannot_delete" on public.payments;
drop policy if exists "ai_app_tokens_cannot_delete" on public.invoices;
drop policy if exists "ai_app_tokens_cannot_delete" on public.check_ins;
drop policy if exists "ai_app_tokens_cannot_delete" on public.ai_connection_settings;
drop policy if exists "ai_app_tokens_cannot_delete_objects" on storage.objects;
drop policy if exists "ai_app_tokens_cannot_manage_team_insert" on public.event_members;
drop policy if exists "ai_app_tokens_cannot_manage_team_update" on public.event_members;
drop policy if exists "ai_app_tokens_cannot_manage_invites_insert" on public.event_invites;
drop policy if exists "ai_app_tokens_cannot_manage_invites_update" on public.event_invites;
drop policy if exists "ai_app_tokens_cannot_write_billing_insert" on public.payments;
drop policy if exists "ai_app_tokens_cannot_write_billing_update" on public.payments;
drop policy if exists "ai_app_tokens_cannot_write_billing_insert" on public.invoices;
drop policy if exists "ai_app_tokens_cannot_write_billing_update" on public.invoices;
drop policy if exists "ai_app_tokens_cannot_write_email_insert" on public.email_log;
drop policy if exists "ai_app_tokens_cannot_write_email_update" on public.email_log;
drop policy if exists "ai_app_tokens_cannot_insert_events" on public.events;
drop policy if exists "ai_read_only_cannot_write_update" on public.events;
drop policy if exists "ai_read_only_cannot_write_insert" on public.tables;
drop policy if exists "ai_read_only_cannot_write_update" on public.tables;
drop policy if exists "ai_read_only_cannot_write_insert" on public.guests;
drop policy if exists "ai_read_only_cannot_write_update" on public.guests;
drop policy if exists "ai_read_only_cannot_write_insert" on public.rsvps;
drop policy if exists "ai_read_only_cannot_write_update" on public.rsvps;
drop policy if exists "ai_read_only_cannot_write_insert" on public.seat_assignments;
drop policy if exists "ai_read_only_cannot_write_update" on public.seat_assignments;
drop policy if exists "ai_read_only_cannot_write_insert" on public.vendors;
drop policy if exists "ai_read_only_cannot_write_update" on public.vendors;
drop policy if exists "ai_read_only_cannot_write_insert" on public.vendor_tasks;
drop policy if exists "ai_read_only_cannot_write_update" on public.vendor_tasks;
drop policy if exists "ai_read_only_cannot_write_insert" on public.check_ins;
drop policy if exists "ai_read_only_cannot_write_update" on public.check_ins;

-- 2. Prior definitions of the functions the migration redefined
CREATE OR REPLACE FUNCTION public.accept_team_invite(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_caller_id uuid;
  v_caller_email text;
  v_caller_confirmed_at timestamptz;
  v_invite record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select * into v_invite
  from public.event_invites
  where token = p_token
    and accepted_at is null
    and expires_at > timezone('utc'::text, now());

  if not found then
    raise exception 'Invitation invalid or expired'
      using errcode = 'P0001', hint = 'INVITE_INVALID';
  end if;

  -- Require lower(auth.email()) = lower(invite.email) and a confirmed email
  select email, email_confirmed_at into v_caller_email, v_caller_confirmed_at
  from auth.users
  where id = v_caller_id;

  if v_caller_email is null or v_caller_confirmed_at is null or lower(v_caller_email) <> lower(v_invite.email) then
    raise exception 'Invitation invalid for current user or email not confirmed'
      using errcode = 'P0001', hint = 'INVITE_INVALID';
  end if;

  -- Insert/update member into event_members
  perform set_config('app.invitation_accepting', 'true', true);

  insert into public.event_members (event_id, user_id, role)
  values (v_invite.event_id, v_caller_id, v_invite.role)
  on conflict (event_id, user_id)
  do update set role = excluded.role, updated_at = timezone('utc'::text, now());

  perform set_config('app.invitation_accepting', 'false', true);

  -- Mark invite accepted
  update public.event_invites
  set accepted_at = timezone('utc'::text, now())
  where id = v_invite.id;

  return jsonb_build_object(
    'event_id', v_invite.event_id,
    'role', v_invite.role
  );
end;
$function$

;

CREATE OR REPLACE FUNCTION public.assign_seat(p_guest_id uuid, p_table_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

;

CREATE OR REPLACE FUNCTION public.check_in(p_event_id uuid, p_code text, p_count integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

;

CREATE OR REPLACE FUNCTION public.check_invitation_quota(p_event_id uuid, p_recipient_count integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_paid_at timestamptz;
  v_total_invited integer;
begin
  select paid_at into v_paid_at
  from public.events
  where id = p_event_id;

  -- If event is already paid, unlimited invitations allowed
  if v_paid_at is not null then
    return true;
  end if;

  -- Count existing guests who have been invited
  select count(distinct id)::integer into v_total_invited
  from public.guests
  where event_id = p_event_id and invited_at is not null;

  if (v_total_invited + p_recipient_count) > 20 then
    raise exception 'Free tier limit reached. Events with more than 20 guests require celebration pass.'
      using errcode = 'P0001', hint = 'PAYMENT_REQUIRED';
  end if;

  return true;
end;
$function$

;

CREATE OR REPLACE FUNCTION public.create_event(p_title text, p_couple text, p_date timestamp with time zone, p_venue text, p_area text DEFAULT NULL::text, p_dress_code text DEFAULT NULL::text, p_slug text DEFAULT NULL::text, p_registry_code text DEFAULT NULL::text, p_rsvp_by timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid;
  v_event record;
  v_slug text;
begin
  v_user_id := (select auth.uid());
  if v_user_id is null then
    raise exception 'Authentication required to create a celebration';
  end if;

  if nullif(trim(p_title), '') is null then
    raise exception 'Celebration title is required';
  end if;

  if nullif(trim(p_couple), '') is null then
    raise exception 'Couple names are required';
  end if;

  if nullif(trim(p_venue), '') is null then
    raise exception 'Venue is required';
  end if;

  v_slug := coalesce(
    nullif(trim(p_slug), ''),
    lower(regexp_replace(trim(p_couple), '[^a-zA-Z0-9]+', '-', 'g'))
  );

  insert into public.events (
    title,
    couple,
    date,
    venue,
    area,
    dress_code,
    slug,
    status,
    registry_code,
    rsvp_by
  ) values (
    trim(p_title),
    trim(p_couple),
    p_date,
    trim(p_venue),
    nullif(trim(p_area), ''),
    nullif(trim(p_dress_code), ''),
    v_slug,
    'active',
    nullif(trim(p_registry_code), ''),
    p_rsvp_by
  )
  returning * into v_event;

  -- Ensure caller has a profile row before creating membership (fk constraint on event_members.user_id)
  insert into public.profiles (id, email, full_name, avatar_url)
  select
    u.id,
    coalesce(u.email, ''),
    coalesce(u.raw_user_meta_data->>'full_name', ''),
    coalesce(u.raw_user_meta_data->>'avatar_url', '')
  from auth.users u
  where u.id = v_user_id
  on conflict (id) do nothing;

  insert into public.event_members (
    event_id,
    user_id,
    role
  ) values (
    v_event.id,
    v_user_id,
    'owner'
  );

  return jsonb_build_object(
    'id', v_event.id,
    'slug', v_event.slug
  );
end;
$function$

;

CREATE OR REPLACE FUNCTION public.get_user_events_with_metrics()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

;

CREATE OR REPLACE FUNCTION public.global_search(p_query text, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_caller_id uuid;
  v_clean_query text;
  v_escaped text;
  v_pattern text;
  v_events jsonb;
  v_guests jsonb;
  v_vendors jsonb;
  v_effective_limit integer;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  v_clean_query := trim(coalesce(p_query, ''));
  if v_clean_query = '' then
    return jsonb_build_object(
      'events', '[]'::jsonb,
      'guests', '[]'::jsonb,
      'vendors', '[]'::jsonb
    );
  end if;

  v_effective_limit := least(greatest(coalesce(p_limit, 20), 1), 50);

  -- Escape %, _ and \ for parameterized safe ILIKE
  v_escaped := regexp_replace(v_clean_query, '([%_\\])', '\\\1', 'g');
  v_pattern := '%' || v_escaped || '%';

  -- 1. Search accessible events
  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_events
  from (
    select
      e.id,
      e.title,
      e.couple,
      e.date,
      e.venue,
      e.slug,
      em.role as user_role
    from public.events e
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      e.title ilike v_pattern escape '\'
      or e.couple ilike v_pattern escape '\'
      or e.venue ilike v_pattern escape '\'
      or e.slug ilike v_pattern escape '\'
    )
    order by e.date desc
    limit v_effective_limit
  ) sub;

  -- 2. Search accessible guests
  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_guests
  from (
    select
      g.id,
      g.event_id,
      g.name,
      g.email,
      g.phone,
      g.side,
      g.group_name,
      e.title as event_title
    from public.guests g
    join public.events e on e.id = g.event_id
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      g.name ilike v_pattern escape '\'
      or coalesce(g.email, '') ilike v_pattern escape '\'
      or coalesce(g.phone, '') ilike v_pattern escape '\'
      or coalesce(g.group_name, '') ilike v_pattern escape '\'
    )
    order by g.name asc
    limit v_effective_limit
  ) sub;

  -- 3. Search accessible vendors
  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_vendors
  from (
    select
      v.id,
      v.event_id,
      v.name,
      v.category,
      v.contact_name,
      v.contact_phone,
      v.contact_email,
      v.status,
      e.title as event_title
    from public.vendors v
    join public.events e on e.id = v.event_id
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      v.name ilike v_pattern escape '\'
      or v.category ilike v_pattern escape '\'
      or coalesce(v.contact_name, '') ilike v_pattern escape '\'
      or coalesce(v.contact_email, '') ilike v_pattern escape '\'
      or coalesce(v.contact_phone, '') ilike v_pattern escape '\'
    )
    order by v.name asc
    limit v_effective_limit
  ) sub;

  return jsonb_build_object(
    'events', v_events,
    'guests', v_guests,
    'vendors', v_vendors
  );
end;
$function$

;

CREATE OR REPLACE FUNCTION public.has_event_role(p_event_id uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.event_members
    where event_id = p_event_id
      and user_id = (select auth.uid())
      and role = any(p_roles)
  );
$function$

;

CREATE OR REPLACE FUNCTION public.import_guests(p_event_id uuid, p_guests jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item jsonb;
  v_idx int := 0;
  v_imported_count int := 0;
  v_name text;
  v_phone text;
  v_email text;
  v_side text;
  v_group text;
  v_notes text;
  v_party_size int;
  v_plus_ones boolean;
  v_is_vip boolean;
  v_token text;
begin
  if not public.has_event_role(p_event_id, array['owner', 'planner']) then
    raise exception 'You must be an owner or planner to import guests' using errcode = '42501';
  end if;

  if jsonb_typeof(p_guests) is distinct from 'array' then
    raise exception 'Payload must be a JSON array of guests' using errcode = '22000';
  end if;

  if jsonb_array_length(p_guests) > 500 then
    raise exception 'Payload exceeds maximum limit of 500 guests' using errcode = '22000';
  end if;

  for v_item in select * from jsonb_array_elements(p_guests)
  loop
    v_idx := v_idx + 1;
    v_name := trim(v_item->>'name');

    if v_name is null or length(v_name) = 0 then
      raise exception 'Row %: Guest name cannot be empty', v_idx using errcode = '22000';
    end if;

    if length(v_name) > 120 then
      raise exception 'Row %: Guest name exceeds maximum limit of 120 characters', v_idx using errcode = '22000';
    end if;

    v_email := nullif(trim(v_item->>'email'), '');
    if v_email is not null and length(v_email) > 254 then
      raise exception 'Row %: Email exceeds maximum limit of 254 characters', v_idx using errcode = '22000';
    end if;

    v_phone := nullif(trim(v_item->>'phone'), '');
    if v_phone is not null and length(v_phone) > 20 then
      raise exception 'Row %: Phone number exceeds maximum limit of 20 characters', v_idx using errcode = '22000';
    end if;

    v_group := nullif(trim(v_item->>'group_name'), '');
    if v_group is not null and length(v_group) > 80 then
      raise exception 'Row %: Group name exceeds maximum limit of 80 characters', v_idx using errcode = '22000';
    end if;

    v_notes := nullif(trim(v_item->>'notes'), '');
    if v_notes is not null and length(v_notes) > 500 then
      raise exception 'Row %: Notes exceed maximum limit of 500 characters', v_idx using errcode = '22000';
    end if;

    v_side := lower(coalesce(nullif(trim(v_item->>'side'), ''), 'mutual'));
    if v_side not in ('bride', 'groom', 'family', 'vip', 'planner', 'imported', 'mutual') then
      v_side := 'mutual';
    end if;

    v_party_size := greatest(1, least(20, coalesce((v_item->>'party_size')::int, 1)));
    v_plus_ones := coalesce((v_item->>'plus_ones_allowed')::boolean, false);
    v_is_vip := coalesce((v_item->>'is_vip')::boolean, false);

    -- Internal token generator ignores any payload token
    v_token := public.generate_invitation_token();

    insert into public.guests (
      event_id,
      name,
      phone,
      email,
      side,
      group_name,
      party_size,
      plus_ones_allowed,
      is_vip,
      notes,
      rsvp_token
    ) values (
      p_event_id,
      v_name,
      v_phone,
      v_email,
      v_side,
      v_group,
      v_party_size,
      v_plus_ones,
      v_is_vip,
      v_notes,
      v_token
    );

    v_imported_count := v_imported_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'imported_count', v_imported_count);
end;
$function$

;

CREATE OR REPLACE FUNCTION public.invite_team_member(p_event_id uuid, p_email text, p_role text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_clean_email text;
  v_invite_id uuid;
  v_token text;
  v_expires_at timestamptz;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select role into v_caller_role
  from public.event_members
  where event_id = p_event_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('owner', 'planner') then
    raise exception 'You do not have permission to invite team members'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if p_role not in ('owner', 'planner', 'couple', 'staff') then
    raise exception 'Invalid role: %', p_role
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  -- Role permissions: Planners may manage only couple and staff
  if v_caller_role = 'planner' and p_role in ('owner', 'planner') then
    raise exception 'Planners may invite only couple and staff roles'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  v_clean_email := lower(trim(p_email));
  if v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Invalid email address'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  -- Check if already an active member of this event
  if exists (
    select 1
    from public.event_members em
    join auth.users u on u.id = em.user_id
    where em.event_id = p_event_id and lower(u.email) = v_clean_email
  ) then
    raise exception 'User is already a member of this event'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  -- Delete any expired or existing unaccepted invite for this email on this event
  delete from public.event_invites
  where event_id = p_event_id and lower(email) = v_clean_email and accepted_at is null;

  v_token := public.generate_invitation_token();
  v_expires_at := timezone('utc'::text, now()) + interval '7 days';

  insert into public.event_invites (
    event_id,
    email,
    role,
    token,
    invited_by,
    expires_at
  )
  values (
    p_event_id,
    v_clean_email,
    p_role,
    v_token,
    v_caller_id,
    v_expires_at
  )
  returning id into v_invite_id;

  return jsonb_build_object(
    'id', v_invite_id,
    'event_id', p_event_id,
    'email', v_clean_email,
    'role', p_role,
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$function$

;

CREATE OR REPLACE FUNCTION public.is_event_member(p_event_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.event_members
    where event_id = p_event_id
      and user_id = (select auth.uid())
  );
$function$

;

CREATE OR REPLACE FUNCTION public.regenerate_guest_token(p_guest_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_event_id uuid;
  v_new_token text;
begin
  select event_id into v_event_id
  from public.guests
  where id = p_guest_id;

  if v_event_id is null then
    raise exception 'Guest not found' using errcode = 'P0002';
  end if;

  if not public.has_event_role(v_event_id, array['owner', 'planner']) then
    raise exception 'You must be an owner or planner to regenerate invitation links' using errcode = '42501';
  end if;

  v_new_token := public.generate_invitation_token();

  update public.guests
  set rsvp_token = v_new_token,
      updated_at = now()
  where id = p_guest_id;

  return v_new_token;
end;
$function$

;

CREATE OR REPLACE FUNCTION public.remove_team_member(p_event_id uuid, p_target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_target_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if v_caller_id = p_target_user_id then
    raise exception 'Members cannot remove themselves'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select role into v_caller_role
  from public.event_members
  where event_id = p_event_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('owner', 'planner') then
    raise exception 'You do not have permission to remove team members'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select role into v_target_role
  from public.event_members
  where event_id = p_event_id and user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Member not found'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  if v_caller_role = 'planner' and v_target_role in ('owner', 'planner') then
    raise exception 'Planners may manage only couple and staff'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  -- Delete target (tr_event_member_security enforces last owner rules)
  delete from public.event_members
  where event_id = p_event_id and user_id = p_target_user_id;

  return true;
end;
$function$

;

CREATE OR REPLACE FUNCTION public.shares_event_with(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.event_members mine
    join public.event_members theirs on theirs.event_id = mine.event_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$function$

;

CREATE OR REPLACE FUNCTION public.track_invitations_sent(p_guest_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_caller_id uuid;
  v_rec record;
  v_updated_count integer;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  -- For each distinct event affected by newly invited guests, enforce quota
  for v_rec in (
    select g.event_id, count(distinct g.id) as to_invite_count
    from public.guests g
    where g.id = any(p_guest_ids)
      and g.invited_at is null
    group by g.event_id
  ) loop
    if not public.has_event_role(v_rec.event_id, array['owner', 'planner', 'couple']) then
      raise exception 'You do not have permission to invite guests for this event'
        using errcode = 'P0001', hint = 'NOT_PERMITTED';
    end if;

    perform public.check_invitation_quota(v_rec.event_id, v_rec.to_invite_count::integer);
  end loop;

  update public.guests g
  set invited_at = timezone('utc'::text, now())
  where g.id = any(p_guest_ids)
    and public.has_event_role(g.event_id, array['owner', 'planner', 'couple']);

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$function$

;

CREATE OR REPLACE FUNCTION public.update_team_member_role(p_event_id uuid, p_target_user_id uuid, p_new_role text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_target_role text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if v_caller_id = p_target_user_id then
    raise exception 'No one may change their own role'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  if p_new_role not in ('owner', 'planner', 'couple', 'staff') then
    raise exception 'Invalid role: %', p_new_role
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  select role into v_caller_role
  from public.event_members
  where event_id = p_event_id and user_id = v_caller_id;

  if v_caller_role is null or v_caller_role not in ('owner', 'planner') then
    raise exception 'You do not have permission to change roles'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  select role into v_target_role
  from public.event_members
  where event_id = p_event_id and user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'Member not found'
      using errcode = 'P0001', hint = 'ROW_INVALID';
  end if;

  -- Planners may manage only couple and staff
  if v_caller_role = 'planner' and (v_target_role in ('owner', 'planner') or p_new_role in ('owner', 'planner')) then
    raise exception 'Planners may manage only couple and staff'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  -- Update target (tr_event_member_security enforces last owner rules)
  update public.event_members
  set role = p_new_role, updated_at = timezone('utc'::text, now())
  where event_id = p_event_id and user_id = p_target_user_id;

  return true;
end;
$function$

;

-- 3. Functions the migration introduced
drop function if exists public.ai_connection_event_allowed(uuid);
drop function if exists public.ai_connection_read_only();
drop function if exists public.assert_ai_cannot_manage_team();
drop function if exists public.assert_ai_write_allowed();
drop function if exists public.consume_quota(text,integer,integer);
drop function if exists public.current_app_client_id();
drop function if exists public.is_app_token();
drop function if exists public.is_first_party_session();

-- 4. Tables the migration introduced
drop table if exists public.ai_activity_log;
drop table if exists public.ai_quota_usage;
drop table if exists public.ai_connection_settings;

-- 5. Execute grants that existed before the migration
grant execute on function public.table_seats_used(uuid, uuid) to authenticated;
grant execute on function public.is_event_member(uuid, uuid) to anon, authenticated;

commit;

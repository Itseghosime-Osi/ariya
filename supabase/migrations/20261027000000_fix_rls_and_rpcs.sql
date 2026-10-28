-- Àríyá Database Migration: Fix RLS, RPCs, Capacity and Functions
-- Migration timestamp: 20261027000000

-- ============================================================================
-- 1. DROP OBSOLETE / INSECURE POLICIES & TRIGGERS
-- ============================================================================

-- Drop insecure open owner enrollment policy on event_members
drop policy if exists "Users can join as owner on event creation" on public.event_members;

-- Drop event update policy that had invalid event_id = id comparison
drop policy if exists "Owners and planners can update events" on public.events;
drop policy if exists "Members can view their events" on public.events;
drop policy if exists "Users can insert events" on public.events;

-- Drop event_members policies (had potential infinite recursion)
drop policy if exists "Members can view member list" on public.event_members;
drop policy if exists "Owners and planners can manage members" on public.event_members;

-- Drop table policies
drop policy if exists "Members can view tables" on public.tables;
drop policy if exists "Planners can manage tables" on public.tables;

-- Drop guest policies
drop policy if exists "Members can view guests" on public.guests;
drop policy if exists "Planners can manage guests" on public.guests;

-- Drop RSVP policies
drop policy if exists "Members can view RSVPs" on public.rsvps;
drop policy if exists "Planners can manage RSVPs" on public.rsvps;

-- Drop seat assignments policies
drop policy if exists "Members can view seat assignments" on public.seat_assignments;
drop policy if exists "Planners can manage seat assignments" on public.seat_assignments;

-- Drop vendors policies
drop policy if exists "Members can view vendors" on public.vendors;
drop policy if exists "Planners can manage vendors" on public.vendors;

-- Drop check_in policies
drop policy if exists "Members can view check-ins" on public.check_ins;
drop policy if exists "Staff can insert check-ins" on public.check_ins;

-- Drop payments & invoices policies
drop policy if exists "Members can view payments" on public.payments;
drop policy if exists "Members can view invoices" on public.invoices;

-- Drop event creation trigger & function (replaced by create_event RPC)
drop trigger if exists tr_on_event_created on public.events;
drop function if exists public.handle_new_event();

-- Drop previous check_table_capacity trigger to recreate with table row lock
drop trigger if exists tr_check_table_capacity on public.seat_assignments;

-- ============================================================================
-- 2. SECURITY DEFINER HELPERS (is_event_member & has_event_role)
-- ============================================================================

-- Helper: Check if current auth user is a member of the event
create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_members
    where event_id = p_event_id
      and user_id = (select auth.uid())
  );
$$;

-- Helper: Check if current auth user has one of the specified roles in the event
create or replace function public.has_event_role(p_event_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_members
    where event_id = p_event_id
      and user_id = (select auth.uid())
      and role = any(p_roles)
  );
$$;

grant execute on function public.is_event_member(uuid) to authenticated, anon;
grant execute on function public.has_event_role(uuid, text[]) to authenticated, anon;

-- Fix search_path on auth trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================================
-- 3. SHARED updated_at TRIGGER FUNCTION
-- ============================================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.handle_updated_at() from public, anon, authenticated;

-- Attach updated_at triggers to all tables with updated_at column
drop trigger if exists tr_profiles_updated_at on public.profiles;
create trigger tr_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_events_updated_at on public.events;
create trigger tr_events_updated_at
  before update on public.events
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_event_members_updated_at on public.event_members;
create trigger tr_event_members_updated_at
  before update on public.event_members
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_tables_updated_at on public.tables;
create trigger tr_tables_updated_at
  before update on public.tables
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_guests_updated_at on public.guests;
create trigger tr_guests_updated_at
  before update on public.guests
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_rsvps_updated_at on public.rsvps;
create trigger tr_rsvps_updated_at
  before update on public.rsvps
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_seat_assignments_updated_at on public.seat_assignments;
create trigger tr_seat_assignments_updated_at
  before update on public.seat_assignments
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_vendors_updated_at on public.vendors;
create trigger tr_vendors_updated_at
  before update on public.vendors
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_vendor_tasks_updated_at on public.vendor_tasks;
create trigger tr_vendor_tasks_updated_at
  before update on public.vendor_tasks
  for each row execute function public.handle_updated_at();

drop trigger if exists tr_payments_updated_at on public.payments;
create trigger tr_payments_updated_at
  before update on public.payments
  for each row execute function public.handle_updated_at();

-- ============================================================================
-- 4. TABLE CAPACITY ENFORCEMENT WITH ROW LOCKING
-- ============================================================================

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
  -- Lock the target table row to prevent race conditions during concurrent seatings
  select capacity into v_capacity
  from public.tables
  where id = new.table_id
  for update;

  if not found then
    raise exception 'Table not found';
  end if;

  -- Calculate seats currently used at this table: attending_count if accepted, otherwise party_size
  select coalesce(sum(
    case
      when r.status = 'accepted' then r.attending_count
      else g.party_size
    end
  ), 0) into v_used
  from public.seat_assignments sa
  join public.guests g on g.id = sa.guest_id
  left join public.rsvps r on r.guest_id = g.id
  where sa.table_id = new.table_id
    and sa.guest_id <> new.guest_id
    and (r.status is null or r.status <> 'declined');

  -- Get party count of the guest being seated: attending_count if accepted, otherwise party_size
  select coalesce(
    case
      when r.status = 'accepted' then r.attending_count
      else g.party_size
    end,
    g.party_size
  ) into v_guest_party
  from public.guests g
  left join public.rsvps r on r.guest_id = g.id
  where g.id = new.guest_id;

  if (v_used + v_guest_party) > v_capacity then
    raise exception 'Table capacity exceeded. Available: %, required: %', (v_capacity - v_used), v_guest_party;
  end if;

  return new;
end;
$$;

revoke execute on function public.check_table_capacity() from public, anon, authenticated;

create trigger tr_check_table_capacity
  before insert or update on public.seat_assignments
  for each row execute function public.check_table_capacity();

-- ============================================================================
-- 5. ATOMIC EVENT CREATION RPC (create_event)
-- ============================================================================

create or replace function public.create_event(
  p_title text,
  p_couple text,
  p_date timestamptz,
  p_venue text,
  p_area text default null,
  p_dress_code text default null,
  p_slug text default null,
  p_registry_code text default null,
  p_rsvp_by timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

grant execute on function public.create_event to authenticated;
revoke execute on function public.create_event from anon;

-- ============================================================================
-- 6. GUEST INVITATION QUERY RPC (get_invitation)
-- ============================================================================

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
      'status', v_event.status
    ),
    'table_name', v_table_name
  );
end;
$$;

grant execute on function public.get_invitation(text) to anon, authenticated;

-- ============================================================================
-- 7. GUEST RSVP SUBMISSION RPC (submit_rsvp)
-- ============================================================================

create or replace function public.submit_rsvp(
  p_token text,
  p_status text,
  p_attending_count integer,
  p_plus_one_name text default null,
  p_dietary text default null,
  p_note text default null
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

  -- 5. Trim and length-limit text fields
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
    )
  );
end;
$$;

grant execute on function public.submit_rsvp to anon, authenticated;

-- ============================================================================
-- 8. AGGREGATED METRICS RPC (get_user_events_with_metrics)
-- ============================================================================

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
          'asoEbiRequests', round(coalesce(stats.accepted_guests, 0) * 1.1),
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
    select count(sa.id) as seated_count
    from public.seat_assignments sa
    join public.guests g on g.id = sa.guest_id
    where g.event_id = e.id
  ) seats on true;
$$;

grant execute on function public.get_user_events_with_metrics to authenticated;
revoke execute on function public.get_user_events_with_metrics from anon;

-- ============================================================================
-- 9. STRICT RLS POLICIES WITH EXPLICIT USING & WITH CHECK
-- ============================================================================

-- ---- EVENTS ----
create policy "events_select_member" on public.events
  for select using (public.is_event_member(id));

create policy "events_insert_authenticated" on public.events
  for insert with check ((select auth.uid()) is not null);

create policy "events_update_planner" on public.events
  for update
  using (public.has_event_role(id, array['owner', 'planner']))
  with check (public.has_event_role(id, array['owner', 'planner']));

create policy "events_delete_owner" on public.events
  for delete using (public.has_event_role(id, array['owner']));

-- ---- EVENT MEMBERS ----
create policy "event_members_select" on public.event_members
  for select using (public.is_event_member(event_id));

create policy "event_members_insert" on public.event_members
  for insert with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "event_members_update" on public.event_members
  for update
  using (public.has_event_role(event_id, array['owner', 'planner']))
  with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "event_members_delete" on public.event_members
  for delete using (public.has_event_role(event_id, array['owner', 'planner']));

-- ---- TABLES ----
create policy "tables_select" on public.tables
  for select using (public.is_event_member(event_id));

create policy "tables_insert" on public.tables
  for insert with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "tables_update" on public.tables
  for update
  using (public.has_event_role(event_id, array['owner', 'planner']))
  with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "tables_delete" on public.tables
  for delete using (public.has_event_role(event_id, array['owner', 'planner']));

-- ---- GUESTS ----
create policy "guests_select" on public.guests
  for select using (public.is_event_member(event_id));

create policy "guests_insert" on public.guests
  for insert with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "guests_update" on public.guests
  for update
  using (public.has_event_role(event_id, array['owner', 'planner']))
  with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "guests_delete" on public.guests
  for delete using (public.has_event_role(event_id, array['owner', 'planner']));

-- ---- RSVPS ----
create policy "rsvps_select" on public.rsvps
  for select using (
    exists (
      select 1 from public.guests g
      where g.id = rsvps.guest_id and public.is_event_member(g.event_id)
    )
  );

create policy "rsvps_insert" on public.rsvps
  for insert with check (
    exists (
      select 1 from public.guests g
      where g.id = rsvps.guest_id and public.has_event_role(g.event_id, array['owner', 'planner'])
    )
  );

create policy "rsvps_update" on public.rsvps
  for update
  using (
    exists (
      select 1 from public.guests g
      where g.id = rsvps.guest_id and public.has_event_role(g.event_id, array['owner', 'planner'])
    )
  )
  with check (
    exists (
      select 1 from public.guests g
      where g.id = rsvps.guest_id and public.has_event_role(g.event_id, array['owner', 'planner'])
    )
  );

create policy "rsvps_delete" on public.rsvps
  for delete using (
    exists (
      select 1 from public.guests g
      where g.id = rsvps.guest_id and public.has_event_role(g.event_id, array['owner', 'planner'])
    )
  );

-- ---- SEAT ASSIGNMENTS ----
create policy "seat_assignments_select" on public.seat_assignments
  for select using (
    exists (
      select 1 from public.guests g
      where g.id = seat_assignments.guest_id and public.is_event_member(g.event_id)
    )
  );

create policy "seat_assignments_insert" on public.seat_assignments
  for insert with check (
    exists (
      select 1 from public.guests g
      where g.id = seat_assignments.guest_id and public.has_event_role(g.event_id, array['owner', 'planner'])
    )
  );

create policy "seat_assignments_update" on public.seat_assignments
  for update
  using (
    exists (
      select 1 from public.guests g
      where g.id = seat_assignments.guest_id and public.has_event_role(g.event_id, array['owner', 'planner'])
    )
  )
  with check (
    exists (
      select 1 from public.guests g
      where g.id = seat_assignments.guest_id and public.has_event_role(g.event_id, array['owner', 'planner'])
    )
  );

create policy "seat_assignments_delete" on public.seat_assignments
  for delete using (
    exists (
      select 1 from public.guests g
      where g.id = seat_assignments.guest_id and public.has_event_role(g.event_id, array['owner', 'planner'])
    )
  );

-- ---- VENDORS ----
create policy "vendors_select" on public.vendors
  for select using (public.is_event_member(event_id));

create policy "vendors_insert" on public.vendors
  for insert with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "vendors_update" on public.vendors
  for update
  using (public.has_event_role(event_id, array['owner', 'planner']))
  with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "vendors_delete" on public.vendors
  for delete using (public.has_event_role(event_id, array['owner', 'planner']));

-- ---- VENDOR TASKS ----
create policy "vendor_tasks_select" on public.vendor_tasks
  for select using (public.is_event_member(event_id));

create policy "vendor_tasks_insert" on public.vendor_tasks
  for insert with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "vendor_tasks_update" on public.vendor_tasks
  for update
  using (public.has_event_role(event_id, array['owner', 'planner']))
  with check (public.has_event_role(event_id, array['owner', 'planner']));

create policy "vendor_tasks_delete" on public.vendor_tasks
  for delete using (public.has_event_role(event_id, array['owner', 'planner']));

-- ---- EMAIL LOG (Read by members, inserted by service role only) ----
create policy "email_log_select" on public.email_log
  for select using (public.is_event_member(event_id));

-- ---- CHECK-INS (Staff, planner and owner can insert/view) ----
create policy "check_ins_select" on public.check_ins
  for select using (public.is_event_member(event_id));

create policy "check_ins_insert" on public.check_ins
  for insert with check (public.has_event_role(event_id, array['owner', 'planner', 'staff']));

create policy "check_ins_update" on public.check_ins
  for update
  using (public.has_event_role(event_id, array['owner', 'planner', 'staff']))
  with check (public.has_event_role(event_id, array['owner', 'planner', 'staff']));

-- ---- PAYMENTS & INVOICES ----
create policy "payments_select" on public.payments
  for select using (public.is_event_member(event_id));

create policy "invoices_select" on public.invoices
  for select using (public.is_event_member(event_id));

-- ============================================================================
-- 10. FOREIGN KEY INDEXES
-- ============================================================================

create index if not exists idx_event_members_event_id on public.event_members(event_id);
create index if not exists idx_event_members_user_id on public.event_members(user_id);
create index if not exists idx_tables_event_id on public.tables(event_id);
create index if not exists idx_guests_event_id on public.guests(event_id);
create index if not exists idx_guests_rsvp_token on public.guests(rsvp_token);
create index if not exists idx_rsvps_guest_id on public.rsvps(guest_id);
create index if not exists idx_seat_assignments_guest_id on public.seat_assignments(guest_id);
create index if not exists idx_seat_assignments_table_id on public.seat_assignments(table_id);
create index if not exists idx_vendors_event_id on public.vendors(event_id);
create index if not exists idx_vendor_tasks_event_id on public.vendor_tasks(event_id);
create index if not exists idx_vendor_tasks_vendor_id on public.vendor_tasks(vendor_id);
create index if not exists idx_email_log_event_id on public.email_log(event_id);
create index if not exists idx_email_log_guest_id on public.email_log(guest_id);
create index if not exists idx_payments_event_id on public.payments(event_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_invoices_event_id on public.invoices(event_id);
create index if not exists idx_invoices_payment_id on public.invoices(payment_id);
create index if not exists idx_check_ins_event_id on public.check_ins(event_id);
create index if not exists idx_check_ins_guest_id on public.check_ins(guest_id);

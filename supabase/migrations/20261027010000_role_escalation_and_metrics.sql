-- ============================================================================
-- MIGRATION: Role escalation guards, paid_at protection, metrics & index cleanups
-- ============================================================================

-- 1. DROP POLICY events_insert_authenticated (Events created only via create_event RPC)
drop policy if exists "events_insert_authenticated" on public.events;

-- 2. ROLE ESCALATION & LAST OWNER ENFORCEMENT ON event_members
create or replace function public.handle_event_member_security()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_uid uuid;
  v_owner_count integer;
  v_caller_is_owner boolean;
  v_caller_is_planner boolean;
begin
  -- Bypass enforcement if called in a system/service context with no auth.uid()
  v_current_uid := auth.uid();
  if v_current_uid is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    -- When creating an event, the initial owner row is inserted by create_event.
    -- If no members exist yet for this event, allow inserting the initial owner.
    if not exists (select 1 from public.event_members where event_id = new.event_id) then
      if new.role = 'owner' then
        return new;
      end if;
    end if;

    v_caller_is_owner := public.has_event_role(new.event_id, array['owner']);
    v_caller_is_planner := public.has_event_role(new.event_id, array['planner']);

    -- Only an owner may insert an event_members row with role 'owner' or 'planner'
    if new.role in ('owner', 'planner') then
      if not v_caller_is_owner then
        raise exception 'Only an event owner can add owners or planners';
      end if;
    elsif new.role in ('couple', 'staff') then
      -- Planners and owners may manage couple and staff
      if not (v_caller_is_owner or v_caller_is_planner) then
        raise exception 'Insufficient privileges to add event member';
      end if;
    else
      raise exception 'Invalid member role: %', new.role;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- No one may change their own role
    if old.user_id = v_current_uid and new.role is distinct from old.role then
      raise exception 'Members cannot change their own role';
    end if;

    -- Event ID and User ID cannot be mutated
    if new.event_id is distinct from old.event_id or new.user_id is distinct from old.user_id then
      raise exception 'Cannot reassign membership identifiers';
    end if;

    -- Nobody may demote the last owner
    if old.role = 'owner' and new.role <> 'owner' then
      select count(*) into v_owner_count
      from public.event_members
      where event_id = old.event_id and role = 'owner';

      if v_owner_count <= 1 then
        raise exception 'Cannot demote the last owner of an event';
      end if;
    end if;

    v_caller_is_owner := public.has_event_role(old.event_id, array['owner']);
    v_caller_is_planner := public.has_event_role(old.event_id, array['planner']);

    -- Only an owner may change any member's role to/from 'owner' or 'planner'
    if (old.role in ('owner', 'planner') or new.role in ('owner', 'planner')) then
      if not v_caller_is_owner then
        raise exception 'Only an owner can modify owner or planner roles';
      end if;
    else
      -- Planners may manage only couple and staff
      if not (v_caller_is_owner or v_caller_is_planner) then
        raise exception 'Insufficient privileges to update event member';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    -- If the event itself was deleted (CASCADE delete), allow
    if not exists (select 1 from public.events where id = old.event_id) then
      return old;
    end if;

    -- Nobody may remove the last owner
    if old.role = 'owner' then
      select count(*) into v_owner_count
      from public.event_members
      where event_id = old.event_id and role = 'owner';

      if v_owner_count <= 1 then
        raise exception 'Cannot remove the last owner of an event';
      end if;
    end if;

    v_caller_is_owner := public.has_event_role(old.event_id, array['owner']);
    v_caller_is_planner := public.has_event_role(old.event_id, array['planner']);

    -- Only an owner may remove an owner or planner
    if old.role in ('owner', 'planner') then
      if not v_caller_is_owner then
        raise exception 'Only an owner can remove an owner or planner';
      end if;
    else
      -- Planners can remove couple and staff
      if not (v_caller_is_owner or v_caller_is_planner) then
        raise exception 'Insufficient privileges to remove event member';
      end if;
    end if;

    return old;
  end if;

  return null;
end;
$$;

revoke execute on function public.handle_event_member_security() from public, anon, authenticated;

drop trigger if exists tr_event_member_security on public.event_members;
create trigger tr_event_member_security
  before insert or update or delete on public.event_members
  for each row execute function public.handle_event_member_security();

-- 3. PROTECT paid_at AND status ON events
revoke update (paid_at) on public.events from authenticated, anon;

create or replace function public.handle_event_protection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Protect paid_at: only service_role (Paystack webhook) may change paid_at
  if new.paid_at is distinct from old.paid_at then
    if auth.role() is distinct from 'service_role' and auth.uid() is not null then
      raise exception 'Only service_role may modify paid_at';
    end if;
  end if;

  -- Protect status: changing status to 'archived' (or unarchiving) is allowed for owners only
  if (new.status = 'archived' or old.status = 'archived') and new.status is distinct from old.status then
    if auth.uid() is not null and not public.has_event_role(old.id, array['owner']) then
      raise exception 'Only an owner can archive or unarchive an event';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_event_protection() from public, anon, authenticated;

drop trigger if exists tr_event_protection on public.events;
create trigger tr_event_protection
  before update on public.events
  for each row execute function public.handle_event_protection();

-- 4. FIX get_user_events_with_metrics RPC
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
        'event', jsonb_build_object(
          'id', e.id,
          'title', e.title,
          'couple', e.couple,
          'date', e.date,
          'venue', e.venue,
          'area', e.area,
          'dress_code', e.dress_code,
          'slug', e.slug,
          'status', e.status,
          'registry_code', e.registry_code,
          'rsvp_by', e.rsvp_by,
          'paid_at', e.paid_at,
          'created_at', e.created_at
        ),
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
      coalesce(sum(case when r.status = 'accepted' then coalesce(r.attending_count, g.party_size) else 0 end), 0) as accepted_guests,
      count(case when r.status is null or r.status = 'pending' then 1 end) as awaiting_parties,
      coalesce(sum(case when r.status is null or r.status = 'pending' then g.party_size else 0 end), 0) as awaiting_guests,
      count(case when r.status = 'declined' then 1 end) as declined_parties,
      coalesce(sum(case when r.status = 'declined' then g.party_size else 0 end), 0) as declined_guests
    from public.guests g
    left join public.rsvps r on r.guest_id = g.id
    where g.event_id = e.id
  ) stats on true
  left join lateral (
    select coalesce(sum(
      case
        when r.status = 'accepted' then coalesce(r.attending_count, g.party_size)
        else g.party_size
      end
    ), 0) as seated_count
    from public.seat_assignments sa
    join public.guests g on g.id = sa.guest_id
    left join public.rsvps r on r.guest_id = g.id
    where g.event_id = e.id
      and (r.status is null or r.status <> 'declined')
  ) seats on true;
$$;

grant execute on function public.get_user_events_with_metrics to authenticated;
revoke execute on function public.get_user_events_with_metrics from anon;

-- 5. DROP REDUNDANT INDEXES (Unique constraints already index them)
drop index if exists public.idx_guests_rsvp_token;
drop index if exists public.idx_rsvps_guest_id;
drop index if exists public.idx_seat_assignments_guest_id;

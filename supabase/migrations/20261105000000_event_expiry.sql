-- An event ends with its day.
--
-- Once the (Lagos) calendar day of an event has passed it is frozen:
--   * its public page and invitation links stop opening and say the celebration has ended;
--   * its details, date, link and visibility can no longer be changed, so a finished celebration
--     cannot be reused for a different one;
--   * guests, vendors, tasks, tables, seats and replies for it can no longer be written.
-- Deleting the event stays possible. The rules live in the database so they hold for every client:
-- the app, the Data API and AI app tokens alike.

create or replace function public.event_is_expired(p_date timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_date is not null
    and (now() at time zone 'Africa/Lagos')::date > (p_date at time zone 'Africa/Lagos')::date;
$$;

-- Internal helper: the public RPCs and triggers call it as the function owner, so no client role needs it.
revoke all on function public.event_is_expired(timestamptz) from public, anon, authenticated;
grant execute on function public.event_is_expired(timestamptz) to service_role;

-- The event row: after the day nothing user-facing may change. Payment bookkeeping may.
create or replace function public.guard_expired_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.event_is_expired(old.date)
     and (to_jsonb(new) - 'updated_at' - 'paid_at' - 'registry_code')
         is distinct from
         (to_jsonb(old) - 'updated_at' - 'paid_at' - 'registry_code') then
    raise exception 'This celebration has ended and can no longer be changed'
      using errcode = 'P0001', hint = 'EVENT_EXPIRED';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_expired_event() from public, anon, authenticated;

drop trigger if exists tr_guard_expired_event on public.events;
create trigger tr_guard_expired_event
  before update on public.events
  for each row execute function public.guard_expired_event();

-- Rows that belong to an event, directly (event_id) or through their guest (guest_id).
create or replace function public.guard_expired_event_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_event uuid := nullif(v_row ->> 'event_id', '')::uuid;
  v_date timestamptz;
begin
  if v_event is null and nullif(v_row ->> 'guest_id', '') is not null then
    select g.event_id into v_event
    from public.guests g
    where g.id = (v_row ->> 'guest_id')::uuid;
  end if;

  -- No parent row means the event itself is being deleted (a cascade): let it through.
  if v_event is not null then
    select e.date into v_date from public.events e where e.id = v_event;
    if found and public.event_is_expired(v_date) then
      raise exception 'This celebration has ended and can no longer be changed'
        using errcode = 'P0001', hint = 'EVENT_EXPIRED';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.guard_expired_event_rows() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'guests', 'vendors', 'vendor_tasks', 'tables', 'seat_assignments', 'rsvps'
  ] loop
    execute format('drop trigger if exists tr_guard_expired_event_rows on public.%I', t);
    execute format(
      'create trigger tr_guard_expired_event_rows
         before insert or update or delete on public.%I
         for each row execute function public.guard_expired_event_rows()', t);
  end loop;
end $$;

-- The public page: once the day has passed it only says the celebration has ended.
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
    id, slug, title, couple, date, venue, area, dress_code, rsvp_by, status, is_public,
    description, cover_image_url, schedule,
    invitation_theme, invitation_headline, invitation_subheadline, invitation_message
  into v_event
  from public.events
  where slug = trim(p_slug)
    and status = 'active'
    and is_public = true;

  if not found then
    return null;
  end if;

  if public.event_is_expired(v_event.date) then
    return jsonb_build_object(
      'id', v_event.id,
      'slug', v_event.slug,
      'title', v_event.title,
      'couple', v_event.couple,
      'date', v_event.date,
      'status', v_event.status,
      'is_public', false,
      'expired', true
    );
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
    'is_public', v_event.is_public,
    'description', v_event.description,
    'cover_image_url', v_event.cover_image_url,
    'schedule', coalesce(v_event.schedule, '[]'::jsonb),
    'invitation_theme', v_event.invitation_theme,
    'invitation_headline', v_event.invitation_headline,
    'invitation_subheadline', v_event.invitation_subheadline,
    'invitation_message', v_event.invitation_message,
    'expired', false
  );
end;
$$;

grant execute on function public.get_public_event(text) to anon, authenticated;

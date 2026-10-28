-- Migration: Phase 7 Event Page Details & Content
-- Timestamp: 20261027170000

alter table public.events add column if not exists description text;
alter table public.events add column if not exists cover_image_url text;
alter table public.events add column if not exists schedule jsonb default '[]'::jsonb;

-- Recreate get_public_event to include description, cover_image_url, and schedule
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
    description, cover_image_url, schedule
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
    'is_public', v_event.is_public,
    'description', v_event.description,
    'cover_image_url', v_event.cover_image_url,
    'schedule', coalesce(v_event.schedule, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_public_event(text) to anon, authenticated;


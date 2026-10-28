-- Migration: Backfill missing profiles and harden create_event against missing caller profiles

-- 1. Backfill profiles for all auth.users rows that do not yet have a profile row
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  coalesce(u.raw_user_meta_data->>'avatar_url', '')
from auth.users u
on conflict (id) do nothing;

-- 2. Harden create_event RPC: ensure caller has a profile row before inserting into event_members
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
$$;

grant execute on function public.create_event(text, text, timestamptz, text, text, text, text, text, timestamptz) to authenticated;
revoke execute on function public.create_event(text, text, timestamptz, text, text, text, text, text, timestamptz) from anon;

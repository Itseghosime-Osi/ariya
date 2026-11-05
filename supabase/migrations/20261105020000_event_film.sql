-- The event film: a short auto-playing 3D introduction a host designs in the page editor, which every
-- guest watches (with their own name on a personal link) before the invitation card.
--
--   * events.film_design   the host's scenes, song, colours and photos (validated in the app; shape and
--                          size are bounded here)
--   * events.invitation_live  false is test mode: only the celebration's own members can open the
--                          public page and personal links. Existing events stay live.
--   * event-film bucket    the song (MP3, up to 10 MB) and the celebrants' photos, written by managers
--   * get_public_event / get_invitation now hand the page the film and the live flag

alter table public.events
  add column if not exists film_design jsonb,
  add column if not exists invitation_live boolean not null default true;

alter table public.events drop constraint if exists events_film_design_shape;
alter table public.events
  add constraint events_film_design_shape check (
    film_design is null
    or (jsonb_typeof(film_design) = 'object' and pg_column_size(film_design) < 20000)
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-film',
  'event-film',
  true,
  10485760,
  array['audio/mpeg', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['audio/mpeg', 'image/jpeg', 'image/png', 'image/webp'];

-- Managers (owner, planner, couple) write to <event_id>/...; guests read by public URL, and the bucket
-- cannot be listed anonymously.
drop policy if exists "Event managers can select event-film" on storage.objects;
drop policy if exists "Event managers can upload event-film" on storage.objects;
drop policy if exists "Event managers can update event-film" on storage.objects;
drop policy if exists "Event managers can delete event-film" on storage.objects;

create policy "Event managers can select event-film"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'event-film'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
      else false
    end
  );

create policy "Event managers can upload event-film"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-film'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
      else false
    end
  );

create policy "Event managers can update event-film"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-film'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
      else false
    end
  )
  with check (
    bucket_id = 'event-film'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
      else false
    end
  );

create policy "Event managers can delete event-film"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-film'
    and case
      when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.has_event_role(((storage.foldername(name))[1])::uuid, array['owner', 'planner', 'couple'])
      else false
    end
  );

-- A guest's own page: the same invitation as before, plus the film and whether the invitation is live.
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
      'invitation_message', v_event.invitation_message,
      'invitation_live', v_event.invitation_live,
      'film_design', v_event.film_design
    ),
    'table_name', v_table_name
  );
end;
$$;

grant execute on function public.get_invitation(text) to anon, authenticated;

-- The public page, likewise.
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
    invitation_theme, invitation_headline, invitation_subheadline, invitation_message,
    invitation_live, film_design
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
    'invitation_live', v_event.invitation_live,
    'film_design', v_event.film_design,
    'expired', false
  );
end;
$$;

grant execute on function public.get_public_event(text) to anon, authenticated;

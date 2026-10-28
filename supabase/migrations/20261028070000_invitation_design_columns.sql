-- Add invitation design columns to events table and expose them via get_invitation and get_public_event RPCs
-- Columns inherit table privileges granted in 20261027210000_explicit_table_grants.sql

alter table public.events
  add column if not exists invitation_theme text default 'royal_gold'
    check (invitation_theme in (
      'royal_gold', 'emerald_regal', 'sunset_asoebi', 'monochrome_velvet',
      'royal-gold', 'emerald-regal', 'sunset-asoebi', 'monochrome-velvet'
    )),
  add column if not exists invitation_headline text
    check (char_length(invitation_headline) <= 120),
  add column if not exists invitation_subheadline text
    check (char_length(invitation_subheadline) <= 240),
  add column if not exists invitation_message text
    check (char_length(invitation_message) <= 1000);

-- Update get_invitation RPC to return invitation design properties
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

grant execute on function public.get_invitation(text) to anon, authenticated;

-- Update get_public_event RPC to include invitation design properties
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
    'invitation_message', v_event.invitation_message
  );
end;
$$;

grant execute on function public.get_public_event(text) to anon, authenticated;

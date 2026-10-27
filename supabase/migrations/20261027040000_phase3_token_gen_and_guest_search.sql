-- Migration: Phase 3 Token Generation, Search Guests RPC, and Self-Defending Import
-- Timestamp: 20261027040000

-- 1. Internal token generator using extensions.gen_random_bytes
create or replace function public.generate_invitation_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw bytea;
  v_token text;
begin
  -- 18 random bytes Base64URL-encoded gives exactly 24 characters without padding
  v_raw := extensions.gen_random_bytes(18);
  v_token := rtrim(translate(encode(v_raw, 'base64'), '+/', '-_'), '=');
  return v_token;
end;
$$;

revoke execute on function public.generate_invitation_token() from public, anon, authenticated;

-- Set default on guests.rsvp_token
alter table public.guests alter column rsvp_token set default public.generate_invitation_token();

-- 2. Drop old regenerate_guest_token signatures and create single-parameter version
drop function if exists public.regenerate_guest_token(uuid, text);
drop function if exists public.regenerate_guest_token(uuid);

create or replace function public.regenerate_guest_token(
  p_guest_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.regenerate_guest_token(uuid) from public, anon;
grant execute on function public.regenerate_guest_token(uuid) to authenticated;

-- 3. Self-defending import_guests RPC
drop function if exists public.import_guests(uuid, jsonb);

create or replace function public.import_guests(
  p_event_id uuid,
  p_guests jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke execute on function public.import_guests(uuid, jsonb) from public, anon;
grant execute on function public.import_guests(uuid, jsonb) to authenticated;

-- 4. Normalize side to lowercase and restore strict lowercase CHECK constraint
update public.guests set side = lower(trim(side));
alter table public.guests drop constraint if exists guests_side_check;
alter table public.guests add constraint guests_side_check check (side in ('bride', 'groom', 'family', 'vip', 'planner', 'imported', 'mutual'));

-- 5. Search Guests RPC with parameterized escaped search and exact filters
drop function if exists public.search_guests(uuid, text, text, text, text, text, boolean, int, int);

create or replace function public.search_guests(
  p_event_id uuid,
  p_search text default null,
  p_side text default null,
  p_group text default null,
  p_rsvp_status text default null,
  p_seated_status text default null,
  p_is_vip boolean default null,
  p_limit int default 25,
  p_offset int default 0
)
returns table (
  id uuid,
  event_id uuid,
  name text,
  phone text,
  email text,
  side text,
  group_name text,
  party_size int,
  plus_ones_allowed boolean,
  is_vip boolean,
  rsvp_token text,
  notes text,
  invited_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  rsvp_id uuid,
  rsvp_status text,
  rsvp_attending_count int,
  rsvp_plus_one_name text,
  rsvp_dietary text,
  rsvp_note text,
  rsvp_responded_at timestamptz,
  seat_table_id uuid,
  seat_table_name text,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_escaped_search text;
  v_search_pattern text;
begin
  if not public.is_event_member(p_event_id) then
    raise exception 'You do not have permission to access guests for this event' using errcode = '42501';
  end if;

  if p_search is not null and trim(p_search) <> '' then
    -- Escape %, _ and \ for parameterized safe ILIKE
    v_escaped_search := regexp_replace(trim(p_search), '([%_\\])', '\\\1', 'g');
    v_search_pattern := '%' || v_escaped_search || '%';
  end if;

  return query
  with filtered as (
    select
      g.id,
      g.event_id,
      g.name,
      g.phone,
      g.email,
      g.side,
      g.group_name,
      g.party_size,
      g.plus_ones_allowed,
      g.is_vip,
      g.rsvp_token,
      g.notes,
      g.invited_at,
      g.created_at,
      g.updated_at,
      r.id as rsvp_id,
      coalesce(r.status, 'pending') as rsvp_status,
      coalesce(r.attending_count, g.party_size) as rsvp_attending_count,
      r.plus_one_name as rsvp_plus_one_name,
      r.dietary as rsvp_dietary,
      r.note as rsvp_note,
      r.responded_at as rsvp_responded_at,
      sa.table_id as seat_table_id,
      t.name as seat_table_name
    from public.guests g
    left join public.rsvps r on r.guest_id = g.id
    left join public.seat_assignments sa on sa.guest_id = g.id
    left join public.tables t on t.id = sa.table_id
    where g.event_id = p_event_id
      and (
        v_search_pattern is null or
        g.name ilike v_search_pattern escape '\' or
        coalesce(g.phone, '') ilike v_search_pattern escape '\' or
        coalesce(g.email, '') ilike v_search_pattern escape '\'
      )
      and (p_side is null or p_side = 'all' or g.side = lower(p_side))
      and (p_group is null or p_group = 'all' or g.group_name = p_group)
      and (p_is_vip is null or g.is_vip = p_is_vip)
      and (
        p_rsvp_status is null or p_rsvp_status = 'all' or
        coalesce(r.status, 'pending') = p_rsvp_status
      )
      and (
        p_seated_status is null or p_seated_status = 'all' or
        (p_seated_status = 'seated' and sa.table_id is not null) or
        (p_seated_status = 'unseated' and sa.table_id is null)
      )
  ),
  total as (
    select count(*) as cnt from filtered
  )
  select
    f.id,
    f.event_id,
    f.name,
    f.phone,
    f.email,
    f.side,
    f.group_name,
    f.party_size,
    f.plus_ones_allowed,
    f.is_vip,
    f.rsvp_token,
    f.notes,
    f.invited_at,
    f.created_at,
    f.updated_at,
    f.rsvp_id,
    f.rsvp_status,
    f.rsvp_attending_count,
    f.rsvp_plus_one_name,
    f.rsvp_dietary,
    f.rsvp_note,
    f.rsvp_responded_at,
    f.seat_table_id,
    f.seat_table_name,
    tot.cnt as total_count
  from filtered f
  cross join total tot
  order by f.created_at desc
  limit greatest(1, least(100, coalesce(p_limit, 25)))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

revoke execute on function public.search_guests(uuid, text, text, text, text, text, boolean, int, int) from public, anon;
grant execute on function public.search_guests(uuid, text, text, text, text, text, boolean, int, int) to authenticated;

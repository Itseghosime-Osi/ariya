-- Migration: Phase 4 Token Lockdown and Scale Duplicate Check
-- Timestamp: 20261027050000

-- 1. Always set rsvp_token on INSERT via trigger, ignoring any caller-supplied value
create or replace function public.tr_guests_generate_token()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Always generate a fresh token, unconditionally ignoring any caller-supplied value
  new.rsvp_token := public.generate_invitation_token();
  return new;
end;
$$;

alter table public.guests alter column rsvp_token set default public.generate_invitation_token();

-- 2. Revoke direct UPDATE of rsvp_token from authenticated and anon
-- (Only regenerate_guest_token security definer function or service role can change it)
revoke update on public.guests from authenticated, anon;
grant update (
  event_id,
  name,
  phone,
  email,
  side,
  group_name,
  is_vip,
  party_size,
  plus_ones_allowed,
  notes,
  invited_at,
  created_at,
  updated_at
) on public.guests to authenticated;

-- 3. Duplicate check at scale RPC: find_import_duplicates
create or replace function public.find_import_duplicates(
  p_event_id uuid,
  p_rows jsonb
)
returns table (
  row_index int,
  match_type text,
  duplicate_with text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_idx int := 0;
  v_phone text;
  v_email text;
  v_name text;
  v_matched_name text;
  v_matched_type text;
begin
  if not public.has_event_role(p_event_id, array['owner', 'planner']) then
    raise exception 'You must be an owner or planner to check duplicates' using errcode = '42501';
  end if;

  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Rows must be a JSON array' using errcode = '22000';
  end if;

  for v_item in select * from jsonb_array_elements(p_rows)
  loop
    v_idx := v_idx + 1;
    v_matched_name := null;
    v_matched_type := null;

    v_phone := nullif(trim(v_item->>'phone'), '');
    v_email := nullif(trim(v_item->>'email'), '');
    v_name := nullif(trim(v_item->>'name'), '');

    -- Priority 1: Match by phone (digits or last 10 digits for local/intl format)
    if v_phone is not null and length(regexp_replace(v_phone, '\D', '', 'g')) >= 7 then
      select g.name, 'phone'
      into v_matched_name, v_matched_type
      from public.guests g
      where g.event_id = p_event_id
        and g.phone is not null
        and (
          regexp_replace(g.phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
          or (
            length(regexp_replace(g.phone, '\D', '', 'g')) >= 10
            and length(regexp_replace(v_phone, '\D', '', 'g')) >= 10
            and right(regexp_replace(g.phone, '\D', '', 'g'), 10) = right(regexp_replace(v_phone, '\D', '', 'g'), 10)
          )
        )
      limit 1;
    end if;

    -- Priority 2: Match by email (case-insensitive)
    if v_matched_name is null and v_email is not null then
      select g.name, 'email'
      into v_matched_name, v_matched_type
      from public.guests g
      where g.event_id = p_event_id
        and g.email is not null
        and lower(trim(g.email)) = lower(trim(v_email))
      limit 1;
    end if;

    -- Priority 3: Match by name (case-insensitive within event)
    if v_matched_name is null and v_name is not null then
      select g.name, 'name'
      into v_matched_name, v_matched_type
      from public.guests g
      where g.event_id = p_event_id
        and lower(trim(g.name)) = lower(trim(v_name))
      limit 1;
    end if;

    if v_matched_name is not null then
      row_index := v_idx;
      match_type := v_matched_type;
      duplicate_with := v_matched_name;
      return next;
    end if;
  end loop;
end;
$$;

revoke execute on function public.find_import_duplicates(uuid, jsonb) from public, anon;
grant execute on function public.find_import_duplicates(uuid, jsonb) to authenticated;

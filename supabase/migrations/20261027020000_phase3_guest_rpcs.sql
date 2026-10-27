-- ============================================================================
-- MIGRATION: Phase 3 Guest RPCs (Token regeneration & Batch Ingestion)
-- ============================================================================

-- 1. FLEXIBLE CASE-INSENSITIVE CHECK CONSTRAINT ON guests.side
alter table public.guests drop constraint if exists guests_side_check;
alter table public.guests add constraint guests_side_check
  check (lower(side) in ('bride', 'groom', 'family', 'vip', 'planner', 'imported', 'mutual'));

-- 2. REGENERATE GUEST INVITATION TOKEN RPC
create or replace function public.regenerate_guest_token(
  p_guest_id uuid,
  p_new_token text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_trimmed_token text;
begin
  v_trimmed_token := trim(coalesce(p_new_token, ''));
  if length(v_trimmed_token) < 22 then
    raise exception 'Invalid invitation token: minimum length 22 required';
  end if;

  select event_id into v_event_id
  from public.guests
  where id = p_guest_id;

  if not found then
    raise exception 'Guest record not found';
  end if;

  if not public.has_event_role(v_event_id, array['owner', 'planner']) then
    raise exception 'Only owners and planners can regenerate invitation links';
  end if;

  update public.guests
  set
    rsvp_token = v_trimmed_token,
    updated_at = now()
  where id = p_guest_id;

  return v_trimmed_token;
end;
$$;

revoke execute on function public.regenerate_guest_token(uuid, text) from public, anon;
grant execute on function public.regenerate_guest_token(uuid, text) to authenticated;

-- 3. BATCH GUEST IMPORT RPC (Atomic transaction)
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
  v_count integer;
begin
  if not public.has_event_role(p_event_id, array['owner', 'planner']) then
    raise exception 'Only owners and planners can import guests';
  end if;

  if jsonb_typeof(p_guests) <> 'array' or jsonb_array_length(p_guests) = 0 then
    raise exception 'Guest payload must be a non-empty array';
  end if;

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
    rsvp_token,
    notes
  )
  select
    p_event_id,
    trim(elem->>'name'),
    nullif(trim(elem->>'phone'), ''),
    nullif(trim(elem->>'email'), ''),
    coalesce(nullif(trim(elem->>'side'), ''), 'mutual'),
    nullif(trim(elem->>'group_name'), ''),
    coalesce((elem->>'party_size')::int, 1),
    coalesce((elem->>'plus_ones_allowed')::boolean, false),
    coalesce((elem->>'is_vip')::boolean, false),
    trim(elem->>'rsvp_token'),
    nullif(trim(elem->>'notes'), '')
  from jsonb_array_elements(p_guests) elem;

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'imported_count', v_count
  );
end;
$$;

revoke execute on function public.import_guests(uuid, jsonb) from public, anon;
grant execute on function public.import_guests(uuid, jsonb) to authenticated;

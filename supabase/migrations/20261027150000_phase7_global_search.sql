-- Migration: Global Search RPC (V2 24)
create or replace function public.global_search(
  p_query text,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_clean_query text;
  v_escaped text;
  v_pattern text;
  v_events jsonb;
  v_guests jsonb;
  v_vendors jsonb;
  v_effective_limit integer;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Not authenticated'
      using errcode = 'P0001', hint = 'NOT_PERMITTED';
  end if;

  v_clean_query := trim(coalesce(p_query, ''));
  if v_clean_query = '' then
    return jsonb_build_object(
      'events', '[]'::jsonb,
      'guests', '[]'::jsonb,
      'vendors', '[]'::jsonb
    );
  end if;

  v_effective_limit := least(greatest(coalesce(p_limit, 20), 1), 50);

  -- Escape %, _ and \ for parameterized safe ILIKE
  v_escaped := regexp_replace(v_clean_query, '([%_\\])', '\\\1', 'g');
  v_pattern := '%' || v_escaped || '%';

  -- 1. Search accessible events
  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_events
  from (
    select
      e.id,
      e.title,
      e.couple,
      e.date,
      e.venue,
      e.slug,
      em.role as user_role
    from public.events e
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      e.title ilike v_pattern escape '\'
      or e.couple ilike v_pattern escape '\'
      or e.venue ilike v_pattern escape '\'
      or e.slug ilike v_pattern escape '\'
    )
    order by e.date desc
    limit v_effective_limit
  ) sub;

  -- 2. Search accessible guests
  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_guests
  from (
    select
      g.id,
      g.event_id,
      g.name,
      g.email,
      g.phone,
      g.side,
      g.group_name,
      e.title as event_title
    from public.guests g
    join public.events e on e.id = g.event_id
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      g.name ilike v_pattern escape '\'
      or coalesce(g.email, '') ilike v_pattern escape '\'
      or coalesce(g.phone, '') ilike v_pattern escape '\'
      or coalesce(g.group_name, '') ilike v_pattern escape '\'
    )
    order by g.name asc
    limit v_effective_limit
  ) sub;

  -- 3. Search accessible vendors
  select coalesce(jsonb_agg(sub), '[]'::jsonb) into v_vendors
  from (
    select
      v.id,
      v.event_id,
      v.name,
      v.category,
      v.contact_name,
      v.contact_phone,
      v.contact_email,
      v.status,
      e.title as event_title
    from public.vendors v
    join public.events e on e.id = v.event_id
    join public.event_members em on em.event_id = e.id and em.user_id = v_caller_id
    where (
      v.name ilike v_pattern escape '\'
      or v.category ilike v_pattern escape '\'
      or coalesce(v.contact_name, '') ilike v_pattern escape '\'
      or coalesce(v.contact_email, '') ilike v_pattern escape '\'
      or coalesce(v.contact_phone, '') ilike v_pattern escape '\'
    )
    order by v.name asc
    limit v_effective_limit
  ) sub;

  return jsonb_build_object(
    'events', v_events,
    'guests', v_guests,
    'vendors', v_vendors
  );
end;
$$;

revoke all on function public.global_search(text, integer) from public, anon;
grant execute on function public.global_search(text, integer) to authenticated;

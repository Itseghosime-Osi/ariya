-- Migration: find a guest by name at the check-in desk (20261107010000)
--
-- A guest whose card carries only the entry seal has no typed code to read out, and a seal that will
-- not scan (a cracked screen, glare, a tiny screenshot) must not leave them stuck at the door. The
-- desk can now look a guest up by name. Only guests who have accepted are offered, because nobody else
-- can be admitted, and the answer carries the code so the rest of the desk (verify, then Admit)
-- works exactly as it does after a scan.
--
-- Same roles as verify_check_in and check_in: owner, planner and staff.

create or replace function public.search_check_in_guests(p_event_id uuid, p_query text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_query text := trim(coalesce(p_query, ''));
  v_pattern text;
begin
  if not public.has_event_role(p_event_id, array['owner', 'planner', 'staff']) then
    raise exception 'Insufficient permissions to perform guest check-in';
  end if;

  -- One letter would match half the guest list. Ask for two.
  if char_length(v_query) < 2 then
    return '[]'::jsonb;
  end if;

  -- Match the text literally: a typed % or _ is a character, not a wildcard.
  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return coalesce((
    select jsonb_agg(item order by item ->> 'guest_name')
    from (
      select jsonb_build_object(
        'guest_id', g.id,
        'guest_name', g.name,
        'attending_count', r.attending_count,
        'checked_in_count', coalesce((
          select sum(ci.checked_in_count)::integer
          from public.check_ins ci
          where ci.guest_id = g.id and ci.event_id = p_event_id
        ), 0),
        'table_name', (
          select t.name
          from public.seat_assignments sa
          join public.tables t on t.id = sa.table_id
          where sa.guest_id = g.id
          limit 1
        ),
        'code', g.check_in_code
      ) as item
      from public.guests g
      join public.rsvps r on r.guest_id = g.id and r.status = 'accepted'
      where g.event_id = p_event_id
        and g.check_in_code is not null
        and g.name ilike v_pattern escape '\'
      order by g.name
      limit 8
    ) matches
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.search_check_in_guests(uuid, text) from public, anon;
grant execute on function public.search_check_in_guests(uuid, text) to authenticated;

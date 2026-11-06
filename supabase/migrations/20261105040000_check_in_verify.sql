-- Scan, then verify, then admit.
--
-- verify_check_in looks a pass up WITHOUT admitting anyone, so the check-in desk can show "Verified
-- invite" with the guest's name, party size, table and (for a pass already used) the time they arrived.
-- The person at the door then taps Admit, which calls check_in as before. Same roles as check_in.

create or replace function public.verify_check_in(p_event_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_code text;
  v_guest record;
  v_rsvp record;
  v_table_name text;
  v_checked_in integer := 0;
  v_first_at timestamptz;
  v_last_at timestamptz;
begin
  if not public.has_event_role(p_event_id, array['owner', 'planner', 'staff']) then
    raise exception 'Insufficient permissions to perform guest check-in';
  end if;

  v_clean_code := upper(trim(coalesce(p_code, '')));
  if v_clean_code = '' then
    return jsonb_build_object('status', 'unknown_code', 'message', 'Please enter a valid check-in code');
  end if;

  select * into v_guest
  from public.guests
  where upper(check_in_code) = v_clean_code;

  if not found then
    return jsonb_build_object('status', 'unknown_code', 'message', 'Check-in code not recognized');
  end if;

  if v_guest.event_id <> p_event_id then
    return jsonb_build_object(
      'status', 'wrong_event',
      'message', 'This check-in pass belongs to a different celebration'
    );
  end if;

  select * into v_rsvp from public.rsvps where guest_id = v_guest.id;

  if not found or v_rsvp.status <> 'accepted' then
    return jsonb_build_object(
      'status', 'not_attending',
      'message', 'Guest RSVP is not confirmed as accepted',
      'guest_name', v_guest.name,
      'rsvp_status', coalesce(v_rsvp.status, 'pending')
    );
  end if;

  select coalesce(sum(checked_in_count), 0), min(checked_in_at), max(checked_in_at)
  into v_checked_in, v_first_at, v_last_at
  from public.check_ins
  where guest_id = v_guest.id and event_id = p_event_id;

  select t.name into v_table_name
  from public.seat_assignments sa
  join public.tables t on t.id = sa.table_id
  where sa.guest_id = v_guest.id;

  return jsonb_build_object(
    'status', case when v_checked_in >= v_rsvp.attending_count then 'already_checked_in' else 'verified' end,
    'message', case
      when v_checked_in >= v_rsvp.attending_count then 'Guest party has already fully checked in'
      else 'Verified invitation'
    end,
    'guest_name', v_guest.name,
    'guest_id', v_guest.id,
    'attending_count', v_rsvp.attending_count,
    'checked_in_count', v_checked_in,
    'remaining', greatest(v_rsvp.attending_count - v_checked_in, 0),
    'table_name', v_table_name,
    'first_checked_in_at', v_first_at,
    'last_checked_in_at', v_last_at
  );
end;
$$;

revoke all on function public.verify_check_in(uuid, text) from public, anon;
grant execute on function public.verify_check_in(uuid, text) to authenticated;

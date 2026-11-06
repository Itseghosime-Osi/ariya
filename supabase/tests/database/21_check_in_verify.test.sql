begin;
create extension if not exists pgtap;

select plan(8);

create temp table v (staff_id uuid, couple_id uuid, event_id uuid, guest_id uuid, code text);
grant select on v to authenticated, anon;

do $$
declare
  v_staff uuid := gen_random_uuid();
  v_couple uuid := gen_random_uuid();
  v_event uuid := gen_random_uuid();
  v_guest uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values
    (v_staff, 'verify-staff@owambe.test'), (v_couple, 'verify-couple@owambe.test');
  insert into public.events (id, slug, title, couple, date, venue, status, is_public)
  values (v_event, 'verify-gala', 'Verify Gala', 'A & B', now() + interval '30 days', 'Hall', 'active', true);
  insert into public.event_members (event_id, user_id, role) values
    (v_event, v_staff, 'staff'), (v_event, v_couple, 'couple');
  insert into public.guests (id, event_id, name, party_size, plus_ones_allowed, check_in_code)
  values (v_guest, v_event, 'Chief Verify', 2, false, 'VER12');
  insert into public.rsvps (guest_id, status, attending_count, responded_at)
  values (v_guest, 'accepted', 2, now());
  insert into v select v_staff, v_couple, v_event, v_guest, 'VER12';
end $$;

set local role anon;
select throws_ok(
  $$ select public.verify_check_in((select event_id from v), 'VER12') $$,
  '42501', null, 'anon cannot verify a pass'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select couple_id from v), 'role', 'authenticated')::text, true);
select throws_ok(
  $$ select public.verify_check_in((select event_id from v), 'VER12') $$,
  null, null, 'the couple (not door staff) cannot verify'
);

select set_config('request.jwt.claims', json_build_object('sub', (select staff_id from v), 'role', 'authenticated')::text, true);
select is(
  public.verify_check_in((select event_id from v), ' ver12 ') ->> 'status',
  'verified', 'staff verify a valid pass (case and spaces ignored)'
);
select is(
  public.verify_check_in((select event_id from v), 'VER12') ->> 'guest_name',
  'Chief Verify', 'the verified pass carries the guest name'
);
select is(
  (select count(*)::int from public.check_ins where guest_id = (select guest_id from v)),
  0, 'verifying admits nobody'
);
select is(
  public.verify_check_in((select event_id from v), 'NOPE99') ->> 'status',
  'unknown_code', 'an unknown code is reported'
);

select public.check_in((select event_id from v), 'VER12', 2);
select is(
  public.verify_check_in((select event_id from v), 'VER12') ->> 'status',
  'already_checked_in', 'a fully admitted pass cannot be used again'
);
select ok(
  (public.verify_check_in((select event_id from v), 'VER12') ->> 'first_checked_in_at') is not null,
  'the arrival time is returned for a used pass'
);

select * from finish();
rollback;

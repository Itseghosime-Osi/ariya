begin;
select plan(16);

-- 1. Test hit_rate_limit execution is revoked from anon
set local role anon;
select throws_ok(
  $$ select public.hit_rate_limit('test:anon:key', 5, interval '1 minute') $$,
  '42501',
  null,
  'anon role cannot call hit_rate_limit (permission denied)'
);
reset role;

-- 2. Setup test data for seating and check-in
create temp table _test_data as
select
  gen_random_uuid() as owner_id,
  gen_random_uuid() as planner_id,
  gen_random_uuid() as staff_id,
  gen_random_uuid() as couple_id,
  gen_random_uuid() as event_id,
  gen_random_uuid() as guest_1_id,
  gen_random_uuid() as guest_2_id,
  gen_random_uuid() as guest_3_id,
  gen_random_uuid() as table_id;

grant select on _test_data to authenticated, anon;

insert into auth.users (id, email)
select owner_id, 'owner@owambe.test' from _test_data
union all
select planner_id, 'planner@owambe.test' from _test_data
union all
select staff_id, 'staff@owambe.test' from _test_data
union all
select couple_id, 'couple@owambe.test' from _test_data;

insert into public.events (id, slug, title, couple, date, venue, status, is_public)
select event_id, 'phase-5-gala', 'Phase 5 Gala', 'Ada & Femi', now() + interval '30 days', 'Lagos Hall', 'active', true
from _test_data;

insert into public.event_members (event_id, user_id, role)
select event_id, owner_id, 'owner' from _test_data
union all
select event_id, planner_id, 'planner' from _test_data
union all
select event_id, staff_id, 'staff' from _test_data
union all
select event_id, couple_id, 'couple' from _test_data;

-- Table with capacity = 4
insert into public.tables (id, event_id, name, capacity, shape)
select table_id, event_id, 'High Table VIP', 4, 'round'
from _test_data;

-- Guest 1 (party_size = 2, accepted 2)
insert into public.guests (id, event_id, name, party_size, plus_ones_allowed)
select guest_1_id, event_id, 'Chief Adeleke', 2, false
from _test_data;

insert into public.rsvps (guest_id, status, attending_count)
select guest_1_id, 'accepted', 2
from _test_data;

-- Guest 2 (party_size = 2, accepted 2)
insert into public.guests (id, event_id, name, party_size, plus_ones_allowed)
select guest_2_id, event_id, 'Otunba Davies', 2, false
from _test_data;

insert into public.rsvps (guest_id, status, attending_count)
select guest_2_id, 'accepted', 2
from _test_data;

-- Guest 3 (party_size = 2, accepted 2)
insert into public.guests (id, event_id, name, party_size, plus_ones_allowed)
select guest_3_id, event_id, 'Alhaji Dangote', 2, false
from _test_data;

insert into public.rsvps (guest_id, status, attending_count)
select guest_3_id, 'accepted', 2
from _test_data;

-- 3. Test check_in_code was generated automatically on guest insert
select matches(
  (select check_in_code from public.guests where id = (select guest_1_id from _test_data)),
  '^ARY-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$',
  'Guest check_in_code matches Crockford Base32 pattern ARY-XXXX-XXXX'
);

-- 4. Test staff CANNOT assign seats
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', staff_id::text, 'role', 'authenticated')::text, true) from _test_data;
select throws_ok(
  format('select public.assign_seat(%L, %L)', (select guest_1_id from _test_data), (select table_id from _test_data)),
  'Insufficient permissions to manage seating assignments',
  'staff role cannot assign seats'
);
reset role;

-- 5. Test couple CANNOT assign seats (read-only)
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', couple_id::text, 'role', 'authenticated')::text, true) from _test_data;
select throws_ok(
  format('select public.assign_seat(%L, %L)', (select guest_1_id from _test_data), (select table_id from _test_data)),
  'Insufficient permissions to manage seating assignments',
  'couple role cannot assign seats'
);
reset role;

-- 6. Test owner CAN assign seat
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', owner_id::text, 'role', 'authenticated')::text, true) from _test_data;
select is(
  (select (public.assign_seat((select guest_1_id from _test_data), (select table_id from _test_data))->>'seated')::boolean),
  true,
  'owner can assign guest 1 (party 2) to table (capacity 4)'
);

-- 7. Test planner CAN assign second guest (party 2, filling capacity 4)
select set_config('request.jwt.claims', json_build_object('sub', planner_id::text, 'role', 'authenticated')::text, true) from _test_data;
select is(
  (select (public.assign_seat((select guest_2_id from _test_data), (select table_id from _test_data))->>'seated')::boolean),
  true,
  'planner can assign guest 2 (party 2) to table, reaching capacity 4'
);

-- 8. Test over-capacity seating attempt fails
select throws_ok(
  format('select public.assign_seat(%L, %L)', (select guest_3_id from _test_data), (select table_id from _test_data)),
  'Table capacity exceeded. Available: 0, required: 2',
  'assigning guest 3 beyond table capacity throws friendly error'
);

-- 9. Test unseating guest
select is(
  (select (public.assign_seat((select guest_1_id from _test_data), null)->>'seated')::boolean),
  false,
  'passing null to assign_seat unseats guest 1'
);

-- 10. Re-check capacity on submit_rsvp (Rule 5):
-- Guest 2 is seated at table.
-- Guest 2 attempts to revise RSVP to 5 attendees (exceeding table capacity).
-- The RSVP is accepted, guest is unseated, and seating_conflict_at is flagged.
reset role;
update public.guests
set plus_ones_allowed = true, party_size = 5
where id = (select guest_2_id from _test_data);

select lives_ok(
  format('select public.submit_rsvp(%L, %L, %s)', (select rsvp_token from public.guests where id = (select guest_2_id from _test_data)), 'accepted', 5),
  'submit_rsvp accepts RSVP revision when updated party size exceeds table capacity'
);

select is(
  (select count(*) from public.seat_assignments where guest_id = (select guest_2_id from _test_data))::int,
  0,
  'Guest 2 is unseated due to capacity conflict'
);

select is(
  (select count(*) from public.guests where id = (select guest_2_id from _test_data) and seating_conflict_at is not null)::int,
  1,
  'seating_conflict_at is recorded on guest 2'
);

-- 11. Test check_in RPC: staff CAN check in confirmed guest
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', staff_id::text, 'role', 'authenticated')::text, true) from _test_data;
select is(
  (select (public.check_in(
    (select event_id from _test_data),
    (select check_in_code from public.guests where id = (select guest_2_id from _test_data)),
    1
  )->>'status')),
  'checked_in',
  'staff can check in 1 attendee for guest 2'
);

-- 12. Test check_in RPC partial check-in and full check-in (remaining 4 attendees)
select is(
  (select (public.check_in(
    (select event_id from _test_data),
    (select check_in_code from public.guests where id = (select guest_2_id from _test_data)),
    4
  )->>'status')),
  'checked_in',
  'staff can check in remaining attendees for guest 2'
);

-- 13. Test check_in RPC already_checked_in state
select is(
  (select (public.check_in(
    (select event_id from _test_data),
    (select check_in_code from public.guests where id = (select guest_2_id from _test_data)),
    1
  )->>'status')),
  'already_checked_in',
  'further check_in returns already_checked_in'
);

-- 14. Test check_in RPC unknown_code state
select is(
  (select (public.check_in(
    (select event_id from _test_data),
    'ARY-FAKE-CODE',
    1
  )->>'status')),
  'unknown_code',
  'invalid check-in code returns unknown_code'
);

-- 15. Test get_check_in_code RPC returns check_in_code for accepted guest, null for non-accepted
select is(
  public.get_check_in_code((select rsvp_token from public.guests where id = (select guest_2_id from _test_data))),
  (select check_in_code from public.guests where id = (select guest_2_id from _test_data)),
  'get_check_in_code returns check_in_code for confirmed guest pass'
);

select * from finish();
rollback;

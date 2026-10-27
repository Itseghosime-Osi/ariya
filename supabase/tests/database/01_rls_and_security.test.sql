begin;
select plan(12);

-- 1. Create two test users in auth.users
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'user2@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'staff@example.com')
on conflict (id) do nothing;

-- 2. Create Event 1 owned by user 1
insert into public.events (id, title, couple, date, venue, slug, status, rsvp_by)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Royal Wedding 1',
  'Bride & Groom',
  now() + interval '30 days',
  'Eko Hotel',
  'royal-wedding-1',
  'active',
  now() + interval '14 days'
) on conflict (id) do nothing;

insert into public.event_members (event_id, user_id, role)
values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('a0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'staff')
on conflict (event_id, user_id) do nothing;

-- 3. Create a table with capacity 2 and a guest with party_size 2
insert into public.tables (id, event_id, name, capacity, shape)
values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Table A', 2, 'round')
on conflict (id) do nothing;

insert into public.guests (id, event_id, name, party_size, plus_ones_allowed, rsvp_token)
values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Guest 1', 2, false, 'token_valid_guest_1'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Guest 2', 2, false, 'token_valid_guest_2')
on conflict (id) do nothing;

-- TEST 1: User 1 (owner) CAN see their event
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';
select results_eq(
  'select count(*)::int from public.events where id = ''a0000000-0000-0000-0000-000000000001''',
  ARRAY[1],
  'Owner can see their own event'
);

-- TEST 2: User 2 (non-member) CANNOT see Event 1
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222"}';
select results_eq(
  'select count(*)::int from public.events where id = ''a0000000-0000-0000-0000-000000000001''',
  ARRAY[0],
  'Non-member cannot see an event they do not belong to'
);

-- TEST 3: User 2 CANNOT update Event 1
update public.events set title = 'Hacked' where id = 'a0000000-0000-0000-0000-000000000001';
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';
select results_eq(
  'select title from public.events where id = ''a0000000-0000-0000-0000-000000000001''',
  ARRAY['Royal Wedding 1'],
  'Non-member update fails to modify event'
);
set local "request.jwt.claims" = '{"sub": "22222222-2222-2222-2222-222222222222"}';

-- TEST 4: User 2 CANNOT add themselves to Event 1
select throws_ok(
  'insert into public.event_members (event_id, user_id, role) values (''a0000000-0000-0000-0000-000000000001'', ''22222222-2222-2222-2222-222222222222'', ''owner'')',
  NULL,
  'Non-member cannot add themselves to another event'
);

-- TEST 5: Staff CANNOT insert or update guests
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333"}';
select throws_ok(
  'insert into public.guests (event_id, name, party_size, rsvp_token) values (''a0000000-0000-0000-0000-000000000001'', ''Staff Guest'', 1, ''tok_staff'')',
  NULL,
  'Staff cannot insert guests'
);

-- TEST 6: Anon CAN call get_invitation with valid token
set local role anon;
set local "request.jwt.claims" = '{}';
select is(
  (public.get_invitation('token_valid_guest_1')->'guest'->>'display_name'),
  'Guest 1',
  'Anon can fetch invitation with valid token'
);

-- TEST 7: Anon get_invitation DOES NOT expose email or phone
select is(
  (public.get_invitation('token_valid_guest_1')->'guest'->>'email'),
  NULL,
  'get_invitation does not expose guest email'
);

-- TEST 8: Anon get_invitation with invalid token returns NULL
select is(
  public.get_invitation('token_non_existent'),
  NULL,
  'get_invitation with invalid token returns null'
);

-- TEST 9: submit_rsvp succeeds for valid token and valid count
select is(
  (public.submit_rsvp('token_valid_guest_1', 'accepted', 2, NULL, 'No fish', 'Excited!')->>'ok')::boolean,
  true,
  'submit_rsvp succeeds for accepted response with valid count'
);

-- TEST 10: submit_rsvp fails when exceeding allowed party size
select throws_ok(
  'select public.submit_rsvp(''token_valid_guest_1'', ''accepted'', 5)',
  NULL,
  'submit_rsvp rejects count exceeding party size'
);

-- TEST 11: submit_rsvp requires 0 count when declining
select throws_ok(
  'select public.submit_rsvp(''token_valid_guest_1'', ''declined'', 2)',
  NULL,
  'submit_rsvp rejects count > 0 when declining'
);

-- TEST 12: Capacity check prevents seating beyond table capacity
-- Reset role to owner to test seating assignment
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111"}';
-- Assign Guest 1 (2 pax) to Table A (capacity 2) -> fills table
insert into public.seat_assignments (guest_id, table_id)
values ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001');

-- Now try assigning Guest 2 (2 pax) to Table A (capacity 2) -> must throw capacity exceeded!
select throws_ok(
  'insert into public.seat_assignments (guest_id, table_id) values (''c0000000-0000-0000-0000-000000000002'', ''b0000000-0000-0000-0000-000000000001'')',
  'Table capacity exceeded. Available: 0, required: 2',
  'check_table_capacity throws exception when table capacity is exceeded'
);

select * from finish();
rollback;

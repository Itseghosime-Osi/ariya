begin;
select plan(16);

-- 1. Create test users in auth.users
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner1@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'owner2@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'staff1@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'planner1@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'couple1@example.com')
on conflict (id) do nothing;

-- 2. Create Event 1 (owned by user 1) and Event 2 (owned by user 2)
insert into public.events (id, title, couple, date, venue, slug, status, rsvp_by)
values
  ('a0000000-0000-0000-0000-000000000001', 'Event 1', 'Couple 1', now() + interval '30 days', 'Venue 1', 'event-1', 'active', now() + interval '14 days'),
  ('a0000000-0000-0000-0000-000000000002', 'Event 2', 'Couple 2', now() + interval '40 days', 'Venue 2', 'event-2', 'active', now() + interval '20 days')
on conflict (id) do nothing;

insert into public.event_members (event_id, user_id, role)
values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('a0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'staff'),
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'planner'),
  ('a0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'couple'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'owner')
on conflict (event_id, user_id) do nothing;

-- 3. Create sample guests
insert into public.guests (id, event_id, name, phone, email, rsvp_token)
values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Guest Event 1', '+2348011111111', 'guest1@example.com', 'token_guest_1_length_22_chars'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Guest Event 2', '+2348022222222', 'guest2@example.com', 'token_guest_2_length_22_chars')
on conflict (id) do nothing;

-- TEST 1: Staff CAN read guests of their event
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select results_eq(
  'select count(*)::int from public.guests where id = ''c0000000-0000-0000-0000-000000000001''',
  ARRAY[1],
  'Staff can read guests of their event'
);

-- TEST 2: Couple CAN read guests of their event
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select results_eq(
  'select count(*)::int from public.guests where id = ''c0000000-0000-0000-0000-000000000001''',
  ARRAY[1],
  'Couple can read guests of their event'
);

-- TEST 3: Staff CANNOT insert guests
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok(
  'insert into public.guests (event_id, name, rsvp_token) values (''a0000000-0000-0000-0000-000000000001'', ''Staff Added Guest'', ''token_staff_attempt_22_chars'')',
  NULL,
  'Staff cannot insert guests'
);

-- TEST 4: Couple CANNOT insert guests
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  'insert into public.guests (event_id, name, rsvp_token) values (''a0000000-0000-0000-0000-000000000001'', ''Couple Added Guest'', ''token_couple_attempt_22_chars'')',
  NULL,
  'Couple cannot insert guests'
);

-- TEST 5: Staff CANNOT update guests
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
update public.guests set name = 'Staff Hacked' where id = 'c0000000-0000-0000-0000-000000000001';
select results_eq(
  'select name from public.guests where id = ''c0000000-0000-0000-0000-000000000001''',
  ARRAY['Guest Event 1'],
  'Staff cannot update guests'
);

-- TEST 6: Couple CANNOT update guests
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
update public.guests set name = 'Couple Hacked' where id = 'c0000000-0000-0000-0000-000000000001';
select results_eq(
  'select name from public.guests where id = ''c0000000-0000-0000-0000-000000000001''',
  ARRAY['Guest Event 1'],
  'Couple cannot update guests'
);

-- TEST 7: Staff CANNOT delete guests
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
delete from public.guests where id = 'c0000000-0000-0000-0000-000000000001';
select results_eq(
  'select count(*)::int from public.guests where id = ''c0000000-0000-0000-0000-000000000001''',
  ARRAY[1],
  'Staff cannot delete guests'
);

-- TEST 8: Couple CANNOT delete guests
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
delete from public.guests where id = 'c0000000-0000-0000-0000-000000000001';
select results_eq(
  'select count(*)::int from public.guests where id = ''c0000000-0000-0000-0000-000000000001''',
  ARRAY[1],
  'Couple cannot delete guests'
);

-- TEST 9: Staff CANNOT import guests via RPC
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok(
  'select public.import_guests(''a0000000-0000-0000-0000-000000000001'', ''[{"name": "Imported", "rsvp_token": "token_import_333333333333"}]''::jsonb)',
  'Only owners and planners can import guests',
  'Staff cannot call import_guests RPC'
);

-- TEST 10: Couple CANNOT import guests via RPC
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  'select public.import_guests(''a0000000-0000-0000-0000-000000000001'', ''[{"name": "Imported", "rsvp_token": "token_import_555555555555"}]''::jsonb)',
  'Only owners and planners can import guests',
  'Couple cannot call import_guests RPC'
);

-- TEST 11: Staff CANNOT regenerate guest token
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok(
  'select public.regenerate_guest_token(''c0000000-0000-0000-0000-000000000001'', ''new_token_by_staff_length_22_chars'')',
  'Only owners and planners can regenerate invitation links',
  'Staff cannot regenerate guest token'
);

-- TEST 12: Couple CANNOT regenerate guest token
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  'select public.regenerate_guest_token(''c0000000-0000-0000-0000-000000000001'', ''new_token_by_couple_length_22_chars'')',
  'Only owners and planners can regenerate invitation links',
  'Couple cannot regenerate guest token'
);

-- TEST 13: Planner CAN regenerate guest token
set local "request.jwt.claims" = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select lives_ok(
  'select public.regenerate_guest_token(''c0000000-0000-0000-0000-000000000001'', ''new_token_by_planner_length_22_chars'')',
  'Planner can regenerate guest token'
);

-- TEST 14: Owner CAN import guests
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(
  (public.import_guests('a0000000-0000-0000-0000-000000000001', '[{"name": "Batch Guest 1", "rsvp_token": "token_batch_guest_1_len22"}]'::jsonb)->>'imported_count')::int,
  1,
  'Owner can import guests'
);

-- TEST 15: Guests from another event (Event 2) CANNOT be touched by members of Event 1
update public.guests set name = 'Cross Event Hack' where id = 'c0000000-0000-0000-0000-000000000002';
select results_eq(
  'select name from public.guests where id = ''c0000000-0000-0000-0000-000000000002''',
  ARRAY[]::text[],
  'Members of Event 1 cannot see or update guests from Event 2'
);

-- TEST 16: Guests from another event CANNOT have token regenerated by member of Event 1
select throws_ok(
  'select public.regenerate_guest_token(''c0000000-0000-0000-0000-000000000002'', ''cross_event_token_length_22_chars'')',
  'Only owners and planners can regenerate invitation links',
  'Cannot regenerate token for guest belonging to another event'
);

select * from finish();
rollback;

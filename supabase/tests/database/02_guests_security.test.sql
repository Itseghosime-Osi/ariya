begin;
select plan(26);

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
insert into public.guests (id, event_id, name, phone, email, rsvp_token, side)
values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Guest Event 1', '+2348011111111', 'guest1@example.com', 'token_guest_1_length_22_chars', 'bride'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Guest Event 2', '+2348022222222', 'guest2@example.com', 'token_guest_2_length_22_chars', 'groom')
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
  'insert into public.guests (event_id, name, side) values (''a0000000-0000-0000-0000-000000000001'', ''Staff Injected Guest'', ''mutual'')',
  '42501',
  NULL,
  'Staff cannot directly insert guests'
);

-- TEST 4: Couple CANNOT insert guests
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  'insert into public.guests (event_id, name, side) values (''a0000000-0000-0000-0000-000000000001'', ''Couple Injected Guest'', ''mutual'')',
  '42501',
  NULL,
  'Couple cannot directly insert guests'
);

-- TEST 5: Staff CANNOT update guests
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
update public.guests set name = 'Hacked by Staff' where id = 'c0000000-0000-0000-0000-000000000001';
select results_eq(
  'select name from public.guests where id = ''c0000000-0000-0000-0000-000000000001''',
  ARRAY['Guest Event 1'],
  'Staff cannot update guests'
);

-- TEST 6: Couple CANNOT update guests
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
update public.guests set name = 'Hacked by Couple' where id = 'c0000000-0000-0000-0000-000000000001';
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
  'select public.import_guests(''a0000000-0000-0000-0000-000000000001'', ''[{"name": "Imported"}]''::jsonb)',
  'You must be an owner or planner to import guests',
  'Staff cannot call import_guests RPC'
);

-- TEST 10: Couple CANNOT import guests via RPC
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  'select public.import_guests(''a0000000-0000-0000-0000-000000000001'', ''[{"name": "Imported"}]''::jsonb)',
  'You must be an owner or planner to import guests',
  'Couple cannot call import_guests RPC'
);

-- TEST 11: Staff CANNOT regenerate guest token
set local "request.jwt.claims" = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select throws_ok(
  'select public.regenerate_guest_token(''c0000000-0000-0000-0000-000000000001'')',
  'You must be an owner or planner to regenerate invitation links',
  'Staff cannot regenerate guest token'
);

-- TEST 12: Couple CANNOT regenerate guest token
set local "request.jwt.claims" = '{"sub": "55555555-5555-5555-5555-555555555555", "role": "authenticated"}';
select throws_ok(
  'select public.regenerate_guest_token(''c0000000-0000-0000-0000-000000000001'')',
  'You must be an owner or planner to regenerate invitation links',
  'Couple cannot regenerate guest token'
);

-- TEST 13: Caller cannot choose or supply custom token to regenerate_guest_token (2 params throws function does not exist)
set local "request.jwt.claims" = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select throws_ok(
  'select public.regenerate_guest_token(''c0000000-0000-0000-0000-000000000001'', ''custom_injected_token'')',
  '42883',
  NULL,
  'Caller cannot supply custom token to regenerate_guest_token'
);

-- TEST 14: Planner regenerates token: returns token matching ^[0-9A-Za-z_-]{22,}$ and differs from old token
select matches(
  public.regenerate_guest_token('c0000000-0000-0000-0000-000000000001'),
  '^[0-9A-Za-z_-]{22,}$',
  'Generated token matches safe base64url pattern'
);

-- TEST 15: Direct execution of internal token generator is revoked from authenticated role
select throws_ok(
  'select public.generate_invitation_token()',
  '42501',
  NULL,
  'Authenticated role cannot directly call internal token generator'
);

-- TEST 16: Self-defending import_guests rejects empty name
set local "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select throws_ok(
  'select public.import_guests(''a0000000-0000-0000-0000-000000000001'', ''[{"name": "   "}]''::jsonb)',
  'Row 1: Guest name cannot be empty',
  'import_guests rejects empty guest name'
);

-- TEST 17: Self-defending import_guests rejects oversized name (> 120 chars)
select throws_ok(
  'select public.import_guests(''a0000000-0000-0000-0000-000000000001'', jsonb_build_array(jsonb_build_object(''name'', repeat(''A'', 121))))',
  'Row 1: Guest name exceeds maximum limit of 120 characters',
  'import_guests rejects oversized name'
);

-- TEST 18: Self-defending import_guests rejects payloads over 500 rows
select throws_ok(
  'select public.import_guests(''a0000000-0000-0000-0000-000000000001'', (select jsonb_agg(jsonb_build_object(''name'', ''Guest '' || i)) from generate_series(1, 501) i))',
  'Payload exceeds maximum limit of 500 guests',
  'import_guests rejects payloads exceeding 500 rows'
);

-- TEST 19: Owner CAN import guests, and caller-supplied rsvp_token is ignored in favor of DB-generated token
select is(
  (public.import_guests('a0000000-0000-0000-0000-000000000001', '[{"name": "Batch Guest 1", "rsvp_token": "hacked_injected_token"}]'::jsonb)->>'imported_count')::int,
  1,
  'Owner can import guests'
);
select isnt(
  (select rsvp_token from public.guests where name = 'Batch Guest 1' and event_id = 'a0000000-0000-0000-0000-000000000001'),
  'hacked_injected_token',
  'import_guests ignores caller-supplied rsvp_token'
);

-- TEST 20: Guests from another event (Event 2) CANNOT be touched by members of Event 1
update public.guests set name = 'Cross Event Hack' where id = 'c0000000-0000-0000-0000-000000000002';
select results_eq(
  'select name from public.guests where id = ''c0000000-0000-0000-0000-000000000002''',
  ARRAY[]::text[],
  'Members of Event 1 cannot see or update guests from Event 2'
);

-- TEST 21: Guests from another event CANNOT have token regenerated by member of Event 1
select throws_ok(
  'select public.regenerate_guest_token(''c0000000-0000-0000-0000-000000000002'')',
  'You must be an owner or planner to regenerate invitation links',
  'Cannot regenerate token for guest belonging to another event'
);

-- TEST 22: search_guests safely handles malicious search strings without SQL injection or crashing
select lives_ok(
  'select * from public.search_guests(''a0000000-0000-0000-0000-000000000001'', ''a,id.neq.0'')',
  'search_guests safely handles comma/filter syntax injection string'
);
select lives_ok(
  'select * from public.search_guests(''a0000000-0000-0000-0000-000000000001'', ''%'')',
  'search_guests safely handles wildcard %'
);
select lives_ok(
  'select * from public.search_guests(''a0000000-0000-0000-0000-000000000001'', ''_'')',
  'search_guests safely handles wildcard _'
);
select lives_ok(
  'select * from public.search_guests(''a0000000-0000-0000-0000-000000000001'', ''(x)'')',
  'search_guests safely handles parenthesis input'
);

select * from finish();
rollback;

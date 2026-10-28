begin;
create extension if not exists pgtap;

select plan(5);

-- 1. Setup test users and data
create temp table _test_p8_search_data (
  user_a uuid,
  user_b uuid,
  event_a uuid,
  event_b uuid,
  guest_a uuid,
  guest_b uuid,
  vendor_a uuid,
  vendor_b uuid
);
grant select on _test_p8_search_data to authenticated;

do $$
declare
  v_ua uuid := gen_random_uuid();
  v_ub uuid := gen_random_uuid();
  v_ea uuid;
  v_eb uuid;
  v_ga uuid;
  v_gb uuid;
  v_va uuid;
  v_vb uuid;
begin
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  values
    (v_ua, 'search_a@owambe.ng', '{"full_name": "User A"}'::jsonb, now()),
    (v_ub, 'search_b@owambe.ng', '{"full_name": "User B"}'::jsonb, now());

  -- Create Event A for User A
  perform set_config('request.jwt.claim.sub', v_ua::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  v_ea := (public.create_event(
    p_title := 'Royal Coronation Gala 2026',
    p_couple := 'Folake & Femi',
    p_date := '2026-12-20 14:00:00+00',
    p_venue := 'Federal Palace Hotel',
    p_area := 'Victoria Island'
  )->>'id')::uuid;

  insert into public.guests (event_id, name, email, phone)
  values (v_ea, 'Amina Adeleke', 'amina@adeleke.ng', '+2348011112222')
  returning id into v_ga;

  insert into public.vendors (event_id, name, category, contact_name)
  values (v_ea, 'Royal Gourmet Catering', 'Catering', 'Chef Bolanle')
  returning id into v_va;

  -- Create Event B for User B
  perform set_config('request.jwt.claim.sub', v_ub::text, true);
  v_eb := (public.create_event(
    p_title := 'Secret Midnight Soiree',
    p_couple := 'Zainab & Kazeem',
    p_date := '2026-12-25 18:00:00+00',
    p_venue := 'Private Island',
    p_area := 'Lekki'
  )->>'id')::uuid;

  insert into public.guests (event_id, name, email, phone)
  values (v_eb, 'Zainab Secret Guest', 'secret@soiree.ng', '+2348033334444')
  returning id into v_gb;

  insert into public.vendors (event_id, name, category, contact_name)
  values (v_eb, 'Midnight Sound DJ', 'Music', 'DJ Spin')
  returning id into v_vb;

  insert into _test_p8_search_data values (
    v_ua, v_ub, v_ea, v_eb, v_ga, v_gb, v_va, v_vb
  );
end $$;

-- 2. Unauthenticated caller fails
select throws_matching(
  $$
    select set_config('request.jwt.claim.sub', '', true);
    select set_config('request.jwt.claim.role', 'anon', true);
    select public.global_search('Coronation');
  $$,
  'permission denied|Not authenticated',
  'Unauthenticated call to global_search is denied'
);

-- 3. Empty query returns empty results
select is(
  (
    select public.global_search('')
  ),
  jsonb_build_object('events', '[]'::jsonb, 'guests', '[]'::jsonb, 'vendors', '[]'::jsonb),
  'Empty query returns empty JSON result arrays'
);

-- 4. User A finds their own events, guests and vendors
select is(
  (
    select jsonb_array_length((public.global_search('Royal'))->'events')
    from (
      select set_config('request.jwt.claim.sub', (select user_a::text from _test_p8_search_data), true),
             set_config('request.jwt.claim.role', 'authenticated', true)
    ) s
  ),
  1,
  'User A finds matching event by title'
);

-- 5. User A finds their own guest by name
select is(
  (
    select ((public.global_search('Amina'))->'guests'->0->>'name')
    from (
      select set_config('request.jwt.claim.sub', (select user_a::text from _test_p8_search_data), true),
             set_config('request.jwt.claim.role', 'authenticated', true)
    ) s
  ),
  'Amina Adeleke',
  'User A finds matching guest by name'
);

-- 6. Isolation: User A cannot see User B events/guests/vendors even if searching for exact term
select is(
  (
    select jsonb_array_length((public.global_search('Midnight'))->'events')
    from (
      select set_config('request.jwt.claim.sub', (select user_a::text from _test_p8_search_data), true),
             set_config('request.jwt.claim.role', 'authenticated', true)
    ) s
  ),
  0,
  'User A cannot access User B events in global search'
);

select * from finish();
rollback;

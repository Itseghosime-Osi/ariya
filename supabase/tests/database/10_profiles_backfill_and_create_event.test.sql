begin;
create extension if not exists pgtap;

select plan(5);

-- Setup temp table to hold test data
create temp table _test_profile_data (
  user_id uuid,
  created_event_id uuid
);

do $$
declare
  v_test_user uuid := gen_random_uuid();
begin
  -- 1. Insert user into auth.users (trigger creates a profile)
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  values (
    v_test_user,
    'backfill_tester@ariya.app',
    '{"full_name": "Backfill Test User", "avatar_url": "https://example.com/avatar.jpg"}'::jsonb,
    now()
  );

  -- 2. Explicitly remove the profile to simulate pre-existing auth user without profile
  delete from public.profiles where id = v_test_user;

  insert into _test_profile_data (user_id) values (v_test_user);
end;
$$;

-- Test 1: Confirm profile does not exist
select ok(
  not exists(
    select 1 from public.profiles
    where id = (select user_id from _test_profile_data)
  ),
  'Profile should be absent before backfill'
);

-- 3. Run the exact backfill query
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  coalesce(u.raw_user_meta_data->>'avatar_url', '')
from auth.users u
where u.id = (select user_id from _test_profile_data)
on conflict (id) do nothing;

-- Test 2: Check row exists and full_name matches
select is(
  (select full_name from public.profiles where id = (select user_id from _test_profile_data)),
  'Backfill Test User',
  'Profile was successfully backfilled from auth.users'
);

-- Test 3: Re-running backfill with on conflict (id) do nothing is idempotent
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data->>'full_name', ''),
  coalesce(u.raw_user_meta_data->>'avatar_url', '')
from auth.users u
where u.id = (select user_id from _test_profile_data)
on conflict (id) do nothing;

select ok(
  exists(
    select 1 from public.profiles
    where id = (select user_id from _test_profile_data)
  ),
  'Backfill statement is safe and idempotent'
);

-- 4. Delete profile once again to test robust create_event RPC
delete from public.profiles where id = (select user_id from _test_profile_data);

do $$
declare
  v_uid uuid;
  v_created_event jsonb;
begin
  select user_id into v_uid from _test_profile_data;

  -- Act as authenticated test user who is missing a profiles row
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_created_event := public.create_event(
    p_title := 'Robust Event Creation',
    p_couple := 'Femi & Yemi',
    p_date := '2026-12-20 12:00:00+00',
    p_venue := 'Lekki Coliseum',
    p_area := 'Lekki Phase 1',
    p_slug := 'robust-event-' || substr(gen_random_uuid()::text, 1, 8)
  );

  update _test_profile_data
  set created_event_id = (v_created_event->>'id')::uuid;
end;
$$;

-- Test 4: create_event returns valid event id
select ok(
  (select created_event_id from _test_profile_data) is not null,
  'create_event succeeds even when user profile is initially missing'
);

-- Test 5: verify caller profile was auto-created and owner role assigned in event_members
select ok(
  exists(
    select 1 from public.event_members em
    join public.profiles p on p.id = em.user_id
    where em.event_id = (select created_event_id from _test_profile_data)
      and em.user_id = (select user_id from _test_profile_data)
      and em.role = 'owner'
  ),
  'Profile and owner membership created successfully'
);

select * from finish();
rollback;

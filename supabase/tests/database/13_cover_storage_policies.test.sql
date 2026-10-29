begin;
create extension if not exists pgtap;

-- Allow direct delete queries on storage tables for testing RLS delete policies
set storage.allow_delete_query = 'true';

select plan(21);

-- 1. Setup test data: users, events, and memberships
create temp table _test_storage_data (
  owner_id uuid,
  planner_id uuid,
  couple_id uuid,
  staff_id uuid,
  outsider_id uuid,
  event_1_id uuid,
  event_2_id uuid
);
grant select on _test_storage_data to authenticated, anon;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_planner uuid := gen_random_uuid();
  v_couple uuid := gen_random_uuid();
  v_staff uuid := gen_random_uuid();
  v_outsider uuid := gen_random_uuid();
  v_e1 uuid;
  v_e2 uuid;
begin
  -- Create auth users
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  values
    (v_owner, 'owner_cov@ariya.ng', '{"full_name": "Event Owner"}'::jsonb, now()),
    (v_planner, 'planner_cov@ariya.ng', '{"full_name": "Event Planner"}'::jsonb, now()),
    (v_couple, 'couple_cov@ariya.ng', '{"full_name": "Couple VIP"}'::jsonb, now()),
    (v_staff, 'staff_cov@ariya.ng', '{"full_name": "Desk Staff"}'::jsonb, now()),
    (v_outsider, 'outsider_cov@ariya.ng', '{"full_name": "Outsider"}'::jsonb, now());

  -- Owner creates event 1
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_e1 := (public.create_event(
    p_title := 'Cover Test Event 1',
    p_couple := 'Kemi & Femi',
    p_date := '2026-12-20 14:00:00+00',
    p_venue := 'Lagos Oriental Hotel',
    p_area := 'Victoria Island',
    p_slug := 'cov-test-1-' || substr(gen_random_uuid()::text, 1, 8)
  )->>'id')::uuid;

  -- Add planner, couple, and staff to event 1
  insert into public.event_members (event_id, user_id, role)
  values
    (v_e1, v_planner, 'planner'),
    (v_e1, v_couple, 'couple'),
    (v_e1, v_staff, 'staff');

  -- Outsider creates event 2
  perform set_config('request.jwt.claims', json_build_object('sub', v_outsider::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_e2 := (public.create_event(
    p_title := 'Cover Test Event 2',
    p_couple := 'Zara & Tunde',
    p_date := '2026-12-25 14:00:00+00',
    p_venue := 'Federal Palace',
    p_slug := 'cov-test-2-' || substr(gen_random_uuid()::text, 1, 8)
  )->>'id')::uuid;

  insert into _test_storage_data
  values (v_owner, v_planner, v_couple, v_staff, v_outsider, v_e1, v_e2);
end;
$$;

-- TEST 1: Owner CAN insert cover object under event 1
do $$
declare
  d record;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.owner_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.owner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  insert into storage.objects (bucket_id, name, owner)
  values ('event-covers', d.event_1_id::text || '/owner.jpg', d.owner_id);
  reset role;
end;
$$;

select is(
  (
    select count(*)::integer
    from storage.objects, _test_storage_data
    where bucket_id = 'event-covers'
      and name = event_1_id::text || '/owner.jpg'
  ),
  1,
  'Owner can insert cover object under their event folder'
);

-- TEST 2: Owner CAN select (list) their event cover object
do $$
declare
  d record;
  v_count integer;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.owner_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.owner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  select count(*) into v_count
  from storage.objects
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/owner.jpg';
  reset role;

  if v_count <> 1 then
    raise exception 'Owner was not able to select cover object!';
  end if;
end;
$$;

select pass('Owner can select (list) cover objects under their event folder');

-- TEST 3: Owner CAN update their event cover object
do $$
declare
  d record;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.owner_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.owner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update storage.objects
  set metadata = '{"updated": true}'::jsonb
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/owner.jpg';
  reset role;
end;
$$;

select is(
  (
    select (metadata->>'updated')::boolean
    from storage.objects, _test_storage_data
    where bucket_id = 'event-covers'
      and name = event_1_id::text || '/owner.jpg'
  ),
  true,
  'Owner can update cover object metadata'
);

-- TEST 4: Planner CAN insert cover object under event 1
do $$
declare
  d record;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.planner_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.planner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  insert into storage.objects (bucket_id, name, owner)
  values ('event-covers', d.event_1_id::text || '/planner.jpg', d.planner_id);
  reset role;
end;
$$;

select is(
  (
    select count(*)::integer
    from storage.objects, _test_storage_data
    where bucket_id = 'event-covers'
      and name = event_1_id::text || '/planner.jpg'
  ),
  1,
  'Planner can insert cover object under their event folder'
);

-- TEST 5: Planner CAN update and delete cover object under event 1
do $$
declare
  d record;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.planner_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.planner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  delete from storage.objects
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/planner.jpg';
  reset role;
end;
$$;

select is(
  (
    select count(*)::integer
    from storage.objects, _test_storage_data
    where bucket_id = 'event-covers'
      and name = event_1_id::text || '/planner.jpg'
  ),
  0,
  'Planner can delete cover object under their event folder'
);

-- TEST 6: Couple CAN insert cover object under event 1
do $$
declare
  d record;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.couple_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.couple_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  insert into storage.objects (bucket_id, name, owner)
  values ('event-covers', d.event_1_id::text || '/couple.jpg', d.couple_id);
  reset role;
end;
$$;

select is(
  (
    select count(*)::integer
    from storage.objects, _test_storage_data
    where bucket_id = 'event-covers'
      and name = event_1_id::text || '/couple.jpg'
  ),
  1,
  'Couple can insert cover object under their event folder'
);

-- TEST 7: Couple CAN update and select their event cover object
do $$
declare
  d record;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.couple_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.couple_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update storage.objects
  set metadata = '{"couple_updated": true}'::jsonb
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/couple.jpg';
  reset role;
end;
$$;

select is(
  (
    select (metadata->>'couple_updated')::boolean
    from storage.objects, _test_storage_data
    where bucket_id = 'event-covers'
      and name = event_1_id::text || '/couple.jpg'
  ),
  true,
  'Couple can update cover object metadata'
);

-- TEST 8: Staff CANNOT insert cover object under event 1
select throws_ok(
  format($q$
    set local role authenticated;
    select set_config('request.jwt.claims', json_build_object('sub', '%s', 'role', 'authenticated')::text, true);
    select set_config('request.jwt.claim.sub', '%s', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    insert into storage.objects (bucket_id, name, owner)
    values ('event-covers', '%s/staff.jpg', '%s');
  $q$,
  (select staff_id from _test_storage_data),
  (select staff_id from _test_storage_data),
  (select event_1_id from _test_storage_data),
  (select staff_id from _test_storage_data)
  ),
  '42501',
  null,
  'Staff role CANNOT insert cover object into event-covers bucket'
);

-- TEST 9: Staff CANNOT select (list) cover objects under event 1
do $$
declare
  d record;
  v_count integer;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.staff_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.staff_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  select count(*) into v_count
  from storage.objects
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/owner.jpg';
  reset role;

  if v_count > 0 then
    raise exception 'Staff was able to select % objects!', v_count;
  end if;
end;
$$;

select pass('Staff role CANNOT select (list) cover objects under event folder');

-- TEST 10: Staff CANNOT update cover objects under event 1
do $$
declare
  d record;
  v_updated integer;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.staff_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.staff_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update storage.objects
  set metadata = '{"staff_hacked": true}'::jsonb
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/owner.jpg';

  get diagnostics v_updated = row_count;
  reset role;

  if v_updated > 0 then
    raise exception 'Staff was able to update cover object!';
  end if;
end;
$$;

select pass('Staff role CANNOT update cover objects under event folder');

-- TEST 11: Staff CANNOT delete cover objects under event 1
do $$
declare
  d record;
  v_deleted integer;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.staff_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.staff_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  delete from storage.objects
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/owner.jpg';

  get diagnostics v_deleted = row_count;
  reset role;

  if v_deleted > 0 then
    raise exception 'Staff was able to delete cover object!';
  end if;
end;
$$;

select pass('Staff role CANNOT delete cover objects under event folder');

-- TEST 12: Non-member CANNOT insert cover object under event 1
select throws_ok(
  format($q$
    set local role authenticated;
    select set_config('request.jwt.claims', json_build_object('sub', '%s', 'role', 'authenticated')::text, true);
    select set_config('request.jwt.claim.sub', '%s', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    insert into storage.objects (bucket_id, name, owner)
    values ('event-covers', '%s/outsider.jpg', '%s');
  $q$,
  (select outsider_id from _test_storage_data),
  (select outsider_id from _test_storage_data),
  (select event_1_id from _test_storage_data),
  (select outsider_id from _test_storage_data)
  ),
  '42501',
  null,
  'Non-member CANNOT insert cover object into event-covers bucket'
);

-- TEST 13: Non-member CANNOT select (list) cover objects under event 1
do $$
declare
  d record;
  v_count integer;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.outsider_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.outsider_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  select count(*) into v_count
  from storage.objects
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/owner.jpg';
  reset role;

  if v_count > 0 then
    raise exception 'Non-member was able to select % objects!', v_count;
  end if;
end;
$$;

select pass('Non-member CANNOT select (list) cover objects under event 1');

-- TEST 14: Non-member CANNOT update cover objects under event 1
do $$
declare
  d record;
  v_updated integer;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.outsider_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.outsider_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update storage.objects
  set metadata = '{"outsider_hacked": true}'::jsonb
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/owner.jpg';

  get diagnostics v_updated = row_count;
  reset role;

  if v_updated > 0 then
    raise exception 'Non-member was able to update cover object!';
  end if;
end;
$$;

select pass('Non-member CANNOT update cover objects under event 1');

-- TEST 15: Non-member CANNOT delete cover objects under event 1
do $$
declare
  d record;
  v_deleted integer;
begin
  select * into d from _test_storage_data;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', d.outsider_id::text, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', d.outsider_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  delete from storage.objects
  where bucket_id = 'event-covers'
    and name = d.event_1_id::text || '/owner.jpg';

  get diagnostics v_deleted = row_count;
  reset role;

  if v_deleted > 0 then
    raise exception 'Non-member was able to delete cover object!';
  end if;
end;
$$;

select pass('Non-member CANNOT delete cover objects under event 1');

-- TEST 16: Anon CANNOT select (list) objects in event-covers bucket
do $$
declare
  v_count integer;
begin
  set local role anon;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('request.jwt.claim.sub', '', true);

  select count(*) into v_count
  from storage.objects
  where bucket_id = 'event-covers';
  reset role;

  if v_count > 0 then
    raise exception 'Anon was able to select % objects from event-covers!', v_count;
  end if;
end;
$$;

select pass('Anon CANNOT select (list) objects in event-covers bucket');

-- TEST 17: Anon CANNOT insert objects in event-covers bucket
select throws_ok(
  format($q$
    set local role anon;
    select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    select set_config('request.jwt.claim.role', 'anon', true);
    select set_config('request.jwt.claim.sub', '', true);
    insert into storage.objects (bucket_id, name)
    values ('event-covers', '%s/anon.jpg');
  $q$,
  (select event_1_id from _test_storage_data)
  ),
  '42501',
  null,
  'Anon CANNOT insert objects into event-covers bucket'
);

-- TEST 18: Owner of event 1 CANNOT write to event 2 folder
select throws_ok(
  format($q$
    set local role authenticated;
    select set_config('request.jwt.claims', json_build_object('sub', '%s', 'role', 'authenticated')::text, true);
    select set_config('request.jwt.claim.sub', '%s', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    insert into storage.objects (bucket_id, name, owner)
    values ('event-covers', '%s/cross_event_owner.jpg', '%s');
  $q$,
  (select owner_id from _test_storage_data),
  (select owner_id from _test_storage_data),
  (select event_2_id from _test_storage_data),
  (select owner_id from _test_storage_data)
  ),
  '42501',
  null,
  'Owner of event 1 CANNOT insert into event 2 folder'
);

-- TEST 19: Planner of event 1 CANNOT write to event 2 folder
select throws_ok(
  format($q$
    set local role authenticated;
    select set_config('request.jwt.claims', json_build_object('sub', '%s', 'role', 'authenticated')::text, true);
    select set_config('request.jwt.claim.sub', '%s', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    insert into storage.objects (bucket_id, name, owner)
    values ('event-covers', '%s/cross_event_planner.jpg', '%s');
  $q$,
  (select planner_id from _test_storage_data),
  (select planner_id from _test_storage_data),
  (select event_2_id from _test_storage_data),
  (select planner_id from _test_storage_data)
  ),
  '42501',
  null,
  'Planner of event 1 CANNOT insert into event 2 folder'
);

-- TEST 20: Couple of event 1 CANNOT write to event 2 folder
select throws_ok(
  format($q$
    set local role authenticated;
    select set_config('request.jwt.claims', json_build_object('sub', '%s', 'role', 'authenticated')::text, true);
    select set_config('request.jwt.claim.sub', '%s', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    insert into storage.objects (bucket_id, name, owner)
    values ('event-covers', '%s/cross_event_couple.jpg', '%s');
  $q$,
  (select couple_id from _test_storage_data),
  (select couple_id from _test_storage_data),
  (select event_2_id from _test_storage_data),
  (select couple_id from _test_storage_data)
  ),
  '42501',
  null,
  'Couple of event 1 CANNOT insert into event 2 folder'
);

-- TEST 21: Nobody can write to non-UUID folder
select throws_ok(
  format($q$
    set local role authenticated;
    select set_config('request.jwt.claims', json_build_object('sub', '%s', 'role', 'authenticated')::text, true);
    select set_config('request.jwt.claim.sub', '%s', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    insert into storage.objects (bucket_id, name, owner)
    values ('event-covers', 'not-a-uuid-folder/test.jpg', '%s');
  $q$,
  (select owner_id from _test_storage_data),
  (select owner_id from _test_storage_data),
  (select owner_id from _test_storage_data)
  ),
  '42501',
  null,
  'Insert into non-UUID folder is rejected by regex guard'
);

select * from finish();
rollback;

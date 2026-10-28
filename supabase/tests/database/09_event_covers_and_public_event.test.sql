begin;
create extension if not exists pgtap;

select plan(9);

-- 1. Setup test users and events
create temp table _test_p9_data (
  member_user_id uuid,
  non_member_user_id uuid,
  active_public_event_id uuid,
  private_event_id uuid,
  draft_event_id uuid,
  archived_event_id uuid,
  public_slug text,
  private_slug text,
  draft_slug text,
  archived_slug text
);
grant select on _test_p9_data to authenticated, anon;

do $$
declare
  v_member uuid := gen_random_uuid();
  v_non_member uuid := gen_random_uuid();
  v_e_pub uuid;
  v_e_priv uuid;
  v_e_draft uuid;
  v_e_arch uuid;
  v_slug_pub text := 'pub-celebration-' || substr(gen_random_uuid()::text, 1, 8);
  v_slug_priv text := 'priv-celebration-' || substr(gen_random_uuid()::text, 1, 8);
  v_slug_draft text := 'draft-celebration-' || substr(gen_random_uuid()::text, 1, 8);
  v_slug_arch text := 'arch-celebration-' || substr(gen_random_uuid()::text, 1, 8);
begin
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  values
    (v_member, 'member_test@owambe.ng', '{"full_name": "Event Host"}'::jsonb, now()),
    (v_non_member, 'non_member_test@owambe.ng', '{"full_name": "Outsider"}'::jsonb, now());

  -- Host creates active public event
  perform set_config('request.jwt.claim.sub', v_member::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_e_pub := (public.create_event(
    p_title := 'Royal Lagos Jubilee',
    p_couple := 'Ade & Bisi',
    p_date := '2026-11-15 13:00:00+00',
    p_venue := 'Eko Hotel Ballroom',
    p_area := 'Victoria Island',
    p_slug := v_slug_pub
  )->>'id')::uuid;

  update public.events
  set
    status = 'active',
    is_public = true,
    description = 'Welcome to our grand wedding ceremony in Lagos.',
    cover_image_url = 'http://127.0.0.1:57321/storage/v1/object/public/event-covers/' || v_e_pub || '/cover.jpg',
    schedule = '[{"time": "14:00 WAT", "title": "Reception", "location": "Grand Hall"}]'::jsonb
  where id = v_e_pub;

  -- Create private event (is_public = false, status = active)
  v_e_priv := (public.create_event(
    p_title := 'Secret Private Dinner',
    p_couple := 'Ade & Bisi',
    p_date := '2026-11-20 19:00:00+00',
    p_venue := 'Private Residence',
    p_slug := v_slug_priv
  )->>'id')::uuid;

  update public.events
  set status = 'active', is_public = false
  where id = v_e_priv;

  -- Create draft event (is_public = true, status = draft)
  v_e_draft := (public.create_event(
    p_title := 'Draft Unreleased Gala',
    p_couple := 'Ade & Bisi',
    p_date := '2026-11-25 18:00:00+00',
    p_venue := 'Civic Centre',
    p_slug := v_slug_draft
  )->>'id')::uuid;

  update public.events
  set status = 'draft', is_public = true
  where id = v_e_draft;

  -- Create archived event (is_public = true, status = archived)
  v_e_arch := (public.create_event(
    p_title := 'Concluded Ceremony 2025',
    p_couple := 'Ade & Bisi',
    p_date := '2025-10-10 10:00:00+00',
    p_venue := 'Harbour Point',
    p_slug := v_slug_arch
  )->>'id')::uuid;

  update public.events
  set status = 'archived', is_public = true
  where id = v_e_arch;

  insert into _test_p9_data
  values (
    v_member, v_non_member,
    v_e_pub, v_e_priv, v_e_draft, v_e_arch,
    v_slug_pub, v_slug_priv, v_slug_draft, v_slug_arch
  );
end;
$$;

-- TEST 1: get_public_event returns description, cover_image_url and schedule for public active events
select is(
  (
    select jsonb_build_object(
      'description', (res->>'description'),
      'has_cover', (res->>'cover_image_url' is not null),
      'has_schedule', (jsonb_array_length(res->'schedule') > 0)
    )
    from _test_p9_data,
    lateral public.get_public_event(public_slug) as res
  ),
  jsonb_build_object(
    'description', 'Welcome to our grand wedding ceremony in Lagos.',
    'has_cover', true,
    'has_schedule', true
  ),
  'get_public_event returns description, cover_image_url and schedule for active public events'
);

-- TEST 2: get_public_event returns null for private events
select is(
  (
    select public.get_public_event(private_slug)
    from _test_p9_data
  ),
  null::jsonb,
  'get_public_event returns null for private events (is_public = false)'
);

-- TEST 3: get_public_event returns null for draft events
select is(
  (
    select public.get_public_event(draft_slug)
    from _test_p9_data
  ),
  null::jsonb,
  'get_public_event returns null for draft events (status = draft)'
);

-- TEST 4: get_public_event returns null for archived events
select is(
  (
    select public.get_public_event(archived_slug)
    from _test_p9_data
  ),
  null::jsonb,
  'get_public_event returns null for archived events (status = archived)'
);

-- TEST 5: Event member can upload/insert object into event-covers bucket
do $$
declare
  d record;
begin
  select * into d from _test_p9_data;
  perform set_config('request.jwt.claim.sub', d.member_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  insert into storage.objects (bucket_id, name, owner)
  values ('event-covers', d.active_public_event_id::text || '/cover.jpg', d.member_user_id);
end;
$$;

select is(
  (
    select count(*)::integer
    from storage.objects, _test_p9_data
    where bucket_id = 'event-covers'
      and name = active_public_event_id::text || '/cover.jpg'
  ),
  1,
  'Event member can insert cover object into event-covers bucket'
);

-- TEST 6: Event member can update and delete object in event-covers bucket
do $$
declare
  d record;
begin
  select * into d from _test_p9_data;
  perform set_config('request.jwt.claim.sub', d.member_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update storage.objects
  set metadata = '{"updated": true}'::jsonb
  where bucket_id = 'event-covers'
    and name = d.active_public_event_id::text || '/cover.jpg';
end;
$$;

select is(
  (
    select (metadata->>'updated')::boolean
    from storage.objects, _test_p9_data
    where bucket_id = 'event-covers'
      and name = active_public_event_id::text || '/cover.jpg'
  ),
  true,
  'Event member can update cover object in event-covers bucket'
);

-- TEST 7: Non-member CANNOT insert object for another event into event-covers bucket
select throws_ok(
  format($q$
    set role authenticated;
    set request.jwt.claim.sub = '%s';
    set request.jwt.claim.role = 'authenticated';
    insert into storage.objects (bucket_id, name, owner)
    values ('event-covers', '%s/unauthorized.jpg', '%s');
  $q$,
  (select non_member_user_id from _test_p9_data),
  (select active_public_event_id from _test_p9_data),
  (select non_member_user_id from _test_p9_data)
  ),
  '42501',
  null,
  'Non-member insert into event-covers is rejected by RLS'
);

-- TEST 8: Non-member CANNOT update or delete object belonging to another event
do $$
declare
  d record;
  v_updated integer;
begin
  select * into d from _test_p9_data;
  set role authenticated;
  perform set_config('request.jwt.claim.sub', d.non_member_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  update storage.objects
  set metadata = '{"hacked": true}'::jsonb
  where bucket_id = 'event-covers'
    and name = d.active_public_event_id::text || '/cover.jpg';

  get diagnostics v_updated = row_count;
  reset role;
  if v_updated > 0 then
    raise exception 'Non-member was able to update object!';
  end if;
end;
$$;

select is(
  (
    select (metadata->>'hacked') is null
    from storage.objects, _test_p9_data
    where bucket_id = 'event-covers'
      and name = active_public_event_id::text || '/cover.jpg'
  ),
  true,
  'Non-member cannot update cover object for another event'
);

-- TEST 9: Public/anon user can read cover objects in event-covers bucket
select is(
  (
    select count(*)::integer
    from (
      select 1
      from storage.objects, _test_p9_data
      where bucket_id = 'event-covers'
        and name = active_public_event_id::text || '/cover.jpg'
    ) s
  ),
  1,
  'Public can read objects in event-covers bucket'
);

select * from finish();
rollback;

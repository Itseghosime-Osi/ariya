begin;
create extension if not exists pgtap;

select plan(11);

-- 1. Privilege Audit for anon
select set_eq(
  $$
    select distinct routine_name::text
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  $$,
  $$
    values
      ('get_check_in_code'),
      ('get_invitation'),
      ('get_public_event'),
      ('has_event_role'),
      ('is_event_member'),
      ('submit_rsvp')
  $$,
  'Privilege audit: Only explicitly allowed functions are executable by anon'
);

-- 2. Privilege Audit for authenticated
select set_eq(
  $$
    select distinct routine_name::text
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  $$,
  $$
    values
      ('accept_team_invite'),
      ('assign_seat'),
      ('check_in'),
      ('check_invitation_quota'),
      ('create_event'),
      ('find_import_duplicates'),
      ('get_check_in_code'),
      ('get_invitation'),
      ('get_public_event'),
      ('get_user_events_with_metrics'),
      ('global_search'),
      ('has_event_role'),
      ('import_guests'),
      ('invite_team_member'),
      ('is_event_member'),
      ('regenerate_guest_token'),
      ('remove_team_member'),
      ('search_guests'),
      ('submit_rsvp'),
      ('table_seats_used'),
      ('track_invitations_sent'),
      ('update_team_member_role')
  $$,
  'Privilege audit: Only explicitly allowed functions are executable by authenticated'
);

-- 3. Check record_successful_payment permissions
select is(
  has_function_privilege('anon', 'public.record_successful_payment(text, jsonb)', 'execute'),
  false,
  'anon does not have execute privilege on record_successful_payment'
);

select is(
  has_function_privilege('authenticated', 'public.record_successful_payment(text, jsonb)', 'execute'),
  false,
  'authenticated does not have execute privilege on record_successful_payment'
);

select is(
  has_function_privilege('service_role', 'public.record_successful_payment(text, jsonb)', 'execute'),
  true,
  'service_role has execute privilege on record_successful_payment'
);

-- Set up test data for functional tests
create temp table _test_p7_data (
  owner_id uuid,
  imposter_id uuid,
  unconfirmed_id uuid,
  valid_invitee_id uuid,
  event_id uuid,
  payment_ref text,
  invite_token text,
  unconfirmed_token text
);
grant select on _test_p7_data to authenticated, service_role, anon;

do $$
declare
  v_owner uuid := gen_random_uuid();
  v_imposter uuid := gen_random_uuid();
  v_unconfirmed uuid := gen_random_uuid();
  v_valid_invitee uuid := gen_random_uuid();
  v_event_res jsonb;
  v_event_id uuid;
  v_ref text := 'TEST-REF-' || gen_random_uuid()::text;
  v_invite jsonb;
  v_unconfirmed_invite jsonb;
begin
  -- Create auth users
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  values
    (v_owner, 'owner_p7@owambe.ng', '{"full_name": "Audit Owner"}'::jsonb, now()),
    (v_imposter, 'imposter_p7@owambe.ng', '{"full_name": "Audit Imposter"}'::jsonb, now()),
    (v_valid_invitee, 'legit_p7@owambe.ng', '{"full_name": "Audit Legit"}'::jsonb, now()),
    (v_unconfirmed, 'unconfirmed_p7@owambe.ng', '{"full_name": "Audit Unconfirmed"}'::jsonb, null);

  -- Create event as owner
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_event_res := public.create_event(
    p_title := 'Audit Nuptials',
    p_couple := 'Shola & Deji',
    p_date := '2026-12-10 14:00:00+00',
    p_venue := 'Civic Centre',
    p_area := 'Victoria Island'
  );
  v_event_id := (v_event_res->>'id')::uuid;

  -- Create pending payment
  insert into public.payments (
    event_id,
    user_id,
    paystack_reference,
    amount_kobo,
    status
  ) values (
    v_event_id,
    v_owner,
    v_ref,
    5000000,
    'pending'
  );

  -- Create team invitations
  v_invite := public.invite_team_member(v_event_id, 'legit_p7@owambe.ng', 'couple');
  v_unconfirmed_invite := public.invite_team_member(v_event_id, 'unconfirmed_p7@owambe.ng', 'staff');

  insert into _test_p7_data values (
    v_owner,
    v_imposter,
    v_unconfirmed,
    v_valid_invitee,
    v_event_id,
    v_ref,
    v_invite->>'token',
    v_unconfirmed_invite->>'token'
  );
end $$;

-- 4. Negative: Calling record_successful_payment as non-service_role fails
select throws_matching(
  $$
    select set_config('request.jwt.claim.role', 'authenticated', true);
    select set_config('request.jwt.claim.sub', (select owner_id::text from _test_p7_data), true);
    select public.record_successful_payment(
      (select payment_ref from _test_p7_data),
      '{"status": "success", "channel": "card"}'::jsonb
    );
  $$,
  'permission denied|Not permitted',
  'Calling record_successful_payment as authenticated fails'
);

-- 5. Positive: Calling record_successful_payment as service_role succeeds and is idempotent
do $$
declare
  v_res1 jsonb;
  v_res2 jsonb;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  v_res1 := public.record_successful_payment(
    (select payment_ref from _test_p7_data),
    '{"status": "success", "channel": "card"}'::jsonb
  );

  -- Idempotent second call
  v_res2 := public.record_successful_payment(
    (select payment_ref from _test_p7_data),
    '{"status": "success", "channel": "card"}'::jsonb
  );

  if (v_res1->>'success')::boolean is distinct from true or (v_res2->>'already_processed')::boolean is distinct from true then
    raise exception 'service_role payment recording failed or was not idempotent';
  end if;
end $$;

select is(
  (select status from public.payments where paystack_reference = (select payment_ref from _test_p7_data)),
  'success',
  'Payment status is updated to success by service_role and is idempotent'
);

-- 6. Team invite: Different signed-in user cannot accept (INVITE_INVALID)
select throws_matching(
  $$
    select set_config('request.jwt.claim.role', 'authenticated', true);
    select set_config('request.jwt.claim.sub', (select imposter_id::text from _test_p7_data), true);
    select public.accept_team_invite((select invite_token from _test_p7_data));
  $$,
  'Invitation invalid',
  'Different user cannot accept invite for another email'
);

-- 7. Team invite: Unconfirmed email cannot accept (INVITE_INVALID)
select throws_matching(
  $$
    select set_config('request.jwt.claim.role', 'authenticated', true);
    select set_config('request.jwt.claim.sub', (select unconfirmed_id::text from _test_p7_data), true);
    select public.accept_team_invite((select unconfirmed_token from _test_p7_data));
  $$,
  'Invitation invalid',
  'User without confirmed email cannot accept invite'
);

-- 8. Team invite: Legit user with confirmed matching email can accept
do $$
begin
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', (select valid_invitee_id::text from _test_p7_data), true);
  perform public.accept_team_invite((select invite_token from _test_p7_data));
end $$;

select is(
  (select role from public.event_members
   where event_id = (select event_id from _test_p7_data)
     and user_id = (select valid_invitee_id from _test_p7_data)),
  'couple',
  'Legit confirmed invitee accepted invite successfully'
);

-- 9. Free-tier limit on track_invitations_sent directly in database
do $$
declare
  v_unpaid_event uuid;
  v_owner uuid;
  v_guest_ids uuid[] := array[]::uuid[];
  v_gid uuid;
  i integer;
begin
  select owner_id into v_owner from _test_p7_data;
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_owner::text, true);

  -- Create fresh unpaid event
  v_unpaid_event := (public.create_event(
    p_title := 'Unpaid Limit Gala',
    p_couple := 'Amina & Farouk',
    p_date := '2026-12-15 14:00:00+00',
    p_venue := 'Harbour Point',
    p_area := 'Victoria Island'
  )->>'id')::uuid;

  -- Insert 20 guests
  for i in 1..20 loop
    insert into public.guests (event_id, name, email, party_size)
    values (v_unpaid_event, 'Guest ' || i, 'guest' || i || '@owambe.ng', 1)
    returning id into v_gid;
    v_guest_ids := array_append(v_guest_ids, v_gid);
  end loop;

  -- Inviting 20 guests succeeds
  perform public.track_invitations_sent(v_guest_ids);

  -- Insert 21st guest
  insert into public.guests (event_id, name, email, party_size)
  values (v_unpaid_event, 'Guest 21', 'guest21@owambe.ng', 1)
  returning id into v_gid;

  -- Inviting 21st guest on unpaid event must fail with PAYMENT_REQUIRED
  begin
    perform public.track_invitations_sent(array[v_gid]);
    raise exception 'Expected PAYMENT_REQUIRED exception but none was thrown';
  exception when others then
    if sqlerrm !~* 'Free tier limit reached' then
      raise exception 'Unexpected error: %', sqlerrm;
    end if;
  end;
end $$;

select pass('Directly calling track_invitations_sent past 20 guests fails on unpaid event with PAYMENT_REQUIRED');

select * from finish();
rollback;

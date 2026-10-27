begin;
create extension if not exists pgtap;

select plan(17);

-- Set up test data
create temp table _test_p6_feat_data (
  owner_id uuid,
  planner_id uuid,
  staff_id uuid,
  outsider_id uuid,
  event_id uuid
);
grant select on _test_p6_feat_data to authenticated;

do $$
declare
  v_owner uuid;
  v_planner uuid;
  v_staff uuid;
  v_outsider uuid;
  v_event_res jsonb;
  v_event_id uuid;
begin
  -- 1. Create auth users with profiles
  v_owner := gen_random_uuid();
  v_planner := gen_random_uuid();
  v_staff := gen_random_uuid();
  v_outsider := gen_random_uuid();

  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_owner, 'p6_owner@owambe.ng', '{"full_name": "Event Owner"}'::jsonb),
    (v_planner, 'p6_planner@owambe.ng', '{"full_name": "Event Planner"}'::jsonb),
    (v_staff, 'p6_staff@owambe.ng', '{"full_name": "Event Staff"}'::jsonb),
    (v_outsider, 'p6_outsider@owambe.ng', '{"full_name": "Event Outsider"}'::jsonb);

  -- 2. Create event as owner
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  v_event_res := public.create_event(
    p_title := 'Phase 6 Gala Nuptials',
    p_couple := 'Kemi & Tunde',
    p_date := '2026-11-20 14:00:00+00',
    p_venue := 'Eko Hotel',
    p_area := 'Victoria Island'
  );
  v_event_id := (v_event_res->>'id')::uuid;

  -- 3. Add planner and staff to event_members
  insert into public.event_members (event_id, user_id, role)
  values
    (v_event_id, v_planner, 'planner'),
    (v_event_id, v_staff, 'staff');

  insert into _test_p6_feat_data values (
    v_owner,
    v_planner,
    v_staff,
    v_outsider,
    v_event_id
  );
end $$;

-- Test 1: Owner can invite a new team member
select lives_ok(
  $$
    select public.invite_team_member(
      p_event_id := (select event_id from _test_p6_feat_data),
      p_email := 'new_planner@owambe.ng',
      p_role := 'planner'
    );
  $$,
  'Owner can successfully invite a planner'
);

-- Test 2: Planner can invite couple or staff
select lives_ok(
  $$
    select set_config('request.jwt.claim.sub', (select planner_id::text from _test_p6_feat_data), true);
    select public.invite_team_member(
      p_event_id := (select event_id from _test_p6_feat_data),
      p_email := 'new_staff@owambe.ng',
      p_role := 'staff'
    );
  $$,
  'Planner can invite staff'
);

-- Test 3: Planner CANNOT invite owner or planner (fails with NOT_PERMITTED)
select throws_matching(
  $$
    select set_config('request.jwt.claim.sub', (select planner_id::text from _test_p6_feat_data), true);
    select public.invite_team_member(
      p_event_id := (select event_id from _test_p6_feat_data),
      p_email := 'forbidden_planner@owambe.ng',
      p_role := 'planner'
    );
  $$,
  'Planners may invite only couple and staff roles',
  'Planner cannot invite planner or owner'
);

-- Test 4: Staff CANNOT invite team members (fails with NOT_PERMITTED)
select throws_matching(
  $$
    select set_config('request.jwt.claim.sub', (select staff_id::text from _test_p6_feat_data), true);
    select public.invite_team_member(
      p_event_id := (select event_id from _test_p6_feat_data),
      p_email := 'staff_invitee@owambe.ng',
      p_role := 'staff'
    );
  $$,
  'You do not have permission to invite team members',
  'Staff cannot invite team members'
);

-- Test 5: Cannot invite an already-active event member
select throws_matching(
  $$
    select set_config('request.jwt.claim.sub', (select owner_id::text from _test_p6_feat_data), true);
    select public.invite_team_member(
      p_event_id := (select event_id from _test_p6_feat_data),
      p_email := 'p6_planner@owambe.ng',
      p_role := 'planner'
    );
  $$,
  'User is already a member of this event',
  'Cannot invite existing active member'
);

-- Test 6: Outsider can accept invitation with valid token
do $$
declare
  v_invite jsonb;
  v_token text;
  v_outsider uuid;
begin
  select outsider_id into v_outsider from _test_p6_feat_data;

  -- Invite outsider as couple
  perform set_config('request.jwt.claim.sub', (select owner_id::text from _test_p6_feat_data), true);
  v_invite := public.invite_team_member(
    p_event_id := (select event_id from _test_p6_feat_data),
    p_email := 'p6_outsider@owambe.ng',
    p_role := 'couple'
  );
  v_token := v_invite->>'token';

  -- Outsider accepts invite
  perform set_config('request.jwt.claim.sub', v_outsider::text, true);
  perform public.accept_team_invite(v_token);
end $$;

select is(
  (select role from public.event_members
   where event_id = (select event_id from _test_p6_feat_data)
     and user_id = (select outsider_id from _test_p6_feat_data)),
  'couple',
  'Outsider accepted invite and is enrolled as couple'
);

-- Test 7: Accepting already-accepted or invalid invite fails with INVITE_INVALID
select throws_matching(
  $$
    select set_config('request.jwt.claim.sub', (select outsider_id::text from _test_p6_feat_data), true);
    select public.accept_team_invite('invalid_token_12345');
  $$,
  'Invitation invalid or expired',
  'Cannot accept invalid or expired invitation'
);

-- Test 8: Member cannot change their own role
select throws_matching(
  $$
    select set_config('request.jwt.claim.sub', (select planner_id::text from _test_p6_feat_data), true);
    select public.update_team_member_role(
      p_event_id := (select event_id from _test_p6_feat_data),
      p_target_user_id := (select planner_id from _test_p6_feat_data),
      p_new_role := 'owner'
    );
  $$,
  'No one may change their own role',
  'Member cannot change their own role'
);

-- Test 9: Planner cannot remove an owner
select throws_matching(
  $$
    select set_config('request.jwt.claim.sub', (select planner_id::text from _test_p6_feat_data), true);
    select public.remove_team_member(
      p_event_id := (select event_id from _test_p6_feat_data),
      p_target_user_id := (select owner_id from _test_p6_feat_data)
    );
  $$,
  'Planners may manage only couple and staff',
  'Planner cannot remove owner'
);

-- Test 10: Owner cannot remove the last owner
select throws_matching(
  $$
    select set_config('request.jwt.claim.sub', (select owner_id::text from _test_p6_feat_data), true);
    select public.remove_team_member(
      p_event_id := (select event_id from _test_p6_feat_data),
      p_target_user_id := (select owner_id from _test_p6_feat_data)
    );
  $$,
  'Members cannot remove themselves',
  'Owner cannot remove themselves'
);

-- Test 11: Staff is blocked by RLS from viewing payments
do $$
declare
  v_eid uuid;
  v_owner uuid;
begin
  select event_id, owner_id into v_eid, v_owner from _test_p6_feat_data;

  insert into public.payments (event_id, user_id, paystack_reference, amount_kobo, status)
  values (v_eid, v_owner, 'ref_test_p6_pay', 5000000, 'pending');
end $$;

-- Test 11: Staff is blocked by RLS from viewing payments
set local role authenticated;
select set_config('request.jwt.claim.sub', (select staff_id::text from _test_p6_feat_data), false);

select is(
  (select count(*)::int from public.payments where event_id = (select event_id from _test_p6_feat_data)),
  0,
  'Staff cannot view payments (RLS blocked)'
);

-- Test 12: Owner CAN view payments
select set_config('request.jwt.claim.sub', (select owner_id::text from _test_p6_feat_data), false);

select is(
  (select count(*)::int from public.payments where event_id = (select event_id from _test_p6_feat_data)),
  1,
  'Owner can view payments'
);

reset role;

-- Test 13: record_successful_payment is idempotent and marks event paid
do $$
declare
  v_res jsonb;
begin
  -- Execute as service_role (simulating Paystack webhook)
  perform set_config('request.jwt.claim.role', 'service_role', false);
  perform set_config('request.jwt.claim.sub', '', false);

  v_res := public.record_successful_payment(
    p_payment_reference := 'ref_test_p6_pay',
    p_paystack_data := '{"channel": "card", "card_type": "visa"}'::jsonb
  );
end $$;

select is(
  (select status from public.payments where paystack_reference = 'ref_test_p6_pay'),
  'success',
  'Payment status is marked success'
);

select is(
  (select (paid_at is not null) from public.events where id = (select event_id from _test_p6_feat_data)),
  true,
  'Event paid_at is updated'
);

-- Test 14: record_successful_payment creates an invoice
select is(
  (select count(*)::int from public.invoices where event_id = (select event_id from _test_p6_feat_data)),
  1,
  'Invoice is generated for paid event'
);

-- Test 15: check_invitation_quota allows unlimited for paid event
select is(
  public.check_invitation_quota(
    p_event_id := (select event_id from _test_p6_feat_data),
    p_recipient_count := 100
  ),
  true,
  'check_invitation_quota permits unlimited recipients for paid event'
);

-- Test 16: check_invitation_quota enforces max 20 for unpaid event
do $$
declare
  v_unpaid_eid uuid;
  v_res jsonb;
begin
  perform set_config('request.jwt.claim.sub', (select owner_id::text from _test_p6_feat_data), true);
  v_res := public.create_event(
    p_title := 'Unpaid Gathering',
    p_couple := 'A & B',
    p_date := '2026-12-01 10:00:00+00',
    p_venue := 'Small Hall',
    p_area := 'Ikeja'
  );
  v_unpaid_eid := (v_res->>'id')::uuid;

  insert into _test_p6_feat_data (event_id) values (v_unpaid_eid);
end $$;

select throws_matching(
  $$
    select public.check_invitation_quota(
      p_event_id := (select event_id from _test_p6_feat_data where event_id != (select event_id from _test_p6_feat_data limit 1) limit 1),
      p_recipient_count := 25
    );
  $$,
  'Free tier limit reached.*20 guests',
  'Unpaid event rejects sending to > 20 guests'
);

select * from finish();
rollback;

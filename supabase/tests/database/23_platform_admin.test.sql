begin;
create extension if not exists pgtap;

select plan(30);

create temp table t (admin_id uuid, host_id uuid, cohost_id uuid, outsider_id uuid,
                     solo_event uuid, shared_event uuid, payment_id uuid);
grant select on t to authenticated, anon, service_role;

do $$
declare
  v_admin uuid := gen_random_uuid();
  v_host uuid := gen_random_uuid();
  v_cohost uuid := gen_random_uuid();
  v_out uuid := gen_random_uuid();
  v_solo uuid := gen_random_uuid();
  v_shared uuid := gen_random_uuid();
  v_pay uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values
    (v_admin, 'admin@ariya.test'), (v_host, 'host@ariya.test'),
    (v_cohost, 'cohost@ariya.test'), (v_out, 'outsider@ariya.test');
  insert into public.platform_admins (user_id) values (v_admin);
  insert into public.events (id, slug, title, couple, date, venue, status) values
    (v_solo, 'admin-solo', 'Solo Gala', 'A & B', now() + interval '30 days', 'Hall', 'active'),
    (v_shared, 'admin-shared', 'Shared Gala', 'C & D', now() + interval '30 days', 'Hall', 'active');
  insert into public.event_members (event_id, user_id, role) values
    (v_solo, v_host, 'owner'), (v_shared, v_host, 'owner'), (v_shared, v_cohost, 'owner');
  insert into auth.sessions (id, user_id) values (gen_random_uuid(), v_host), (gen_random_uuid(), v_host);
  insert into public.payments (id, event_id, user_id, paystack_reference, amount_kobo, status, paid_at)
  values (v_pay, v_shared, v_host, 'ADMIN-TEST-REF', 5000000, 'success', now());
  update public.events set paid_at = now() where id = v_shared;
  insert into t values (v_admin, v_host, v_cohost, v_out, v_solo, v_shared, v_pay);
end $$;

-- ---------------------------------------------------------------------------
-- Nothing is reachable without the service-role key
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_id from t), 'role', 'authenticated')::text, true);

select throws_ok($$ select * from public.platform_admins $$, '42501', null,
  'even an admin cannot read platform_admins with their own session');
select throws_ok($$ select * from public.admin_audit_log $$, '42501', null,
  'nor the admin log');
select throws_ok($$ select public.is_platform_admin(auth.uid()) $$, '42501', null,
  'nor ask who is an admin');
select throws_ok(
  $$ select public.admin_grant_comp_pass((select solo_event from t), (select admin_id from t), 'a reason') $$,
  '42501', null, 'nor run an admin action');
reset role;

set local role anon;
select throws_ok($$ select public.admin_end_sessions(gen_random_uuid(), gen_random_uuid(), 'x') $$,
  '42501', null, 'anon cannot call admin functions');
reset role;

-- ---------------------------------------------------------------------------
-- The server (service role) acting for an admin
-- ---------------------------------------------------------------------------
set local role service_role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

select ok(public.is_platform_admin((select admin_id from t)), 'an admin is recognised');
select ok(not public.is_platform_admin((select host_id from t)), 'a host is not an admin');

select throws_ok(
  $$ insert into public.platform_admins (user_id) values ((select host_id from t)) $$,
  '42501', null, 'the server cannot make new admins');

select throws_like(
  $$ select public.admin_grant_comp_pass((select solo_event from t), (select host_id from t), 'friend') $$,
  '%Not an admin%', 'a non-admin id is refused');
select throws_like(
  $$ select public.admin_grant_comp_pass((select solo_event from t), (select admin_id from t), ' ') $$,
  '%reason%', 'an action needs a reason');

-- Complimentary pass
select is(
  (public.admin_grant_comp_pass((select solo_event from t), (select admin_id from t), 'Partner launch')
    ->> 'reference') like 'COMP-%',
  true, 'a complimentary pass gets a COMP reference');
select isnt((select paid_at from public.events where id = (select solo_event from t)), null,
  'the celebration is unlocked');
select is((select amount_kobo from public.payments
           where event_id = (select solo_event from t) and channel = 'complimentary'), 0::bigint,
  'the pass is recorded as a ₦0 payment');
select is((select status from public.invoices where event_id = (select solo_event from t)), 'paid',
  'with a paid invoice');
select throws_like(
  $$ select public.admin_grant_comp_pass((select solo_event from t), (select admin_id from t), 'again') $$,
  '%already has a pass%', 'a second pass is refused');

-- Refund
select is(
  (public.admin_record_refund((select payment_id from t), (select admin_id from t), 'Wedding called off',
     '{"id": 1}'::jsonb) ->> 'pass_removed')::boolean,
  true, 'refunding the only payment removes the pass');
select is((select status from public.payments where id = (select payment_id from t)), 'refunded',
  'the payment is marked refunded');
select is((select paid_at from public.events where id = (select shared_event from t)), null,
  'the celebration is locked again');
select throws_like(
  $$ select public.admin_record_refund((select payment_id from t), (select admin_id from t), 'twice') $$,
  '%Only a successful payment%', 'a payment cannot be refunded twice');

-- Sign out everywhere
select is(public.admin_end_sessions((select host_id from t), (select admin_id from t), 'Lost phone'),
  2, 'every session of the account is ended');

-- Delete an account: the celebration it alone owns goes, the shared one stays
select is(
  (public.admin_prepare_account_deletion((select host_id from t), (select admin_id from t),
     'Asked to close account') ->> 'celebrations_deleted')::int,
  1, 'only the celebration nobody else owns is deleted');
select ok(exists (select 1 from public.events where id = (select shared_event from t)),
  'a celebration with another owner is kept');
select throws_like(
  $$ select public.admin_prepare_account_deletion((select admin_id from t), (select admin_id from t), 'oops') $$,
  '%own account%', 'an admin cannot delete themselves here');

-- The log
select is(
  (select array_agg(action order by id) from public.admin_audit_log),
  array['grant_comp_pass', 'refund_payment', 'sign_out_everywhere', 'delete_account'],
  'every action is in the log, in order');
select throws_ok($$ delete from public.admin_audit_log $$, '42501', null,
  'the log cannot be emptied, even by the server');

-- AI connections
reset role;
do $$
declare
  v_client uuid := gen_random_uuid();
begin
  insert into auth.oauth_clients (id, registration_type, redirect_uris, grant_types, client_name,
                                  token_endpoint_auth_method)
  values (v_client, 'dynamic', 'https://claude.ai/api/mcp/auth_callback', 'authorization_code',
          'Claude', 'none');
  insert into auth.oauth_consents (id, user_id, client_id, scopes)
  values ('11111111-1111-4111-8111-111111111111', (select cohost_id from t), v_client, 'openid');
  insert into auth.sessions (id, user_id, oauth_client_id)
  values (gen_random_uuid(), (select cohost_id from t), v_client);
end $$;
set local role service_role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

select is((select client_name from public.admin_ai_connections(10) limit 1), 'Claude',
  'connected apps are listed with their name');
select lives_ok(
  $$ select public.admin_revoke_ai_connection('11111111-1111-4111-8111-111111111111',
       (select admin_id from t), 'Suspicious activity') $$,
  'an admin can disconnect an app');
select isnt((select revoked_at from public.admin_ai_connections(10) limit 1), null,
  'the connection is marked revoked');
reset role;
select is((select count(*)::int from auth.sessions where user_id = (select cohost_id from t)), 0,
  'and the app''s sessions for that account are ended');
set local role service_role;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

select ok(public.admin_health() ? 'last_digest', 'the health summary reports the digest');

reset role;

select * from finish();
rollback;

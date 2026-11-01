begin;
create extension if not exists pgtap;

select plan(31);

-- ============================================================================
-- Fixture
--
-- One host with two celebrations, one other account, and three connections:
--   client-propose : no settings row (every celebration, read-write)
--   client-scoped  : limited to celebration A
--   client-ro      : read-only
--
-- Whether a token is an app token is decided entirely by the client_id claim, so each section
-- switches identity by setting request.jwt.claims and then taking the authenticated role.
-- ============================================================================

create temp table lp (
  host uuid,
  other_user uuid,
  event_a uuid,
  event_b uuid
);
grant select on lp to authenticated, anon, service_role;

do $$
declare
  v_host uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_a uuid;
  v_b uuid;
begin
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
    (v_host, 'proposal-host@approvals.test', '{"full_name": "Proposal Host"}'::jsonb, now()),
    (v_other, 'proposal-other@approvals.test', '{"full_name": "Proposal Other"}'::jsonb, now());

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_host, 'role', 'authenticated')::text, true);

  v_a := (public.create_event(
    p_title := 'Proposal A', p_couple := 'A & B', p_date := now() + interval '30 days',
    p_venue := 'Hall A', p_area := 'Victoria Island')->>'id')::uuid;
  v_b := (public.create_event(
    p_title := 'Proposal B', p_couple := 'C & D', p_date := now() + interval '30 days',
    p_venue := 'Hall B', p_area := 'Ikoyi')->>'id')::uuid;

  insert into public.ai_connection_settings (user_id, client_id, event_ids, read_only)
  values (v_host, 'client-scoped', array[v_a], false),
         (v_host, 'client-ro', null, true);

  insert into lp values (v_host, v_other, v_a, v_b);
end $$;

-- ============================================================================
-- 1. WHAT AN APP TOKEN MAY INSERT
-- ============================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-propose')::text, true);
set local role authenticated;

do $$
declare
  v_id uuid;
begin
  insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary, payload)
  select host, event_a, 'client-propose', 'send_invitations',
         'Send invitations to 3 guests', '3 guests would be emailed.',
         '{"guestIds": [], "note": "Please come"}'::jsonb
  from lp
  returning id into v_id;

  perform set_config('lp.proposal', v_id::text, true);
end $$;

select is(
  (select count(*)::integer from public.ai_proposals
   where id = current_setting('lp.proposal')::uuid and status = 'pending'),
  1,
  'an app token inserts a pending proposal for its own celebration');

select throws_ok(
  $$ insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
     select host, event_a, 'client-propose', 'delete_everything', 'Nope', 'Nope' from lp $$,
  '23514', null,
  'a kind outside the four allowed values is refused by the check constraint');

select throws_ok(
  $$ insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
     select other_user, event_a, 'client-propose', 'send_reminders', 'Forged', 'Forged' from lp $$,
  '42501', null,
  'an app token cannot raise a proposal in another account''s name');

select throws_ok(
  $$ insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
     select host, event_a, 'client-forged', 'send_reminders', 'Forged', 'Forged' from lp $$,
  '42501', null,
  'an app token cannot claim another client_id');

select throws_ok(
  $$ insert into public.ai_proposals
       (user_id, event_id, client_id, kind, title, summary, status, decided_at)
     select host, event_a, 'client-propose', 'send_reminders', 'Not pending', 'Not pending',
            'approved', now()
     from lp
     returning id $$,
  '42501', null,
  'a proposal cannot be inserted with any status but pending');

reset role;

-- Scoped connection: allowed inside its scope, refused outside it.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-scoped')::text, true);
set local role authenticated;

select throws_ok(
  $$ insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
     select host, event_b, 'client-scoped', 'send_reminders', 'Wrong hall', 'Wrong hall' from lp $$,
  '42501', null,
  'a scoped app token cannot raise a proposal for a celebration it was not given');

reset role;

-- Read-only connection: no proposals at all.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-ro')::text, true);
set local role authenticated;

select throws_ok(
  $$ insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
     select host, event_a, 'client-ro', 'send_reminders', 'Read only', 'Read only' from lp $$,
  '42501', null,
  'a read-only connection cannot raise a proposal');

reset role;

-- The host's own browser cannot insert directly either.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok(
  $$ insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
     select host, event_a, 'client-propose', 'send_invitations', 'First party', 'First party' from lp $$,
  '42501', null,
  'a first-party session cannot insert a proposal at all');

-- ============================================================================
-- 2. NO UPDATE, NO DELETE, FOR ANYONE BUT THE OWNER ROLE
-- ============================================================================

select throws_ok(
  format($$ update public.ai_proposals set status = 'approved' where id = %L $$,
         current_setting('lp.proposal')),
  '42501', null,
  'a first-party session cannot move a proposal by updating the row');

select throws_ok(
  format($$ delete from public.ai_proposals where id = %L $$,
         current_setting('lp.proposal')),
  '42501', null,
  'a first-party session cannot delete a proposal');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-propose')::text, true);
set local role authenticated;

select throws_ok(
  format($$ update public.ai_proposals set status = 'approved' where id = %L $$,
         current_setting('lp.proposal')),
  '42501', null,
  'an app token cannot approve its own proposal by updating the row');

select throws_ok(
  format($$ delete from public.ai_proposals where id = %L $$,
         current_setting('lp.proposal')),
  '42501', null,
  'an app token cannot delete a proposal');

-- ============================================================================
-- 3. DECIDING: FIRST-PARTY, ONCE, BEFORE IT EXPIRES
-- ============================================================================

select throws_ok(
  format($$ select public.decide_ai_proposal(%L, 'approve') $$, current_setting('lp.proposal')),
  '42501', 'Connected AI apps cannot approve or reject proposals. Only you can, in Àríyá.',
  'an app token cannot decide a proposal');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select public.decide_ai_proposal(current_setting('lp.proposal')::uuid, 'approve') ->> 'status'),
  'approved',
  'the owner approves a pending proposal');

select throws_ok(
  format($$ select public.decide_ai_proposal(%L, 'approve') $$, current_setting('lp.proposal')),
  'P0001', 'That proposal is no longer waiting for you.',
  'a second approval of the same proposal is refused');

reset role;

-- Another account can neither see nor decide it.
select set_config('request.jwt.claims',
  json_build_object('sub', (select other_user from lp), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select count(*)::integer from public.ai_proposals
   where id = current_setting('lp.proposal')::uuid),
  0,
  'another account cannot see the proposal');

select throws_ok(
  format($$ select public.decide_ai_proposal(%L, 'approve') $$, current_setting('lp.proposal')),
  'P0001', 'That proposal is no longer waiting for you.',
  'another account cannot decide the proposal');

reset role;

-- An expired proposal cannot be approved, and saying so records the expiry.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-propose')::text, true);
set local role authenticated;

do $$
declare
  v_id uuid;
begin
  insert into public.ai_proposals (
    user_id, event_id, client_id, kind, title, summary, expires_at
  )
  select host, event_a, 'client-propose', 'send_reminders',
         'Overdue reminder', 'Overdue reminder', now() - interval '1 day'
  from lp
  returning id into v_id;

  perform set_config('lp.expired', v_id::text, true);
end $$;

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  public.decide_ai_proposal(current_setting('lp.expired')::uuid, 'approve') ->> 'decided',
  'false',
  'an expired proposal cannot be approved');

reset role;

select is(
  (select status from public.ai_proposals where id = current_setting('lp.expired')::uuid),
  'expired',
  'the refused approval leaves the overdue proposal marked expired');

-- Finishing: applied once, and only from approved.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select public.record_ai_proposal_result(
     current_setting('lp.proposal')::uuid, 'applied', '{"sent": 3}'::jsonb) ->> 'status'),
  'applied',
  'the owner records that an approved proposal was applied');

select throws_ok(
  format($$ select public.record_ai_proposal_result(%L, 'applied', '{}'::jsonb) $$,
         current_setting('lp.proposal')),
  'P0001', 'That proposal is not waiting to be applied.',
  'a result cannot be recorded twice');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-propose')::text, true);
set local role authenticated;

select throws_ok(
  format($$ select public.record_ai_proposal_result(%L, 'applied', '{}'::jsonb) $$,
         current_setting('lp.proposal')),
  '42501', 'Connected AI apps cannot record what happened to a proposal.',
  'an app token cannot record a result');

reset role;

-- ============================================================================
-- 4. QUOTA AND THE PENDING CEILING
-- ============================================================================

insert into public.ai_quota_usage (user_id, key, day, used)
select host, 'proposals', (timezone('utc', now()))::date, 50 from lp
on conflict (user_id, key, day) do update set used = excluded.used;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-propose')::text, true);
set local role authenticated;

select throws_ok(
  $$ insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
     select host, event_a, 'client-propose', 'send_reminders', 'Past quota', 'Past quota' from lp $$,
  'P0001', 'Daily limit reached: this connection can raise 50 proposals a day. Try again tomorrow.',
  'a fifty-first proposal in a day is refused by the quota');

reset role;

-- Twenty pending proposals for the host fill the queue. Inserted as the host's own session, which
-- is what lets them bypass the RLS rule above; the quota trigger short-circuits for first-party.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated')::text, true);

insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
select host, event_a, 'client-propose', 'send_reminders', 'Queued ' || q.n, 'Queued ' || q.n
from lp, generate_series(1, 20) as q(n);

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-propose')::text, true);
set local role authenticated;

select throws_ok(
  $$ insert into public.ai_proposals (user_id, event_id, client_id, kind, title, summary)
     select host, event_a, 'client-propose', 'send_reminders', 'One more', 'One more' from lp $$,
  'P0001', 'You already have 20 proposals waiting for approval. Decide some in Àríyá before asking for more.',
  'a twenty-first pending proposal is refused until the host decides some');

reset role;

-- ============================================================================
-- 5. GRANTS AND THE ACTIVITY LOG
-- ============================================================================

select is(has_table_privilege('authenticated', 'public.ai_proposals', 'select'), true,
  'authenticated can read proposals (RLS scopes them to the owner)');
select is(has_table_privilege('authenticated', 'public.ai_proposals', 'insert'), true,
  'authenticated can insert proposals (RLS restricts it to app tokens)');
select is(has_table_privilege('authenticated', 'public.ai_proposals', 'update'), false,
  'authenticated has no UPDATE grant on proposals');
select is(has_table_privilege('authenticated', 'public.ai_proposals', 'delete'), false,
  'authenticated has no DELETE grant on proposals');
select is(has_table_privilege('anon', 'public.ai_proposals', 'select'), false,
  'anon cannot read proposals');

select has_column('public', 'ai_activity_log', 'note',
  'the activity log carries a short note column');

-- A 'denied' outcome is now a legal log row, and only for the client that owns it.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lp), 'role', 'authenticated',
                    'client_id', 'client-propose')::text, true);
set local role authenticated;

do $$
declare
  v_rows integer;
begin
  insert into public.ai_activity_log (user_id, client_id, tool, event_id, outcome, note)
  select host, 'client-propose', 'propose_send_reminders', event_a, 'denied', 'read_only'
  from lp;

  get diagnostics v_rows = row_count;
  perform set_config('lp.rows', v_rows::text, true);
end $$;

select is(current_setting('lp.rows')::integer, 1,
  'a denied call is written to the activity log with a short note');

select * from finish();
rollback;

begin;
create extension if not exists pgtap;

select plan(47);

-- ============================================================================
-- Fixture
--
-- One host with two celebrations, four identities and three kinds of connection:
--   client-lockdown : no settings row (the pre-migration default: every celebration, read-write)
--   client-scoped   : limited to celebration A
--   client-ro       : read-only
--
-- A token is an app token purely because auth.jwt() carries a client_id claim, so switching
-- between first-party and app sessions below is a matter of setting request.jwt.claims.
-- ============================================================================

create temp table lk (
  host uuid,
  invitee uuid,
  imposter uuid,
  unconfirmed uuid,
  event_a uuid,
  event_b uuid,
  guest_deletable uuid,
  guest_stable uuid,
  invite_token text,
  unconfirmed_token text
);
grant select on lk to authenticated, anon, service_role;

do $$
declare
  v_host uuid := gen_random_uuid();
  v_invitee uuid := gen_random_uuid();
  v_imposter uuid := gen_random_uuid();
  v_unconfirmed uuid := gen_random_uuid();
  v_a uuid;
  v_b uuid;
  v_del uuid;
  v_invite text;
  v_invite_unc text;
  i integer;
begin
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
    (v_host, 'host@lockdown.test', '{"full_name": "Lockdown Host"}'::jsonb, now()),
    (v_invitee, 'invitee@lockdown.test', '{"full_name": "Lockdown Invitee"}'::jsonb, now()),
    (v_imposter, 'imposter@lockdown.test', '{"full_name": "Lockdown Imposter"}'::jsonb, now()),
    (v_unconfirmed, 'unconfirmed@lockdown.test', '{"full_name": "Lockdown Unconfirmed"}'::jsonb, null);

  -- Host acts first-party while building the fixture.
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_host, 'role', 'authenticated')::text, true);

  v_a := (public.create_event(
    p_title := 'Lockdown A', p_couple := 'A & B', p_date := now() + interval '30 days',
    p_venue := 'Hall A', p_area := 'Victoria Island')->>'id')::uuid;
  v_b := (public.create_event(
    p_title := 'Lockdown B', p_couple := 'C & D', p_date := now() + interval '30 days',
    p_venue := 'Hall B', p_area := 'Ikoyi')->>'id')::uuid;

  insert into public.guests (event_id, name, party_size) values (v_a, 'Deletable', 1)
    returning id into v_del;
  insert into public.guests (event_id, name, party_size) values (v_a, 'Stable', 1);
  insert into public.guests (event_id, name, party_size) values (v_a, 'Stable Two', 1);

  -- 21 uninvited guests on B exist to exercise the free-tier ceiling.
  for i in 1..21 loop
    insert into public.guests (event_id, name, party_size)
    values (v_b, 'Quota Guest ' || i, 1);
  end loop;

  insert into public.event_invites (event_id, email, role, token, invited_by, expires_at)
  values (v_a, 'invitee@lockdown.test', 'couple', 'lk-ok-' || gen_random_uuid(), v_host, now() + interval '7 days')
  returning token into v_invite;
  insert into public.event_invites (event_id, email, role, token, invited_by, expires_at)
  values (v_a, 'unconfirmed@lockdown.test', 'staff', 'lk-unc-' || gen_random_uuid(), v_host, now() + interval '7 days')
  returning token into v_invite_unc;

  insert into public.ai_connection_settings (user_id, client_id, event_ids, read_only)
  values (v_host, 'client-scoped', array[v_a], false),
         (v_host, 'client-ro', null, true);

  insert into lk values (v_host, v_invitee, v_imposter, v_unconfirmed, v_a, v_b, v_del, v_del, v_invite, v_invite_unc);
end $$;

-- ============================================================================
-- 1. PER-CELEBRATION SCOPE
-- ============================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated', 'client_id', 'client-scoped')::text, true);
set local role authenticated;

select is(public.has_event_role((select event_b from lk), array['owner']), false,
  'scoped app token has no role on a celebration outside its scope');

select is(public.has_event_role((select event_a from lk), array['owner']), true,
  'scoped app token keeps its role on a celebration inside its scope');

select is((select count(*)::integer from public.guests where event_id = (select event_a from lk)), 3,
  'scoped app token reads every guest of the celebration inside its scope');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*)::integer from public.guests), 24,
  'first-party session still reads guests across both celebrations');

reset role;

-- ============================================================================
-- 2. READ-ONLY SWITCH
-- ============================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated', 'client_id', 'client-ro')::text, true);
set local role authenticated;

select throws_ok(
  $$ insert into public.guests (event_id, name, party_size)
     select event_a, 'Read-only guest', 1 from lk $$,
  '42501', null,
  'read-only app token cannot insert a guest');

do $$ declare n integer; begin
  update public.events set title = 'Hijacked' where id = (select event_a from lk);
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 0,
  'read-only app token cannot update a celebration');

reset role;

select is((select title from public.events where id = (select event_a from lk)), 'Lockdown A',
  'read-only app token left the celebration title untouched');

-- ============================================================================
-- 3. ACCEPT_TEAM_INVITE STILL PROVES IDENTITY
-- ============================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', (select imposter from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok(
  format('select public.accept_team_invite(%L)', (select invite_token from lk)),
  'P0001', 'Invitation invalid for current user or email not confirmed',
  'a different signed-in user cannot accept an invite addressed to someone else');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select unconfirmed from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

select throws_ok(
  format('select public.accept_team_invite(%L)', (select unconfirmed_token from lk)),
  'P0001', 'Invitation invalid for current user or email not confirmed',
  'an unconfirmed email cannot accept an invite');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select invitee from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select public.accept_team_invite((select invite_token from lk)) ->> 'role'),
  'couple',
  'the confirmed addressee accepts the invite and joins with the invited role');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated', 'client_id', 'client-lockdown')::text, true);
set local role authenticated;

select throws_ok(
  format('select public.invite_team_member(%L, %L, %L)',
         (select event_a from lk), 'newcomer@lockdown.test', 'staff'),
  '42501', 'Connected AI apps cannot change team members or roles.',
  'an app token cannot invite team members');

reset role;

-- ============================================================================
-- 4. TRACK_INVITATIONS_SENT KEEPS THE FREE-TIER CEILING
-- ============================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

select is(
  (select public.track_invitations_sent(array_agg(id))
   from public.guests where event_id = (select event_b from lk)
     and name <> 'Quota Guest 21'),
  20,
  'first-party session invites the first twenty guests on an unpaid celebration');

select throws_ok(
  format('select public.track_invitations_sent(%L::uuid[])',
         (select array_agg(id)::text from public.guests
          where event_id = (select event_b from lk) and name = 'Quota Guest 21')),
  'P0001', null,
  'the twenty-first invitation on an unpaid celebration is refused');

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated', 'client_id', 'client-ro')::text, true);
set local role authenticated;

select throws_ok(
  format('select public.track_invitations_sent(%L::uuid[])',
         (select array_agg(id)::text from public.guests
          where event_id = (select event_a from lk) and name = 'Stable')),
  '42501', null,
  'read-only app token is refused by the write guard before the quota is touched');

reset role;

-- ============================================================================
-- 5. RESTRICTIVE POLICIES: APP TOKEN REFUSED, FIRST-PARTY ALLOWED
-- ============================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated', 'client_id', 'client-lockdown')::text, true);
set local role authenticated;

do $$ declare n integer; begin
  delete from public.guests where id = (select guest_deletable from lk);
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 0,
  'app token deletes no guest rows');

do $$ declare n integer; begin
  delete from public.events where id = (select event_a from lk);
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 0,
  'app token deletes no celebrations');

select throws_ok(
  format('insert into public.event_members (event_id, user_id, role) values (%L, %L, %L)',
         (select event_a from lk), (select imposter from lk), 'staff'),
  '42501', null,
  'app token cannot add a team member');

select throws_ok(
  format('insert into public.payments (event_id, user_id, paystack_reference, amount_kobo, status) values (%L, %L, %L, %L, %L)',
         (select event_a from lk), (select host from lk), 'lk-ref-app', 100000, 'pending'),
  '42501', null,
  'app token cannot write a payment row');

select throws_ok(
  format('insert into public.email_log (event_id, recipient_email, subject, template_type, status, sent_at) values (%L, %L, %L, %L, %L, now())',
         (select event_a from lk), 'guest@lockdown.test', 'Subject', 'invitation', 'sent'),
  '42501', null,
  'app token cannot write an email row');

select throws_ok(
  format('insert into public.events (title, couple, date, venue, slug, status) values (%L, %L, now(), %L, %L, %L)',
         'Direct insert', 'X & Y', 'Somewhere', 'direct-insert-' || gen_random_uuid(), 'active'),
  '42501', null,
  'app token cannot insert a celebration directly');

reset role;

select is((select count(*)::integer from public.guests where id = (select guest_deletable from lk)), 1,
  'the guest the app tried to delete is still present');

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$ declare n integer; begin
  delete from public.guests where id = (select guest_deletable from lk);
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 1,
  'first-party session can still delete the same guest');

do $$ declare n integer; begin
  insert into public.event_members (event_id, user_id, role)
  values ((select event_a from lk), (select imposter from lk), 'staff');
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 1,
  'first-party session can still add a team member');

reset role;

-- payments and email_log never had a permissive INSERT policy for authenticated — only
-- service_role writes them — so the restrictive policies there are defence in depth. Assert the
-- sanctioned writer is untouched rather than pretending a first-party insert was ever allowed.
set local role service_role;

do $$ declare n integer; begin
  insert into public.payments (event_id, user_id, paystack_reference, amount_kobo, status)
  values ((select event_a from lk), (select host from lk), 'lk-ref-service', 100000, 'pending');
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 1,
  'service_role can still write a payment row');

do $$ declare n integer; begin
  insert into public.email_log (event_id, recipient_email, subject, template_type, status, sent_at)
  values ((select event_a from lk), 'guest@lockdown.test', 'Subject', 'invitation', 'sent', now());
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 1,
  'service_role can still write an email row');

reset role;

-- ============================================================================
-- 6. CONSUME_QUOTA: CHECK AND INCREMENT ARE ONE UNIT
--
-- pgTAP runs a single connection, so a genuine interleaving cannot be staged here (a second
-- connection cannot see this transaction's uncommitted fixture rows). What is asserted instead is
-- the property that makes the function safe under concurrency: the limit test and the increment
-- ride on the same statement, so a refused call never leaves a partial increment behind.
-- ============================================================================

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

select set_config('lk.quota', public.consume_quota('lk-quota', 6, 10)::text, true);

select is(current_setting('lk.quota')::jsonb ->> 'used', '6',
  'a permitted call increments the counter by exactly the amount asked for');

-- Six more would reach twelve, past the limit of ten.
select set_config('lk.quota', public.consume_quota('lk-quota', 6, 10)::text, true);

select is((current_setting('lk.quota')::jsonb ->> 'allowed')::boolean, false,
  'a call that would exceed the daily limit is refused');

select is(current_setting('lk.quota')::jsonb ->> 'used', '6',
  'a refused call leaves no partial increment behind');

select set_config('lk.quota', public.consume_quota('lk-quota', 4, 10)::text, true);

select is((current_setting('lk.quota')::jsonb ->> 'allowed')::boolean, true,
  'a call landing exactly on the limit is permitted');

reset role;

select is(has_function_privilege('anon', 'public.consume_quota(text, integer, integer)', 'execute'), false,
  'anon cannot call consume_quota');

-- ============================================================================
-- 7. GRANTS ON THE NEW TABLES
-- ============================================================================

select is(has_table_privilege('authenticated', 'public.ai_activity_log', 'update'), false,
  'authenticated cannot update the activity log');

select is(has_table_privilege('authenticated', 'public.ai_activity_log', 'delete'), false,
  'authenticated cannot delete from the activity log');

select is(
  (select count(*)::integer
   from unnest(array['ai_connection_settings', 'ai_activity_log', 'ai_quota_usage']) as t(name)
   cross join unnest(array['anon', 'authenticated', 'service_role']) as r(grantee)
   where has_table_privilege(r.grantee, 'public.' || t.name, 'truncate')),
  0,
  'no non-owner role holds TRUNCATE on any ai_ table');

select is(
  (select count(*)::integer
   from unnest(array['ai_connection_settings', 'ai_activity_log', 'ai_quota_usage']) as t(name)
   cross join unnest(array['select', 'insert', 'update', 'delete']) as p(priv)
   where has_table_privilege('anon', 'public.' || t.name, p.priv)),
  0,
  'anon holds no privileges on any ai_ table');

select is(
  (select count(*)::integer
   from unnest(array['select', 'insert', 'update', 'delete']) as p(priv)
   where has_table_privilege('authenticated', 'public.ai_quota_usage', p.priv)),
  0,
  'authenticated holds no privileges on the quota ledger');

-- ============================================================================
-- 8. DAILY LIMITS: ENFORCED IN THE DATABASE, APP TOKENS ONLY
--
-- The ledger is seeded to each ceiling rather than by writing five hundred guest rows: what is
-- under test is the charge, not the arithmetic (section 6 covers consume_quota itself).
-- ============================================================================

reset role;

insert into public.ai_quota_usage (user_id, key, day, used)
values
  ((select host from lk), 'create_event', (timezone('utc', now()))::date, 10),
  ((select host from lk), 'guests', (timezone('utc', now()))::date, 500)
on conflict (user_id, key, day) do update set used = excluded.used;

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated', 'client_id', 'client-lockdown')::text, true);
set local role authenticated;

select throws_ok(
  $sql$select public.create_event(
    p_title := 'Over the line', p_couple := 'E & F',
    p_date := now() + interval '30 days', p_venue := 'Hall Z')$sql$,
  'P0001',
  'Daily limit reached: this connection can create 10 celebrations a day. Try again tomorrow.',
  'an app token at its daily ceiling cannot create a celebration through the RPC');

select throws_ok(
  format('insert into public.guests (event_id, name, party_size) values (%L, %L, 1)',
         (select event_a from lk), 'Over the line guest'),
  'P0001',
  'Daily limit reached: this connection can add 500 guests a day. Try again tomorrow.',
  'an app token at its daily ceiling cannot insert a guest directly');

reset role;

-- One under the ceiling still goes through, so the charge is a limit and not a wall.
update public.ai_quota_usage set used = 499
where user_id = (select host from lk) and key = 'guests'
  and day = (timezone('utc', now()))::date;

set local role authenticated;

do $$ declare n integer; begin
  insert into public.guests (event_id, name, party_size)
  values ((select event_a from lk), 'Under the line', 1);
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 1,
  'an app token one guest under the ceiling still adds a guest');

reset role;

select is(
  (select used from public.ai_quota_usage
   where user_id = (select host from lk) and key = 'guests'
     and day = (timezone('utc', now()))::date), 500,
  'the successful insert charged exactly one guest');

-- A first-party session is never charged, so the ceiling does not reach the app itself.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$ declare n integer; begin
  insert into public.guests (event_id, name, party_size)
  values ((select event_a from lk), 'First party over the line', 1);
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 1,
  'a first-party session adds a guest with the app ledger already at its ceiling');

select is(
  (public.create_event(
    p_title := 'First party over the line',
    p_couple := 'G & H',
    p_slug := 'first-party-' || gen_random_uuid()::text,
    p_date := now() + interval '30 days',
    p_venue := 'Hall Y')->>'id') is not null,
  true,
  'a first-party session creates a celebration with the app ledger already at its ceiling');

reset role;

select is(
  (select used from public.ai_quota_usage
   where user_id = (select host from lk) and key = 'guests'
     and day = (timezone('utc', now()))::date), 500,
  'first-party writes are not charged against the app ledger');

-- ============================================================================
-- 9. RSVPS ARE NOT AN APP TOKEN'S TO WRITE
--
-- No tool answers on a guest's behalf. These policies make that true for a token pointed straight
-- at the table, in both directions.
-- ============================================================================

reset role;

insert into public.rsvps (guest_id, status)
values ((select id from public.guests
         where event_id = (select event_a from lk) and name = 'Stable'), 'pending');

select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated', 'client_id', 'client-lockdown')::text, true);
set local role authenticated;

select throws_ok(
  format('insert into public.rsvps (guest_id, status) values (%L, %L)',
         (select id from public.guests
          where event_id = (select event_a from lk) and name = 'Stable Two'), 'accepted'),
  '42501', null,
  'app token cannot insert an rsvp');

do $$ declare n integer; begin
  update public.rsvps set status = 'declined'
  where guest_id = (select id from public.guests
                    where event_id = (select event_a from lk) and name = 'Stable');
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 0,
  'app token updates no rsvp row');

reset role;

select is(
  (select status from public.rsvps
   where guest_id = (select id from public.guests
                     where event_id = (select event_a from lk) and name = 'Stable')), 'pending',
  'the reply the app tried to change is untouched');

-- The host's own session still writes replies; the restrictive policies are keyed off the token.
select set_config('request.jwt.claims',
  json_build_object('sub', (select host from lk), 'role', 'authenticated')::text, true);
set local role authenticated;

do $$ declare n integer; begin
  update public.rsvps set status = 'accepted'
  where guest_id = (select id from public.guests
                    where event_id = (select event_a from lk) and name = 'Stable');
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 1,
  'a first-party session can still update an rsvp');

do $$ declare n integer; begin
  insert into public.rsvps (guest_id, status)
  values ((select id from public.guests
           where event_id = (select event_a from lk) and name = 'Stable Two'), 'accepted');
  get diagnostics n = row_count;
  perform set_config('lk.rows', n::text, true);
end $$;

select is(current_setting('lk.rows')::integer, 1,
  'a first-party session can still insert an rsvp');

reset role;

select * from finish();
rollback;

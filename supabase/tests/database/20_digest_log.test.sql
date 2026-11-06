begin;
create extension if not exists pgtap;

select plan(9);

-- 1. The table exists, is protected, and is readable only by its own person.

select has_table('public', 'digest_log', 'digest_log exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.digest_log'::regclass),
  'digest_log has row level security on'
);

select has_pk('public', 'digest_log', 'digest_log has a primary key, which is what guarantees one a week');

select is_empty(
  $$
    select privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'digest_log' and grantee = 'anon'
  $$,
  'anon has no privileges on digest_log'
);

select is_empty(
  $$
    select privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'digest_log'
      and grantee in ('authenticated', 'service_role')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  $$,
  'only the cron writes digest_log, so no client role may insert, update, delete or truncate'
);

-- 2. One row per person per week, which is the whole point of the table.

create temp table dg (user_id uuid);
grant select on dg to authenticated, anon;

do $$
declare v_dg record;
begin
  insert into dg select gen_random_uuid();
  select * into v_dg from dg;
  insert into auth.users (id, email) values (v_dg.user_id, 'digest-one@test.local');
end $$;

select lives_ok(
  $$ insert into public.digest_log (user_id, week_start)
     values ((select user_id from dg), '2026-11-02') $$,
  'a digest is recorded for a person and a week'
);

select throws_ok(
  $$ insert into public.digest_log (user_id, week_start)
     values ((select user_id from dg), '2026-11-02') $$,
  '23505', null,
  'the same person cannot be sent the same week twice, even by a second run'
);

select lives_ok(
  $$ insert into public.digest_log (user_id, week_start)
     values ((select user_id from dg), '2026-11-09') $$,
  'the following week is a separate digest'
);

-- A signed-in person sees their own weeks.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', user_id::text, 'role', 'authenticated')::text, true) from dg;

select is(
  (select count(*)::int from public.digest_log),
  2,
  'a person reads their own digest history'
);

reset role;

select finish();
rollback;

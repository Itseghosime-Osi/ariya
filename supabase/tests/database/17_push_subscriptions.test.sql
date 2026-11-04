begin;
create extension if not exists pgtap;

select plan(7);

select has_table('public', 'push_subscriptions', 'push_subscriptions exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.push_subscriptions'::regclass),
  'push_subscriptions has row level security on'
);

select is_empty(
  $$
    select privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'push_subscriptions'
      and grantee in ('anon', 'authenticated', 'PUBLIC')
  $$,
  'anon and authenticated have no privileges on push_subscriptions'
);

select set_eq(
  $$
    select privilege_type::text from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'push_subscriptions'
      and grantee = 'service_role'
  $$,
  array['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'service_role may read and write push_subscriptions, nothing more'
);

-- Fixture: one host.
create temp table ps (host uuid);
do $$
declare v_host uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
  values (v_host, 'push-host@push.test', '{"full_name": "Push Host"}'::jsonb, now());
  insert into ps values (v_host);
end $$;

select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ((select host from ps), 'http://insecure.example/push', 'k', 'a') $$,
  '23514',
  null,
  'an endpoint must be https'
);

insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
values ((select host from ps), 'https://push.example/one', 'k', 'a');

select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ((select host from ps), 'https://push.example/one', 'k', 'a') $$,
  '23505',
  null,
  'one row per device endpoint'
);

-- Deleting the account removes its devices.
delete from auth.users where id = (select host from ps);
select is(
  (select count(*)::int from public.push_subscriptions where endpoint = 'https://push.example/one'),
  0,
  'devices go with the account'
);

select * from finish();
rollback;

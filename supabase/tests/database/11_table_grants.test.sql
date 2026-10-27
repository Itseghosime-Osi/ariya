begin;
create extension if not exists pgtap;

select plan(24);

-- 1. Verify authenticated table-level privileges across key tables
select is(
  has_table_privilege('authenticated', 'public.events', 'select'),
  true,
  'authenticated has SELECT privilege on events'
);

select is(
  has_table_privilege('authenticated', 'public.events', 'insert'),
  true,
  'authenticated has INSERT privilege on events'
);

select is(
  has_table_privilege('authenticated', 'public.events', 'update'),
  true,
  'authenticated has UPDATE privilege on events'
);

select is(
  has_table_privilege('authenticated', 'public.events', 'delete'),
  true,
  'authenticated has DELETE privilege on events'
);

select is(
  has_table_privilege('authenticated', 'public.guests', 'select'),
  true,
  'authenticated has SELECT privilege on guests'
);

select is(
  has_table_privilege('authenticated', 'public.guests', 'insert'),
  true,
  'authenticated has INSERT privilege on guests'
);

select is(
  has_table_privilege('authenticated', 'public.guests', 'delete'),
  true,
  'authenticated has DELETE privilege on guests'
);

select is(
  has_table_privilege('authenticated', 'public.profiles', 'select'),
  true,
  'authenticated has SELECT privilege on profiles'
);

select is(
  has_table_privilege('authenticated', 'public.event_members', 'select'),
  true,
  'authenticated has SELECT privilege on event_members'
);

select is(
  has_table_privilege('authenticated', 'public.tables', 'select'),
  true,
  'authenticated has SELECT privilege on tables'
);

select is(
  has_table_privilege('authenticated', 'public.seat_assignments', 'select'),
  true,
  'authenticated has SELECT privilege on seat_assignments'
);

-- 2. Verify rate_limits has NO privileges for anon or authenticated
select is(
  has_table_privilege('authenticated', 'public.rate_limits', 'select'),
  false,
  'authenticated does NOT have SELECT privilege on rate_limits'
);

select is(
  has_table_privilege('anon', 'public.rate_limits', 'select'),
  false,
  'anon does NOT have SELECT privilege on rate_limits'
);

select is(
  has_table_privilege('authenticated', 'public.rate_limits', 'insert'),
  false,
  'authenticated does NOT have INSERT privilege on rate_limits'
);

-- 3. Verify guests table-level update is revoked
select is(
  has_table_privilege('authenticated', 'public.guests', 'update'),
  false,
  'authenticated does NOT have table-level UPDATE privilege on guests'
);

select is(
  has_table_privilege('anon', 'public.guests', 'update'),
  false,
  'anon does NOT have table-level UPDATE privilege on guests'
);

-- 4. Verify specific column privileges on guests
select is(
  has_column_privilege('authenticated', 'public.guests', 'name', 'update'),
  true,
  'authenticated can update guest name'
);

select is(
  has_column_privilege('authenticated', 'public.guests', 'email', 'update'),
  true,
  'authenticated can update guest email'
);

select is(
  has_column_privilege('authenticated', 'public.guests', 'check_in_code', 'update'),
  false,
  'authenticated CANNOT update guest check_in_code'
);

select is(
  has_column_privilege('authenticated', 'public.guests', 'rsvp_token', 'update'),
  false,
  'authenticated CANNOT update guest rsvp_token'
);

select is(
  has_column_privilege('anon', 'public.guests', 'name', 'update'),
  false,
  'anon CANNOT update guest name'
);

select is(
  has_column_privilege('anon', 'public.guests', 'check_in_code', 'update'),
  false,
  'anon CANNOT update guest check_in_code'
);

-- 5. Functional check: anon cannot read guests or rate_limits
-- Insert a test guest as superuser
do $$
declare
  v_owner uuid := gen_random_uuid();
  v_event uuid;
begin
  insert into auth.users (id, email) values (v_owner, 'owner_grants_test@example.com');
  insert into public.profiles (id, email, full_name) values (v_owner, 'owner_grants_test@example.com', 'Test Owner')
  on conflict (id) do update set full_name = 'Test Owner';
  insert into public.events (title, slug, date, couple, venue)
  values ('Grants Test Wedding', 'grants-test-' || substr(gen_random_uuid()::text, 1, 8), now() + interval '10 days', 'Alpha & Beta', 'Grand Ballroom')
  returning id into v_event;

  insert into public.event_members (event_id, user_id, role)
  values (v_event, v_owner, 'owner');

  insert into public.guests (event_id, name, email, rsvp_token)
  values (v_event, 'Secret Guest', 'secret@example.com', 'grants_token_xyz_123');
end;
$$;

set local role anon;

select is_empty(
  $$ select * from public.guests $$,
  'anon cannot read rows from guests table (blocked by RLS)'
);

select throws_ok(
  $$ select * from public.rate_limits $$,
  '42501',
  null,
  'anon query on rate_limits raises permission denied (42501)'
);

reset role;

select * from finish();
rollback;

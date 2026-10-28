begin;
create extension if not exists pgtap;

select plan(24);

-- 1. Verify anon has NO table privileges on any of the 14 public tables
select is_empty(
  $$
    select table_name, privilege_type
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and table_name in (
        'check_ins', 'email_log', 'event_invites', 'event_members',
        'events', 'guests', 'invoices', 'payments', 'profiles',
        'rsvps', 'seat_assignments', 'tables', 'vendor_tasks', 'vendors'
      )
  $$,
  'anon has NO table privileges on any of the 14 public tables'
);

-- 2. Verify authenticated has SELECT, INSERT, DELETE on all 14 tables
select set_eq(
  $$
    select distinct table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  $$,
  $$
    values
      ('check_ins'), ('email_log'), ('event_invites'), ('event_members'),
      ('events'), ('guests'), ('invoices'), ('payments'), ('profiles'),
      ('rsvps'), ('seat_assignments'), ('tables'), ('vendor_tasks'), ('vendors')
  $$,
  'authenticated has SELECT privilege on all 14 tables'
);

select set_eq(
  $$
    select distinct table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'INSERT'
  $$,
  $$
    values
      ('check_ins'), ('email_log'), ('event_invites'), ('event_members'),
      ('events'), ('guests'), ('invoices'), ('payments'), ('profiles'),
      ('rsvps'), ('seat_assignments'), ('tables'), ('vendor_tasks'), ('vendors')
  $$,
  'authenticated has INSERT privilege on all 14 tables'
);

select set_eq(
  $$
    select distinct table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'DELETE'
  $$,
  $$
    values
      ('check_ins'), ('email_log'), ('event_invites'), ('event_members'),
      ('events'), ('guests'), ('invoices'), ('payments'), ('profiles'),
      ('rsvps'), ('seat_assignments'), ('tables'), ('vendor_tasks'), ('vendors')
  $$,
  'authenticated has DELETE privilege on all 14 tables'
);

-- 3. Verify authenticated UPDATE privilege (13 tables at table-level; guests via column-level)
select set_eq(
  $$
    select distinct table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and privilege_type = 'UPDATE'
  $$,
  $$
    values
      ('check_ins'), ('email_log'), ('event_invites'), ('event_members'),
      ('events'), ('invoices'), ('payments'), ('profiles'),
      ('rsvps'), ('seat_assignments'), ('tables'), ('vendor_tasks'), ('vendors')
  $$,
  'authenticated has table-level UPDATE on 13 tables (guests handled via column grants)'
);

-- 4. Verify service_role has SELECT, INSERT, UPDATE, DELETE on all 14 tables PLUS rate_limits
select set_eq(
  $$
    select distinct table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'service_role'
      and privilege_type = 'SELECT'
  $$,
  $$
    values
      ('check_ins'), ('email_log'), ('event_invites'), ('event_members'),
      ('events'), ('guests'), ('invoices'), ('payments'), ('profiles'),
      ('rate_limits'), ('rsvps'), ('seat_assignments'), ('tables'),
      ('vendor_tasks'), ('vendors')
  $$,
  'service_role has SELECT on all 14 tables plus rate_limits'
);

select set_eq(
  $$
    select distinct table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'service_role'
      and privilege_type = 'INSERT'
  $$,
  $$
    values
      ('check_ins'), ('email_log'), ('event_invites'), ('event_members'),
      ('events'), ('guests'), ('invoices'), ('payments'), ('profiles'),
      ('rate_limits'), ('rsvps'), ('seat_assignments'), ('tables'),
      ('vendor_tasks'), ('vendors')
  $$,
  'service_role has INSERT on all 14 tables plus rate_limits'
);

select set_eq(
  $$
    select distinct table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'service_role'
      and privilege_type = 'UPDATE'
  $$,
  $$
    values
      ('check_ins'), ('email_log'), ('event_invites'), ('event_members'),
      ('events'), ('guests'), ('invoices'), ('payments'), ('profiles'),
      ('rate_limits'), ('rsvps'), ('seat_assignments'), ('tables'),
      ('vendor_tasks'), ('vendors')
  $$,
  'service_role has UPDATE on all 14 tables plus rate_limits'
);

select set_eq(
  $$
    select distinct table_name::text
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'service_role'
      and privilege_type = 'DELETE'
  $$,
  $$
    values
      ('check_ins'), ('email_log'), ('event_invites'), ('event_members'),
      ('events'), ('guests'), ('invoices'), ('payments'), ('profiles'),
      ('rate_limits'), ('rsvps'), ('seat_assignments'), ('tables'),
      ('vendor_tasks'), ('vendors')
  $$,
  'service_role has DELETE on all 14 tables plus rate_limits'
);

-- 5. Verify nobody but the table owner has TRUNCATE
select is_empty(
  $$
    select grantee, table_name
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated', 'service_role')
      and privilege_type = 'TRUNCATE'
  $$,
  'Nobody but table owner has TRUNCATE privilege on public tables'
);

-- 6. Verify rate_limits privileges
select is(
  has_table_privilege('anon', 'public.rate_limits', 'select'),
  false,
  'anon does NOT have SELECT on rate_limits'
);

select is(
  has_table_privilege('authenticated', 'public.rate_limits', 'select'),
  false,
  'authenticated does NOT have SELECT on rate_limits'
);

select is(
  has_table_privilege('service_role', 'public.rate_limits', 'select'),
  true,
  'service_role has SELECT on rate_limits'
);

select is(
  has_table_privilege('service_role', 'public.rate_limits', 'insert'),
  true,
  'service_role has INSERT on rate_limits'
);

select is(
  has_table_privilege('service_role', 'public.rate_limits', 'update'),
  true,
  'service_role has UPDATE on rate_limits'
);

select is(
  has_table_privilege('service_role', 'public.rate_limits', 'delete'),
  true,
  'service_role has DELETE on rate_limits'
);

-- 7. Verify guests column privileges for authenticated
select is(
  has_table_privilege('authenticated', 'public.guests', 'update'),
  false,
  'authenticated does NOT have table-level UPDATE privilege on guests'
);

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

-- 8. Functional checks: anon queries fail with permission denied (42501)
set local role anon;

select throws_ok(
  $$ select * from public.events $$,
  '42501',
  null,
  'anon query on events throws permission denied (42501)'
);

select throws_ok(
  $$ select * from public.guests $$,
  '42501',
  null,
  'anon query on guests throws permission denied (42501)'
);

select throws_ok(
  $$ select * from public.rate_limits $$,
  '42501',
  null,
  'anon query on rate_limits throws permission denied (42501)'
);

reset role;

select * from finish();
rollback;

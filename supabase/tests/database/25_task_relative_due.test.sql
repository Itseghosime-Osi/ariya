begin;
create extension if not exists pgtap;

select plan(9);

select has_column('public', 'tasks', 'days_before', 'tasks has days_before');
select has_column('public', 'tasks', 'edited_at', 'tasks has edited_at');

-- Fixture: an event on 12 Dec 2026 at 2 PM Lagos, an owner and a staff member, three tasks:
-- relative (10 days before), fixed (a set date), and relative but deleted.
create temp table rd (owner_id uuid, staff_id uuid, event_id uuid,
                     relative_id uuid, fixed_id uuid, deleted_id uuid);
grant select on rd to authenticated, anon;

do $$
declare v record;
begin
  insert into rd
  select gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
         gen_random_uuid(), gen_random_uuid(), gen_random_uuid();
  select * into v from rd;

  insert into auth.users (id, email)
  values (v.owner_id, 'rd-owner@test.local'), (v.staff_id, 'rd-staff@test.local');

  insert into public.events (id, slug, title, couple, date, venue, status, is_public)
  values (v.event_id, 'rd-event', 'Relative Dates', 'Ada & Femi',
          '2026-12-12 13:00:00+00', 'Lagos Hall', 'active', true);

  insert into public.event_members (event_id, user_id, role)
  values (v.event_id, v.owner_id, 'owner'), (v.event_id, v.staff_id, 'staff');

  insert into public.tasks (id, event_id, title, phase, source, due_date, days_before, owner_id)
  values (v.relative_id, v.event_id, 'Confirm the drummer', 'final', 'manual',
          '2026-12-02', 10, v.staff_id),
         (v.fixed_id, v.event_id, 'Pay the hall', 'book', 'manual', '2026-11-30', null, null);

  insert into public.tasks (id, event_id, title, phase, source, due_date, days_before, deleted_at)
  values (v.deleted_id, v.event_id, 'Old idea', 'detail', 'manual', '2026-12-05', 7, now());
end $$;

select throws_ok(
  $$ update public.tasks set days_before = 1000 where id = (select relative_id from rd) $$,
  '23514', null,
  'days_before is limited to two years before and one year after'
);

-- Move the event a week later, as its owner.
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select owner_id from rd), 'role', 'authenticated')::text, true);

update public.events set date = '2026-12-19 13:00:00+00' where id = (select event_id from rd);

reset role;

select is(
  (select due_date from public.tasks where id = (select relative_id from rd)),
  '2026-12-09'::date,
  'a relative task moves with the event date (10 days before 19 Dec)'
);

select is(
  (select due_date from public.tasks where id = (select fixed_id from rd)),
  '2026-11-30'::date,
  'a fixed-date task stays where it is'
);

select is(
  (select due_date from public.tasks where id = (select deleted_id from rd)),
  '2026-12-05'::date,
  'a deleted task is not moved'
);

-- The day is taken in Lagos time: 23:30 UTC on 19 Dec is already 20 Dec in Lagos.
update public.events set date = '2026-12-19 23:30:00+00' where id = (select event_id from rd);

select is(
  (select due_date from public.tasks where id = (select relative_id from rd)),
  '2026-12-10'::date,
  'the event day is read in Lagos time'
);

-- A staff member may tick their own task, but not change when it is due.
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', (select staff_id from rd), 'role', 'authenticated')::text, true);

select throws_ok(
  $$ update public.tasks set days_before = 3 where id = (select relative_id from rd) $$,
  'P0001', null,
  'a staff member cannot change when their task is due'
);

select lives_ok(
  $$ update public.tasks set status = 'done' where id = (select relative_id from rd) $$,
  'a staff member can still tick their own task'
);

reset role;

select * from finish();
rollback;

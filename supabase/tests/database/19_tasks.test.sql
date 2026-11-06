begin;
create extension if not exists pgtap;

select plan(25);

-- 1. The table and its grants.

select has_table('public', 'tasks', 'tasks exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.tasks'::regclass),
  'tasks has row level security on'
);

select is_empty(
  $$
    select privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'tasks' and grantee = 'anon'
  $$,
  'anon has no privileges on tasks'
);

select is_empty(
  $$
    select privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'tasks'
      and grantee in ('authenticated', 'service_role') and privilege_type = 'TRUNCATE'
  $$,
  'nobody but the owner may truncate tasks, which would bypass RLS'
);

-- 2. Fixture: one live event with an owner, a planner and two assignable members; one past event.

create temp table tk (owner_id uuid, planner_id uuid, couple_id uuid, staff_id uuid,
                     event_id uuid, past_id uuid, mine uuid, theirs uuid);
grant select on tk to authenticated, anon;

do $$
declare v_tk record;
begin
  insert into tk
  select gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
         gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid();

  select * into v_tk from tk;

  insert into auth.users (id, email)
  values (v_tk.owner_id, 'tasks-owner@test.local'),
         (v_tk.planner_id, 'tasks-planner@test.local'),
         (v_tk.couple_id, 'tasks-couple@test.local'),
         (v_tk.staff_id, 'tasks-staff@test.local');

  insert into public.events (id, slug, title, couple, date, venue, status, is_public)
  values (v_tk.event_id, 'tasks-event', 'Tasks Event', 'Ada & Femi',
          now() + interval '30 days', 'Lagos Hall', 'active', true),
         (v_tk.past_id, 'tasks-past', 'Past Event', 'Old & Couple',
          now() + interval '5 days', 'Lagos Hall', 'active', true);

  insert into public.event_members (event_id, user_id, role)
  values (v_tk.event_id, v_tk.owner_id, 'owner'),
         (v_tk.event_id, v_tk.planner_id, 'planner'),
         (v_tk.event_id, v_tk.couple_id, 'couple'),
         (v_tk.event_id, v_tk.staff_id, 'staff'),
         (v_tk.past_id, v_tk.owner_id, 'owner');

  -- Two generated rows, one owned by the couple member and one by the staff member.
  insert into public.tasks (id, event_id, title, phase, owner_id, source, source_key, derivation)
  values (v_tk.mine, v_tk.event_id, 'Book the hall', 'book', v_tk.couple_id,
          'template', 'book.hall', '{"kind":"venue"}'::jsonb),
         (v_tk.theirs, v_tk.event_id, 'Confirm caterer', 'build', v_tk.staff_id,
          'template', 'build.caterer', '{"kind":"guests","count":120}'::jsonb);
end $$;

-- 3. Uniqueness and the check constraints.

select throws_ok(
  $$ insert into public.tasks (event_id, title, phase, source, source_key)
     values ((select event_id from tk), 'Book the hall again', 'book', 'template', 'book.hall') $$,
  '23505', null,
  'a second live row with the same source_key on the same event is rejected'
);

select lives_ok(
  $$ insert into public.tasks (event_id, title, phase)
     values ((select event_id from tk), 'Buy aso-oke', 'detail') $$,
  'a hand-added task needs no source_key'
);

select lives_ok(
  $$ insert into public.tasks (event_id, title, phase)
     values ((select event_id from tk), 'Buy aso-oke', 'detail') $$,
  'two hand-added tasks may share a title, because neither has a key to collide on'
);

select throws_ok(
  $$ insert into public.tasks (event_id, title, phase, source)
     values ((select event_id from tk), 'Keyless template', 'book', 'template') $$,
  '23514', null,
  'a generated task must carry a source_key, or regeneration could not match it'
);

select throws_ok(
  $$ insert into public.tasks (event_id, title, phase, source, source_key)
     values ((select event_id from tk), 'Keyed manual', 'book', 'manual', 'book.x') $$,
  '23514', null,
  'a manual task carries no source_key'
);

update public.tasks set deleted_at = now() where id = (select theirs from tk);

select lives_ok(
  $$ insert into public.tasks (event_id, title, phase, source, source_key)
     values ((select event_id from tk), 'Confirm caterer', 'build', 'template', 'build.caterer') $$,
  'a deleted task keeps its key, and a live row may take that key back'
);

-- 4. Origin is immutable, for the owner too.

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', owner_id::text, 'role', 'authenticated')::text, true) from tk;

select throws_ok(
  $$ update public.tasks set source_key = 'book.elsewhere' where id = (select mine from tk) $$,
  'P0001', null,
  'not even the owner may re-key a task'
);

select throws_ok(
  $$ update public.tasks set derivation = '{"kind":"vibes"}'::jsonb where id = (select mine from tk) $$,
  'P0001', null,
  'not even the owner may rewrite why a task exists'
);

select lives_ok(
  $$ update public.tasks set title = 'Book the hall and the chairs' where id = (select mine from tk) $$,
  'the owner may still edit what a task says'
);

select lives_ok(
  $$ update public.tasks set status = 'done' where id = (select mine from tk) $$,
  'a task can be ticked'
);

reset role;

select ok(
  (select completed_at is not null from public.tasks where id = (select mine from tk)),
  'ticking a task records when'
);

update public.tasks set status = 'todo' where id = (select mine from tk);

select ok(
  (select completed_at is null from public.tasks where id = (select mine from tk)),
  'setting a task back to todo clears its completion'
);

-- 5. The planner writes anything on the event.

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', planner_id::text, 'role', 'authenticated')::text, true) from tk;

select lives_ok(
  $$ insert into public.tasks (event_id, title, phase)
     values ((select event_id from tk), 'Planner task', 'final') $$,
  'a planner may add a task'
);

select lives_ok(
  $$ update public.tasks set status = 'done' where id = (select mine from tk) $$,
  'a planner may tick a task assigned to someone else'
);

reset role;

-- 6. A member who is neither owner nor planner: reads all, moves only their own.

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', couple_id::text, 'role', 'authenticated')::text, true) from tk;

select is(
  (select count(*)::int from public.tasks),
  6,
  'a couple member reads every live task on the event, tombstoned rows included'
);

select lives_ok(
  $$ update public.tasks set status = 'waiting' where id = (select mine from tk) $$,
  'a couple member may move their own task to waiting'
);

select throws_ok(
  $$ update public.tasks set title = 'Renamed by couple' where id = (select mine from tk) $$,
  'P0001', null,
  'a couple member may not retitle their own task'
);

-- RLS refuses a row by not returning it, so the update touches nothing rather than raising.
do $$ declare n integer; begin
  update public.tasks set status = 'done' where id = (select theirs from tk);
  get diagnostics n = row_count;
  perform set_config('tk.rows', n::text, true);
end $$;

select is(current_setting('tk.rows')::integer, 0,
  'a couple member cannot tick a task assigned to someone else');

select is(
  (select status from public.tasks where id = (select theirs from tk)),
  'todo',
  'a task assigned to someone else stays untouched by a couple member'
);

reset role;

-- 7. The event ends with its day, but a status change is still bookkeeping.

-- The after-phase task is written while the day is still ahead; only then does the day pass.
insert into public.tasks (event_id, title, phase, status)
values ((select past_id from tk), 'Send thank-you notes', 'after', 'todo');

update public.events set date = now() - interval '3 days' where id = (select past_id from tk);

select throws_ok(
  $$ insert into public.tasks (event_id, title, phase)
     values ((select past_id from tk), 'Too late', 'after') $$,
  'P0001', 'This celebration has ended and can no longer be changed',
  'a new task cannot be added to an ended event'
);

select lives_ok(
  $$ update public.tasks set status = 'done'
     where event_id = (select past_id from tk) and source_key is null $$,
  'an after-phase task on an ended event may still be ticked'
);

select finish();
rollback;

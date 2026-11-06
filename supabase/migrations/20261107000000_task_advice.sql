-- Migration: task advice and the run-sheet time slot (20261107000000)
--
-- A checklist row can carry three things beyond its title: what to do, why this plan earned it,
-- and where the advice comes from. `detail` and `derivation` already existed; this adds the other
-- two, plus the time slot the day-of run sheet orders by.
--
--   * mitigation is the advice itself, with a number in it ("hold a 5–10 % buffer"). It is not
--     `detail`: detail is what the host has to decide, mitigation is what the practice says.
--   * advice_source is where that advice comes from. It is not `source`, which already means where
--     the row came from (template / generated / manual).
--   * time_slot is words ("10:00", "before the guests arrive") for a day-phase row. The day-of run
--     sheet orders by it; every other phase leaves it null, because a due date is enough.
--
-- All three are written by the generator, so mitigation and advice_source join
-- `guard_task_identity`: a row that could rewrite its own advice would dodge the next regeneration,
-- exactly as rewriting `derivation` would.

alter table public.tasks
  add column if not exists mitigation text,
  add column if not exists advice_source text,
  add column if not exists time_slot text;

alter table public.tasks
  drop constraint if exists tasks_mitigation_length_check,
  add constraint tasks_mitigation_length_check
    check (mitigation is null or length(btrim(mitigation)) between 1 and 2000);

alter table public.tasks
  drop constraint if exists tasks_advice_source_length_check,
  add constraint tasks_advice_source_length_check
    check (advice_source is null or length(btrim(advice_source)) between 1 and 200);

alter table public.tasks
  drop constraint if exists tasks_time_slot_length_check,
  add constraint tasks_time_slot_length_check
    check (time_slot is null or length(btrim(time_slot)) between 1 and 80);

comment on column public.tasks.mitigation is
  'What the practice says to do about this, with a number in it. Distinct from detail, which is what the host must decide.';
comment on column public.tasks.advice_source is
  'Where the advice comes from. Not `source`, which is the row''s origin (template / generated / manual).';
comment on column public.tasks.time_slot is
  'The run sheet''s time for a day-phase row. Null for every other phase, which is ordered by due date.';

-- The identity guard is recreated rather than altered: a trigger function cannot be patched in
-- place, and leaving it out of the list would let the generator's own fields drift.
create or replace function public.guard_task_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.event_id is distinct from old.event_id
     or new.source is distinct from old.source
     or new.source_key is distinct from old.source_key
     or new.derivation is distinct from old.derivation
     or new.mitigation is distinct from old.mitigation
     or new.advice_source is distinct from old.advice_source
     or new.template_version is distinct from old.template_version then
    raise exception 'A task''s origin cannot be changed'
      using errcode = 'P0001', hint = 'TASK_ORIGIN_IMMUTABLE';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_task_identity() from public, anon, authenticated;

-- `time_slot` is deliberately absent above: the run sheet may reorder a day row, and that is a
-- scheduling change a planner makes, not a change of origin.

create index if not exists tasks_day_run_sheet_idx
  on public.tasks (event_id, time_slot)
  where phase = 'day' and deleted_at is null;

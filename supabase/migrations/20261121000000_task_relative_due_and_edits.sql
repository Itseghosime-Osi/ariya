-- Migration: relative due dates and host edits on checklist tasks (20261121000000)
--
-- Two additions so a host can make the checklist their own:
--
--   * days_before: how many days before the event a task is due. When it is set, the due date is
--     worked out from the event date, and it moves when the event date moves. Null means the due
--     date (if any) is fixed. Generated rows already record this in derivation.count; it is copied
--     here so one column drives every relative date.
--   * edited_at: when a host last changed a task's wording, details, phase or due date. A generated
--     row that has been edited is the host's from then on, and the screen says so.
--
-- Neither is an origin field, so neither joins guard_task_identity. Both are still held for members
-- who are not owner or planner by guard_task_self_update, which compares whole rows.

alter table public.tasks
  add column if not exists days_before integer,
  add column if not exists edited_at timestamptz;

alter table public.tasks
  drop constraint if exists tasks_days_before_range_check,
  add constraint tasks_days_before_range_check
    -- Up to two years ahead, and up to a year after (thank-you notes, returns).
    check (days_before is null or days_before between -365 and 730);

comment on column public.tasks.days_before is
  'Days before the event the task is due (negative: after). When set, due_date follows the event date.';
comment on column public.tasks.edited_at is
  'When a host last changed the task''s wording, details, phase or due date.';

-- Generated rows: the generator wrote the offset into derivation.count for plan and risk rows.
update public.tasks
set days_before = (derivation ->> 'count')::integer
where days_before is null
  and source in ('template', 'generated')
  and derivation ->> 'kind' in ('plan', 'risk')
  and (derivation ->> 'count') ~ '^-?[0-9]+$'
  and (derivation ->> 'count')::integer between -365 and 730;

-- When an event's date changes, every relative task moves with it. The event's day is taken in
-- Lagos time, as everywhere else in the app.
create or replace function public.shift_relative_task_dates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.date is not distinct from old.date then
    return new;
  end if;

  update public.tasks
  set due_date = case
        when new.date is null then null
        else (new.date at time zone 'Africa/Lagos')::date - days_before
      end
  where event_id = new.id
    and days_before is not null
    and deleted_at is null;

  return new;
end;
$$;

revoke all on function public.shift_relative_task_dates() from public, anon, authenticated;

drop trigger if exists tr_shift_relative_task_dates on public.events;
create trigger tr_shift_relative_task_dates
  after update of date on public.events
  for each row execute function public.shift_relative_task_dates();

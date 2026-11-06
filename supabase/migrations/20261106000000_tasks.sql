-- Migration: the checklist, as a table rather than a jsonb blob (20261106000000)
--
-- The checklist is queried (what is mine, what is late, what this week), shared, and written back
-- one row at a time. jsonb cannot do any of that, so it gets a table (research §H.2).
--
--   * source_key is stable per template row, so regeneration is idempotent
--   * source_key is null for hand-added rows; a null never collides in a unique index, so a host
--     may add the same custom task twice if they really mean it
--   * derivation says why the row exists, so the checklist can answer "because your hall has 30
--     tables" without re-running the generator
--   * deleted_at is a tombstone: deleting a generated task is a signal ("we do not need this"),
--     and a regeneration must not put it back
--
-- RLS: every member reads. Owner and planner write. A 'couple' or 'staff' member may only move a
-- row assigned to them between 'todo', 'waiting' and 'done' — which is the "contributor sees only
-- their own rows" rule without a new role (open decision 6 is still deferred). Nobody, including
-- owner and planner, may rewrite `source`, `source_key` or `derivation` after insert: those are
-- what the generator wrote, and rewriting them would let a row dodge the next regeneration.

-- ============================================================================
-- 1. THE TABLE
-- ============================================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  detail text,
  phase text not null,
  due_date date,
  status text not null default 'todo',
  owner_id uuid references public.profiles(id) on delete set null,
  source text not null default 'manual',
  source_key text,
  derivation jsonb,
  -- The template that wrote the row, so an updated template can tell its own old rows apart from
  -- someone else's (6.2.5).
  template_version integer,
  sort integer not null default 0,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tasks_title_check check (btrim(title) <> ''),
  constraint tasks_phase_check check (
    phase in ('foundations', 'book', 'build', 'detail', 'final', 'day', 'after')
  ),
  constraint tasks_status_check check (
    status in ('todo', 'waiting', 'done', 'skipped')
  ),
  constraint tasks_source_check check (
    source in ('template', 'generated', 'manual')
  ),
  -- A generated row with no key could never be matched again, and would duplicate on the next run.
  constraint tasks_source_key_check check (
    source = 'manual' or (source_key is not null and btrim(source_key) <> '')
  ),
  constraint tasks_manual_has_no_key_check check (
    source <> 'manual' or source_key is null
  )
);

comment on table public.tasks is
  'The event checklist. Generated rows carry a source_key so regeneration is idempotent, and deleted_at so a deletion survives one.';
comment on column public.tasks.source_key is
  'Stable template key. Unique per event among live rows; a tombstone keeps its key and is excluded.';
comment on column public.tasks.derivation is
  'Why the row exists, e.g. {"kind":"tables","count":30}. Written by the generator, never by the client.';
comment on column public.tasks.deleted_at is
  'Tombstone for a deleted generated task. Regeneration skips these; deleting is the host saying "not this one".';

-- Research §H.2 declares `unique (event_id, source_key)`, as a table constraint. A tombstone has
-- to keep its key or the next regeneration would put the task back, and a plain constraint counts
-- tombstones — so the key's uniqueness is this partial index instead. A null source_key (a hand-
-- added row) is excluded either way.
create unique index if not exists tasks_live_source_key_idx
  on public.tasks(event_id, source_key)
  where source_key is not null and deleted_at is null;

create index if not exists idx_tasks_event_id on public.tasks(event_id);
create index if not exists idx_tasks_owner_id on public.tasks(owner_id);
create index if not exists idx_tasks_event_due on public.tasks(event_id, due_date)
  where deleted_at is null;

-- ============================================================================
-- 2. WRITE GUARDS
-- ============================================================================

-- status and completed_at move together, so a "done" row always knows when, and an undone row
-- never claims a completion it no longer has.
create or replace function public.tasks_track_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.tasks_track_completion() from public, anon, authenticated;

drop trigger if exists tr_tasks_track_completion on public.tasks;
create trigger tr_tasks_track_completion
  before insert or update on public.tasks
  for each row execute function public.tasks_track_completion();

drop trigger if exists tr_tasks_updated_at on public.tasks;
create trigger tr_tasks_updated_at
  before update on public.tasks
  for each row execute function public.handle_updated_at();

-- The generator's columns are immutable after insert, for every role. A regeneration can then
-- trust that a live row's source_key still means what it says.
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
     or new.template_version is distinct from old.template_version then
    raise exception 'A task''s origin cannot be changed'
      using errcode = 'P0001', hint = 'TASK_ORIGIN_IMMUTABLE';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_task_identity() from public, anon, authenticated;

drop trigger if exists tr_guard_task_identity on public.tasks;
create trigger tr_guard_task_identity
  before update on public.tasks
  for each row execute function public.guard_task_identity();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

alter table public.tasks enable row level security;

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (public.is_event_member(event_id));

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (public.has_event_role(event_id, array['owner', 'planner']));

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update
  using (public.has_event_role(event_id, array['owner', 'planner']))
  with check (public.has_event_role(event_id, array['owner', 'planner']));

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (public.has_event_role(event_id, array['owner', 'planner']));

-- A member who is not owner or planner may move a row that is assigned to them between
-- todo / waiting / done, and nothing else. A policy can express "who" and "what status"; the
-- trigger below is what holds every other column at its stored value.
drop policy if exists "tasks_update_own_assignee" on public.tasks;
create policy "tasks_update_own_assignee" on public.tasks
  for update
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and status in ('todo', 'waiting', 'done')
  );

create or replace function public.guard_task_self_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only a signed-in client is held to this. The owner and planner write whole rows, a service
  -- session (cron, generator, the applied-proposal path) is not an end user at all, and a bare
  -- admin session has no auth.role() — for all of those the table's policies already decide.
  if coalesce(auth.role(), '') <> 'authenticated'
     or public.has_event_role(old.event_id, array['owner', 'planner']) then
    return new;
  end if;

  if (to_jsonb(new) - 'status' - 'completed_at' - 'updated_at')
     is distinct from
     (to_jsonb(old) - 'status' - 'completed_at' - 'updated_at') then
    raise exception 'You can only change the status of your own tasks'
      using errcode = 'P0001', hint = 'TASK_STATUS_ONLY';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_task_self_update() from public, anon, authenticated;

drop trigger if exists tr_guard_task_self_update on public.tasks;
create trigger tr_guard_task_self_update
  before update on public.tasks
  for each row execute function public.guard_task_self_update();

-- App tokens: no delete, and no write while the connection is read-only. Same shape as every other
-- table a token can see (20261101000000).
drop policy if exists "ai_app_tokens_cannot_delete" on public.tasks;
create policy "ai_app_tokens_cannot_delete" on public.tasks
  as restrictive for delete to authenticated using (not public.is_app_token());
drop policy if exists "ai_read_only_cannot_write_insert" on public.tasks;
create policy "ai_read_only_cannot_write_insert" on public.tasks
  as restrictive for insert to authenticated with check (not public.ai_connection_read_only());
drop policy if exists "ai_read_only_cannot_write_update" on public.tasks;
create policy "ai_read_only_cannot_write_update" on public.tasks
  as restrictive for update to authenticated
  using (not public.ai_connection_read_only())
  with check (not public.ai_connection_read_only());

-- ============================================================================
-- 4. GRANTS
-- ============================================================================

revoke all on table public.tasks from anon;
revoke truncate, references, trigger on table public.tasks from authenticated, service_role;
grant select, insert, update, delete on table public.tasks to authenticated, service_role;

-- ============================================================================
-- 5. THE EVENT ENDS WITH ITS DAY
-- ============================================================================
--
-- 20261105000000 already lists 'tasks' in its trigger array, against a table that did not exist
-- yet. That trigger is created here instead, now that it does.

-- The after-phase tasks (thank-yous, reviews, accounts) are real work after the day, and the row
-- guard freezes the table. A change that only moves a task between statuses is bookkeeping, not a
-- change to the celebration, so it goes through. Everything else still waits behind the host.
create or replace function public.guard_expired_event_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_event uuid := nullif(v_row ->> 'event_id', '')::uuid;
  v_date timestamptz;
begin
  if v_event is null and nullif(v_row ->> 'guest_id', '') is not null then
    select g.event_id into v_event
    from public.guests g
    where g.id = (v_row ->> 'guest_id')::uuid;
  end if;

  -- No parent row means the event itself is being deleted (a cascade): let it through.
  if v_event is not null then
    select e.date into v_date from public.events e where e.id = v_event;
    if found and public.event_is_expired(v_date) then
      if tg_table_name = 'tasks' and tg_op = 'UPDATE'
         and (to_jsonb(new) - 'status' - 'completed_at' - 'updated_at')
             is not distinct from
             (to_jsonb(old) - 'status' - 'completed_at' - 'updated_at') then
        return new;
      end if;
      raise exception 'This celebration has ended and can no longer be changed'
        using errcode = 'P0001', hint = 'EVENT_EXPIRED';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists tr_guard_expired_event_rows on public.tasks;
create trigger tr_guard_expired_event_rows
  before insert or update or delete on public.tasks
  for each row execute function public.guard_expired_event_rows();

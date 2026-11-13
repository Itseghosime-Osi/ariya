-- Migration: named versions of an invitation design (20261113000100)
--
-- Checklist F3: name a version, find it again, restore it. The studio's History panel is only
-- this visit's undo steps; this table keeps versions a host chose to keep.
--
--   * A version is a full copy of the design as it was, so restoring returns the exact earlier
--     design (the studio then puts it on the undo stack, so even a restore can be undone).
--   * Anyone on the event can read them; people who can edit the event can save and delete them.
--   * The studio keeps the newest 30 per event (enforced in the save action, not here).

create table if not exists public.invitation_versions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  design jsonb not null,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.invitation_versions is
  'Named copies of an event''s invitation design that a host chose to keep, newest first.';

create index if not exists invitation_versions_event_idx
  on public.invitation_versions (event_id, created_at desc);

alter table public.invitation_versions enable row level security;

drop policy if exists "invitation_versions_select_members" on public.invitation_versions;
create policy "invitation_versions_select_members" on public.invitation_versions
  for select to authenticated
  using (public.is_event_member(event_id));

drop policy if exists "invitation_versions_insert_editors" on public.invitation_versions;
create policy "invitation_versions_insert_editors" on public.invitation_versions
  for insert to authenticated
  with check (public.has_event_role(event_id, array['owner', 'planner', 'couple']));

drop policy if exists "invitation_versions_delete_editors" on public.invitation_versions;
create policy "invitation_versions_delete_editors" on public.invitation_versions
  for delete to authenticated
  using (public.has_event_role(event_id, array['owner', 'planner', 'couple']));

revoke all on table public.invitation_versions from anon;
revoke update, truncate, references, trigger on table public.invitation_versions from authenticated;
grant select, insert, delete on table public.invitation_versions to authenticated;

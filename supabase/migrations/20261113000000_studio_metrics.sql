-- Migration: anonymous studio metrics per event (20261113000000)
--
-- Checklist J1: time to first export, export success rate and error rate, measured per event.
--
--   * One row per thing that happened: the studio was opened, an export worked, an export failed.
--   * Anonymous on purpose: no user id, no card content, no file name. Only the event, what
--     happened, the format and how long after opening it happened.
--   * Written by people who can edit the event, read by the same people (and so by the team).
--
-- Reading it (per event):
--   select count(*) filter (where kind = 'export_ok')      as exports_ok,
--          count(*) filter (where kind = 'export_failed')  as exports_failed,
--          min(ms) filter (where kind = 'export_ok')       as ms_to_first_export
--   from public.studio_metrics where event_id = '...';

create table if not exists public.studio_metrics (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('opened', 'export_ok', 'export_failed', 'error')),
  format text check (format in ('png', 'jpeg', 'pdf', 'json', 'whatsapp')),
  ms integer check (ms is null or ms >= 0),
  created_at timestamptz not null default now()
);

comment on table public.studio_metrics is
  'Anonymous per-event counts for the invitation studio: opened, export_ok, export_failed, error. No user id or card content.';

create index if not exists studio_metrics_event_idx on public.studio_metrics (event_id, created_at);

alter table public.studio_metrics enable row level security;

drop policy if exists "studio_metrics_insert_editors" on public.studio_metrics;
create policy "studio_metrics_insert_editors" on public.studio_metrics
  for insert to authenticated
  with check (public.has_event_role(event_id, array['owner', 'planner', 'couple']));

drop policy if exists "studio_metrics_select_members" on public.studio_metrics;
create policy "studio_metrics_select_members" on public.studio_metrics
  for select to authenticated
  using (public.is_event_member(event_id));

revoke all on table public.studio_metrics from anon, authenticated, service_role;
grant select, insert on table public.studio_metrics to authenticated;
grant select, insert, delete on table public.studio_metrics to service_role;

-- Migration: notification preferences (20261107000100)
--
-- The checklist's reminders (6.4.2) need three answers per person: whether they want the weekly
-- digest, and the hours they do not want to be pinged in. "Weekly by default" is a decision, so the
-- default lives in the column rather than in code — a person with no row behaves as `weekly` with
-- an evening quiet window, which is what the defaults below spell out.
--
-- One row per profile, and it appears lazily: nothing is inserted at signup, so an absent row is
-- the default rather than an error. Reads fall back, writes upsert.

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  -- 'weekly' sends the digest; 'off' is the in-app switch, honoured by the cron.
  digest text not null default 'weekly',
  -- Quiet hours, wall-clock time. The window may wrap midnight (21:00 → 07:00).
  quiet_from time not null default '21:00',
  quiet_to time not null default '07:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_preferences_digest_check check (digest in ('weekly', 'off')),
  constraint notification_preferences_quiet_check check (quiet_from <> quiet_to)
);

alter table public.notification_preferences enable row level security;

drop policy if exists "notification_preferences_select" on public.notification_preferences;
create policy "notification_preferences_select" on public.notification_preferences
  for select using (user_id = auth.uid());

drop policy if exists "notification_preferences_insert" on public.notification_preferences;
create policy "notification_preferences_insert" on public.notification_preferences
  for insert with check (user_id = auth.uid());

drop policy if exists "notification_preferences_update" on public.notification_preferences;
create policy "notification_preferences_update" on public.notification_preferences
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No delete policy: turning reminders off is `digest = 'off'`, not removing the row. That keeps a
-- host's quiet hours when they switch the digest back on.

drop trigger if exists tr_notification_preferences_updated_at on public.notification_preferences;
create trigger tr_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.handle_updated_at();

comment on table public.notification_preferences is
  'Per-person reminder settings. A missing row means the defaults: a weekly digest, quiet 21:00–07:00.';

-- Nobody needs delete: the row is turned off with `digest = 'off'`, so the privilege would only be
-- a way to lose quiet hours. `anon` is revoked outright — these are one person's own settings.
revoke all on table public.notification_preferences from anon;
revoke delete, truncate, references, trigger on table public.notification_preferences
  from authenticated, service_role;
grant select, insert, update on table public.notification_preferences
  to authenticated, service_role;

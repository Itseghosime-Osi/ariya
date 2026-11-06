-- Migration: the weekly digest ledger (20261107000200)
--
-- The digest cron runs hourly and sends at most one digest per person per week (6.4.2). That
-- "at most one" is a uniqueness question, so it belongs in the database rather than in the route's
-- memory: two overlapping runs would otherwise both read "not sent yet" and both send.
--
-- email_log is the wrong home for this. It records mail to a person at an address, with a
-- recipient_email that cannot be null, and a digest is a push notification that may go to several
-- devices at once.
--
--   * user_id + week_start is the whole identity: a person, and the Monday of the week.
--   * sent_at is when it actually went, so a held-back digest records the hour it was released.

create table if not exists public.digest_log (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

comment on table public.digest_log is
  'One row per person per week that a checklist digest was sent, so the hourly cron cannot send the same week twice.';

alter table public.digest_log enable row level security;

-- Read-only to the person themselves, and nobody writes it from a client: the cron is the only
-- writer, and it uses the service role. The cron claims a week with an insert and releases the
-- claim with a delete when nothing reached a device, so the service role gets exactly those two
-- (and never an update: a claim is made or released, not edited).
drop policy if exists "digest_log_select_own" on public.digest_log;
create policy "digest_log_select_own" on public.digest_log
  for select using (user_id = auth.uid());

revoke all on table public.digest_log from anon;
revoke insert, update, delete, truncate, references, trigger on table public.digest_log
  from authenticated, service_role;
grant select on table public.digest_log to authenticated;
grant select, insert, delete on table public.digest_log to service_role;

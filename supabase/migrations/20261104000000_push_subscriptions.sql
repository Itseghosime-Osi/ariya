-- Migration: App notifications (20261104000000)
--
-- One row per device a host has allowed to receive Àríyá notifications (the browser's Web Push
-- subscription). Only first-party server code touches this table, through the service role, after
-- it has checked who is signed in: no client, and no connected AI app, can read or write it.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- The push service's address for this device. Unique: a device belongs to one account at a time.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,

  constraint push_subscriptions_endpoint_check check (
    endpoint ~ '^https://' and length(endpoint) <= 2048
  ),
  constraint push_subscriptions_keys_check check (
    length(p256dh) between 1 and 256 and length(auth) between 1 and 64
  ),
  constraint push_subscriptions_user_agent_check check (
    user_agent is null or length(user_agent) <= 512
  )
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Row level security on, with no policies: closed to anon and authenticated. The service role
-- (first-party server code only) bypasses it.
alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from public, anon, authenticated;
revoke truncate, references, trigger on table public.push_subscriptions from service_role;
grant select, insert, update, delete on table public.push_subscriptions to service_role;

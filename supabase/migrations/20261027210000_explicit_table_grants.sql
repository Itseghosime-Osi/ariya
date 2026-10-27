-- Explicit least-privilege table grants for authenticated and service_role.
-- Anon has zero table privileges (all guest and public routes use security definer RPCs).
-- Truncate is never granted to non-owner roles as it bypasses Row Level Security.

-- 1. Strip default / automatic table privileges from anon across both local and hosted environments
revoke all on table
  public.check_ins,
  public.email_log,
  public.event_invites,
  public.event_members,
  public.events,
  public.guests,
  public.invoices,
  public.payments,
  public.profiles,
  public.rsvps,
  public.seat_assignments,
  public.tables,
  public.vendor_tasks,
  public.vendors
from anon;

-- Strip dangerous or unneeded privileges (truncate bypasses RLS, references, trigger)
revoke truncate, references, trigger on table
  public.check_ins,
  public.email_log,
  public.event_invites,
  public.event_members,
  public.events,
  public.guests,
  public.invoices,
  public.payments,
  public.profiles,
  public.rsvps,
  public.seat_assignments,
  public.tables,
  public.vendor_tasks,
  public.vendors,
  public.rate_limits
from authenticated, service_role;

-- 2. Grant least-privilege CRUD (SELECT, INSERT, UPDATE, DELETE) to authenticated
grant select, insert, update, delete on table
  public.check_ins,
  public.email_log,
  public.event_invites,
  public.event_members,
  public.events,
  public.guests,
  public.invoices,
  public.payments,
  public.profiles,
  public.rsvps,
  public.seat_assignments,
  public.tables,
  public.vendor_tasks,
  public.vendors
to authenticated;

-- 3. Grant least-privilege CRUD to service_role (for Paystack webhooks, email dispatch, cron reminders)
grant select, insert, update, delete on table
  public.check_ins,
  public.email_log,
  public.event_invites,
  public.event_members,
  public.events,
  public.guests,
  public.invoices,
  public.payments,
  public.profiles,
  public.rsvps,
  public.seat_assignments,
  public.tables,
  public.vendor_tasks,
  public.vendors,
  public.rate_limits
to service_role;

-- 4. Sequences: grant usage, select only to authenticated and service_role
-- Note: Schema public currently has 0 sequences as all tables use UUID primary keys.
grant usage, select on all sequences in schema public to authenticated, service_role;

-- 5. Hardening revokes

-- Rate limits: completely closed to anon and authenticated; open only to service_role and security definer functions
revoke all on table public.rate_limits from anon, authenticated;

-- Events: paid_at column revoke.
-- Note: In Postgres, a column revoke does not override a table-level update grant.
-- The paid_at column is strictly enforced against non-service_role tampering by the tr_event_protection trigger.
revoke update (paid_at) on public.events from anon, authenticated;

-- Guests: revoke table-level update, restrict authenticated to designated safe columns
revoke update on public.guests from anon, authenticated;
grant update (
  event_id,
  name,
  phone,
  email,
  side,
  group_name,
  is_vip,
  party_size,
  plus_ones_allowed,
  notes,
  invited_at,
  created_at,
  updated_at
) on public.guests to authenticated;

-- Ensure check_in_code and rsvp_token cannot be updated
revoke update (check_in_code) on public.guests from anon, authenticated;
revoke update (rsvp_token) on public.guests from anon, authenticated;

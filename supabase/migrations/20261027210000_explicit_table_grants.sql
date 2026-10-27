-- Explicit table and sequence grants for anon and authenticated roles
-- This ensures hosted Supabase environments have table privileges identical to local dev.

-- 1. Explicit table grants
grant select, insert, update, delete, truncate, references, trigger on table
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
to anon, authenticated;

-- 2. Explicit sequence grants
grant usage, select on all sequences in schema public to anon, authenticated;

-- 3. Default privileges for future tables and sequences in public schema
alter default privileges in schema public grant select, insert, update, delete, truncate, references, trigger on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

-- 4. Re-apply all hardening revokes to match local configuration exactly

-- Rate limits: completely inaccessible to anon and authenticated
revoke all on table public.rate_limits from anon, authenticated;

-- Events: paid_at cannot be updated by anon or authenticated (managed by service_role trigger)
revoke update (paid_at) on public.events from anon, authenticated;

-- Guests: revoke table-level update, only permit updates to specific columns by authenticated
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

-- Ensure check_in_code and rsvp_token are not updateable
revoke update (check_in_code) on public.guests from anon, authenticated;
revoke update (rsvp_token) on public.guests from anon, authenticated;

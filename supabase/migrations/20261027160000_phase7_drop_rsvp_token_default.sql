-- Migration: Phase 7 Drop rsvp_token Default
-- Timestamp: 20261027160000
-- The BEFORE INSERT trigger tr_guests_before_insert unconditionally sets
-- new.rsvp_token := public.generate_invitation_token().
-- Dropping the column default prevents PostgreSQL from attempting to evaluate
-- the revoked generate_invitation_token() expression during column initialization
-- before the security definer trigger executes.

alter table public.guests alter column rsvp_token drop default;

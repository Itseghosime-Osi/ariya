# ADR 0003: Row-Level Security & Privilege Model

## Status

Accepted

## Context

Multi-tenant wedding suites require strict isolation. A leak of VIP celebrity guest contact information, dietary sensitivities, or financial records would destroy brand trust. Furthermore, celebrations feature four distinct user roles (Owner, Planner, Couple, Staff) with asymmetric permissions.

Client-side checks and application-layer guards are insufficient: a single misconfigured server route could leak data.

## Decision

1. **Defense-in-Depth via Database RLS**: Every table in `public` has Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
2. **Definer Security Helpers**:
   - `public.is_event_member(p_event_id)` and `public.has_event_role(p_event_id, p_roles)` verify membership via clean `SECURITY DEFINER`, `STABLE` functions with explicit `SET search_path = ''`.
   - Prevents recursive policy evaluation and ensures zero execution overhead.
3. **Role Privilege Boundaries**:
   - **Owner**: Full administrative management across all roles and settings. Last remaining owner cannot be deleted or demoted (enforced via `tr_event_member_security` trigger).
   - **Planner**: Manages Couple and Staff roles; cannot elevate to or demote Owner.
   - **Couple**: Read-only oversight of celebration metrics and guest list.
   - **Staff**: Reception concierge only. Blocked from viewing billing and invoices (`403` / RLS denied).
4. **Column-Level Privilege Lockdown**:
   - `events.paid_at` is revokable from `authenticated` and `anon`; updates restricted strictly to `service_role` (via Paystack webhook).
   - `guests.rsvp_token` direct updates revoked from `authenticated` and `anon`; mutable only through `regenerate_guest_token(p_guest_id)` definer RPC.
5. **Least-Privilege Function Audit**:
   - `alter default privileges in schema public revoke execute on functions from public, anon, authenticated;`
   - Explicit `GRANT EXECUTE` is applied only to audited, whitelisted functions.
   - Verified via pgTAP test suite (`07_privilege_audit.test.sql`).

## Consequences

- **Positive**: Data security is provably guaranteed at the database engine level; privileged operations cannot be spoofed by forged API requests.
- **Negative**: Adding new functions requires explicit GRANT statements in migrations and updating the pgTAP privilege audit whitelist.

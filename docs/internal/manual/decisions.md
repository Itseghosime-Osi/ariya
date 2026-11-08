# Decisions and history

The six architecture decisions, the quality remediation and the audit, in brief.

Audience: Developers and reviewers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Architecture decision records

| ADR                     | Decision                                                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0001 Stack              | Next.js 16 + React 19, Supabase (Postgres, Auth, RLS), Tailwind v4 + Radix, TanStack Table + dnd-kit, Paystack                         |
| 0002 Film isolation     | Marketing and film live in `public/site/`, served by rewrites; `/assets/` is reserved; no WebGL in `src/`                              |
| 0003 RLS and privileges | RLS on every table; security-definer helpers with fixed search_path; role boundaries for owner, planner, couple, staff                 |
| 0004 Payments           | Server-only initialisation with a generated reference; one idempotent `confirmPayment` used by the callback page and the webhook       |
| 0005 Rust studio core   | One Rust engine behind one JSON entry point; errors as data; wire format snapshotted; types generated; loader with TypeScript fallback |
| 0006 Tasks table        | Unique `(event_id, source_key)`; tombstone deletes; frozen advice origin; RLS by role; session-client reads                            |

The design engine (invitations) follows the same pattern as ADR 0005; it has no separate ADR yet.

## Quality remediation

Implemented without changing the design: correct prices and status wording, privacy headers on personal links (noindex, no-referrer, no-store), dependency upgrades, mobile accessibility labels, per-token rate limits inside the guest RPCs (40 per minute for reading an invitation, 10 for RSVP), canonical URLs and structured data, search debouncing and cancellation, real image-byte validation for cover uploads (up to 40 megapixels) and response-hardening headers.

## Security audit, 5 November 2026

Score 65/100, 17 findings (4 high, 11 medium, 2 low). The high findings are in [Security model](security.md). Others include stored HTML in email, non-atomic send bookkeeping, a CSP that does not yet restrict scripts, uploads above 1 MB failing, team-invite redirect loss after sign-in, and silent CSV truncation beyond 500 rows. Baseline at audit: 539 unit tests, 332 database assertions and 51 Playwright tests passing.

## Venue studio research and plan

`docs/research/2026-11-05-venue-studio.md` (venue typologies, auto-layout, thermal, risk, catering, the checklist page, Rust architecture and data model) and `docs/plans/2026-11-05-venue-studio-build-checklist.md` (phases 0–7: foundations, venue model, auto-layout, thermal, catering, risk, checklist, polish) are the sources behind the studio.

# Security model

Row Level Security, rate limits, validated uploads, headers and what the audit found.

Audience: Owners, engineers, reviewers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Defence in layers

- **Row Level Security on every table.** New tables get RLS in the same migration. A privilege-audit test (pgTAP `07_privilege_audit`) lists every function an app role may execute, so a new function must be consciously allow-listed.
- **Route protection** in `proxy.ts`: public pages bypass the session check; everything else needs a session.
- **Server-side role checks** before every privileged action (send, bill, change team).
- **Rate limiting** with an atomic database counter, IPs hashed with HMAC-SHA256 (`RATE_LIMIT_SECRET`), service-role execution only, and **fail closed**: if the counter cannot be read, the request is refused.
- **Signed webhooks** and re-verification (see [Billing](billing.md)).
- **Validated uploads**: type and size are checked server-side; pictures are capped at 5 MB.
- **Escaped email**: guest names and event text are escaped or rendered through React Email, never pasted into HTML.
- **AI containment**: app tokens are restricted in the database and can only propose (see [Connect your AI](connect-ai.md)).

## The November 2026 audit

An engineering audit on 5 November 2026 scored the site 65/100 and listed 17 findings (4 high, 11 medium, 2 low). No account takeover, cross-account data access or injection was demonstrated. The high findings were:

| Id  | Finding                                                            | Fix                                                           |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| S1  | Signup could mark an unverified email as verified when mail failed | Leave the account unconfirmed and report a retryable failure  |
| S2  | Push subscriptions accepted any HTTPS URL (blind SSRF)             | Allow only supported push-service origins, quotas per user    |
| S3  | Staff could trigger privileged email delivery                      | Role check immediately before every send                      |
| S4  | Single-invitation sender had no resend or daily cap                | Reserve per-recipient and per-event allowances before sending |

The remediation record is `docs/quality-remediation.md` and the full report is `docs/audits/2026-11-05/REPORT.md`. Both are summarised in [Decisions and history](decisions.md).

> Known caveats: Cover pictures live in a public storage bucket. The Content-Security-Policy currently restricts base, object and framing but does not yet restrict scripts or connections; a nonce-based policy is planned.

## Reporting a problem

Write to [help@ariyaday.com](mailto:help@ariyaday.com).

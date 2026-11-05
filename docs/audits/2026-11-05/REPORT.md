# Àríyá website audit — 5 November 2026

Production audit: **65/100, risky**. Fix the authentication fallback, arbitrary push destinations, email permissions, and email abuse controls before a wider launch. This is an engineering triage score, not a compliance certification or a measured probability of compromise.

**17 findings: 4 high, 11 medium, 2 low**, followed by SEO/AEO/GEO improvement opportunities. Severity reflects likely impact and prerequisites. Source-confirmed weaknesses and isolated reproductions are distinguished from end-to-end exploits.

No existing-account takeover, cross-account data access, SQL injection, remote code execution, or historical security breach was demonstrated. Several weaknesses were reproducible. Passing the existing tests does not establish that an app is hacker-proof.

## Scope and evidence

- Checkout: `8cc71e9` on `main`, initially clean. App Router website, server actions, auth, public invitation flows, Supabase migrations/policies, email, payments/webhooks, cron, uploads, push notifications, MCP/OAuth, CI, and selected deployment configuration reviewed.
- Active penetration checks used **localhost and local Supabase only**, disposable audit identities/events, synthetic data, and a loopback listener. The custom penetration/upload fixtures were deleted. The existing E2E suite also creates local test data under its own cleanup conventions.
- Production: **read-only GETs** to `https://ariya-two.vercel.app` for `/`, `/about`, `/product`, `/pricing`, `/docs`, `/robots.txt`, and `/sitemap.xml`; all returned 200. No production attack payloads, signup, payment, email, or authenticated mutations were performed. Production source revision and configuration were not verified.
- Additional public crawl: 16 routes at 1440px and 390px, with reduced motion requested; **31 of 32 axe scans completed**. `/about` at 390px exceeded the 20-second scan deadline; that is an incomplete check, not proof of a website performance defect. No horizontal document overflow or uncaught page errors were recorded in the completed public scans. This does not cover every animation/interaction state.
- Original lint and TypeScript checks passed. **539 unit tests, 332 database assertions across 19 SQL files, and all 51 Playwright tests passed.** Production build and bundle check passed. The first sandboxed build hit a macOS keychain failure; the same build succeeded outside the sandbox.
- Four additional audit reproductions passed: email-verification fail-open, real push transport to loopback, raw email HTML plus ignored tracking failure, and silent CSV truncation. They document vulnerabilities; they are not tests asserting secure behavior.
- Selected current tracked-file secret patterns produced no matches. This was **not a complete secret/history scan** of all 656 reachable commits.

Raw results and command logs are in [evidence](./evidence/). `ariya-penetration.json` records the direct local checks; `audit-reproductions.test.ts` records the isolated tests. The latter uses the web app's Vitest aliases and would need to be temporarily placed under `apps/web/src` to rerun with the existing configuration.

## High-priority security findings

### S1 — High: signup can mark an unverified email as verified

**Location:** `apps/web/src/features/auth/actions.ts:123–133`.

When Supabase signup returns a mailer/rate-limit failure, the fallback creates a signup link through the admin API. If the app's own mail provider also fails, it calls `updateUserById(..., { email_confirm: true })` and signs the registrant in. An isolated test of the actual action reproduced authenticated success without successful delivery or ownership verification.

**Impact:** an attacker can register an available address they do not own and obtain a verified identity when this outage/rate-limit branch is reachable. Any later authorization based on verified email, including matching team invitations, must not rely on this identity. This does not demonstrate taking over an already registered account.

**Fix:** leave the account unconfirmed, report a retryable delivery failure, and provide a rate-limited resend flow. Never use provider failure as evidence of email ownership. Rate-limit before beginning signup/fallback work.

### S2 — High: push subscriptions create a blind SSRF path

**Locations:** `apps/web/src/features/notifications/schemas.ts:4`, `notifications/actions.ts:22`, `apps/web/src/lib/push.ts:58`.

Validation accepts any HTTPS URL, including loopback/private destinations. A signed-in user can store arbitrary endpoints, and the server sends push requests to them. There is no provider allowlist, private-address rejection, or device-count ceiling in the save path.

**Evidence:** a direct local HTTP action accepted `https://127.0.0.1:<test-port>/audit`. That end-to-end send did not reach the listener because this local app uses an HTTP VAPID subject, rejected by `web-push`. A separate test of the actual `sendPushToUsers` implementation, with valid generated VAPID keys and an HTTPS subject, used the real `web-push` transport and successfully opened a connection to a loopback-only TCP listener. Only environment/database inputs were substituted; the transport was not mocked.

**Impact:** authenticated blind HTTPS requests from the application server, conditional on push being configured and network egress. Responses are not returned to the attacker. This test did not obtain cloud metadata, secrets, or internal HTTP response bodies. Unbounded subscription registration also increases fan-out/cost risk.

**Fix:** allow only supported push-service origins, reject URL credentials and nonstandard ports, constrain paths where possible, apply outbound private/link-local address controls with DNS-rebinding protection, and enforce per-user subscription quotas and registration limits. Use a valid HTTPS or mailto VAPID subject.

### S3 — High: staff can trigger privileged email delivery

**Locations:** `apps/web/src/features/invitations/actions.ts:156`, `apps/web/src/features/reminders/actions.ts:21`, `supabase/migrations/20261101000000_mcp_token_lockdown.sql:476`.

The email actions read data through the caller's RLS client, then invoke service-role-backed delivery without explicitly requiring an invitation-management role. Staff can read guests. `check_invitation_quota` checks AI scope and counts, not membership role. The stronger role check in `track_invitations_sent` occurs **after** single-invitation delivery.

**Evidence:** a real local staff session invoked the invitation action and reached the delivery provider, producing an email-log entry. The local provider rejected delivery, so no successful staff email delivery is claimed. An isolated provider-success test showed that a subsequent `NOT_PERMITTED` tracking error is ignored and the action still returns success.

**Impact:** a collaborator intended to have reception/read access can initiate provider calls and, with a working provider, send event email under the app's identity. Ordinary RLS read permission is insufficient authorization for a privileged side effect.

**Fix:** enforce allowed event roles and first-party/connected-app restrictions immediately before every send, in a shared server-side delivery gate. Keep authorization checks before external effects. Test staff, outsiders, and restricted OAuth tokens against the delivery action itself.

### S4 — High: the single-invitation sender has no resend/daily rate cap

**Location:** `apps/web/src/features/invitations/actions.ts:156–215`.

Unlike reminders and RSVP confirmation, single invitation email does not check `email_log` caps or call the application rate limiter. The free-tier quota counts distinct guests marked invited; it is not a send-frequency limit. Repeatedly sending to one guest below the quota can keep reaching the provider.

**Evidence:** six immediate owner requests all reached delivery, in addition to the staff request. The seven local logs were provider failures (`MailpitHttpError_400`), not seven delivered emails. Code inspection establishes that no successful-send cap is applied here either. No high-volume or production mail test was performed.

**Impact:** email harassment, provider charges, reputation damage, and repeated work. Retry failures also generate unbounded attempts within ordinary server resource limits.

**Fix:** atomically reserve per-recipient, per-event, per-account, and global delivery allowances before contacting the provider; add resend cooldowns and explicit idempotency keys. Apply them consistently to invitations, reminders, RSVP confirmations, and approval-triggered sends.

## Other security and reliability findings

### S5 — Medium: stored HTML is interpolated into trusted email

**Locations:** `apps/web/src/features/invitations/actions.ts:202`, `reminders/actions.ts:115`, `apps/web/src/app/api/cron/reminders/route.ts:91`.

Guest names, couple/venue fields, and custom reminders are inserted directly into HTML strings. An isolated actual-action test placed an `<a>` marker in a guest name and confirmed that raw markup reached delivery.

**Impact:** injected links/layout/content in app-branded messages; phishing or content spoofing. This is **email HTML injection**, not demonstrated script execution in a browser or mail client.

**Fix:** use React Email components for these templates, as the RSVP confirmation path already does, or contextually escape all plain-text fields. If rich text is intended, sanitize it with a narrow documented allowlist.

### S6 — Medium: sending and bookkeeping are not atomic/idempotent

**Locations:** `apps/web/src/features/invitations/actions.ts:194–213`, `reminders/actions.ts:97–115`, `api/cron/reminders/route.ts:73–91`, `apps/web/src/lib/email/dispatcher.ts:98`.

Single-invitation delivery precedes `track_invitations_sent`, whose error is discarded. The actual-action reproduction returned success even when tracking returned a permission error. Reminder caps and cron deduplication count existing logs before sending; parallel requests can observe the same count. Provider sends have no app-supplied idempotency key.

**Impact:** an email can be sent without being marked invited, making retries/approval recovery duplicate it; concurrent sends can exceed intended caps. The tracking-error case was reproduced; the concurrency scenario is source-confirmed and was not load-tested.

**Fix:** create an authorized delivery job/reservation in a transaction, enforce uniqueness and caps there, deliver with a stable idempotency key, and record/reconcile provider outcomes. Do not silently treat failed tracking as success.

### S7 — Medium: CSP does not restrict script execution or outbound connections

**Location:** `apps/web/next.config.ts:99–100`; confirmed in local and public production headers.

The policy is `base-uri 'self'; object-src 'none'; frame-ancestors 'self'`. Those directives help, but it has no `default-src`, `script-src`, or `connect-src`. It offers no script-execution restriction if an injection bug is introduced. No exploitable browser XSS was demonstrated.

**Fix:** develop and test a nonce/hash-based CSP with explicit script, connection, frame, image, and font sources. Account for the current inline boot scripts/import maps, Google fonts, CDN scene imports, Supabase, and payment flows. Roll it out in report-only mode first. Production already supplies HSTS, so missing HSTS is not a finding.

### F1 — Medium: advertised image uploads over 1 MB fail and stay busy

**Locations:** `apps/web/src/features/events/components/editor/CoverImageUpload.tsx:44–57`, `events/cover-actions.ts:10`, `invitations/actions.ts:15`; no Server Action body limit override in `next.config.ts`.

**Reproduction:** uploading a valid 2,435,281-byte PNG to a disposable event passed client validation, then returned HTTP 500 with `Body exceeded 1 MB limit`. The UI remained on “Uploading Cover...” because the awaited action is not wrapped in `try/finally`.

**Cause:** the installed Next.js Server Action default is 1 MB, while both cover and invitation artwork paths advertise 5 MB. The invitation-art mismatch is source-confirmed; the cover flow was tested end to end.

**Fix:** use an authenticated bounded direct-upload flow or configure an appropriate request limit with multipart overhead and deployment limits considered. Always clear pending state in `finally` and show a useful error. Test an actual multi-megabyte valid image.

### F2 — Medium: signed-out team invitees lose the invite after signing in

**Locations:** `apps/web/src/app/(shell)/invite/[token]/page.tsx:36`, `apps/web/src/features/auth/components/SignInForm.tsx:53`.

The invite page redirects to `?redirectTo=/invite/<token>`, but the form reads only `next`; the action defaults to `/events`. This source-confirmed mismatch makes the invite flow require reopening the original link. The passing team test does not establish this signed-out return path works.

**Fix:** standardize on encoded `next`, keep `safeRedirectPath`, preserve the destination through signup too, and test signed-out acceptance from the original invitation link.

### F3 — Medium: CSV imports silently discard rows beyond 500

**Location:** `apps/web/src/features/guests/csv-parser.ts:96,170`.

The parser slices to 500 rows and reports `totalRows` from the sliced array. A 501-row synthetic CSV produced 500 valid rows, totalRows 500, and no error indicating the omitted row.

**Impact:** missing guests with a misleading import summary. The 500-row limit is reasonable; silently discarding excess input is the defect.

**Fix:** reject oversized row counts before proceeding, or explicitly show actual total, accepted count, and all omitted rows with a split/import-next-batch workflow.

### F4 — Medium: public demo calls to action lead to broken destinations

**Locations:** `apps/web/src/components/film/film-parts.tsx:868`, `components/site/site-header.tsx:315`, `app/(marketing)/product/page.tsx:107`.

- Film sample link `/rsvp?g=k701Qx` returned **404**.
- Header “Open a sample invitation” `/i/k701Qx` displayed **Pass Token Inactive or Expired**. The six-character sample also fails the invitation lookup's minimum length.
- Product link `/#invitation` points to a fragment absent from the homepage. The working sample section is on `/about#invitation`.

**Fix:** point public sample links at the existing sample experience or create a dedicated demo route backed by synthetic data. Add tests for the actual CTA targets, not just route status checks.

## Accessibility

### A1 — Medium: primary upload affordances are not keyboard-operable

**Locations:** `apps/web/src/features/events/components/editor/CoverImageUpload.tsx:139`, `apps/web/src/features/guests/components/import/CsvUploadDropzone.tsx:55`.

The initial cover-upload and CSV-drop areas are clickable `div`s with hidden file inputs. They lack native button semantics, keyboard activation, and focusability. A mouse can open the picker; keyboard users cannot reach the same initial upload action through those controls. This was confirmed from rendered control structure/source; the existing axe tests do not establish keyboard operability of every clickable element.

**Fix:** use a native button or accessible label/file-input pattern, provide visible focus, and verify Tab plus Enter/Space opens the picker. Retain drag-and-drop as an additional input method.

### A2 — Medium: additional axe scans found serious accessibility failures

See `evidence/ariya-public-audit.json` for exact selectors.

- Desktop homepage `#soundBtn`: `label-content-name-mismatch`. Accessible name is “Sound” while rendered text becomes “Sound off/on” (`components/film/film-parts.tsx:155`, `components/film/engine.ts:462`). Match the accessible name to the full visible label; the issue depends on hydration/visibility state and did not appear in every scan.
- Mobile `/docs` `pre`: `scrollable-region-focusable`, serious. The overflowing example cannot be reached for keyboard scrolling, particularly relevant to Safari. Make the region focusable and labelled or wrap/break the text so horizontal scrolling is unnecessary (`app/(marketing)/docs/page.mdx:132`).

These are automated findings, not a complete manual WCAG conformance assessment. Retest full-motion states, screen readers, zoom/reflow, keyboard focus, and native mobile browsers.

### A3 — Low: heading and landmark inconsistencies

- `/pricing` jumps from H1 to plan H3s; axe flags `heading-order` at `.price-row:nth-child(1) > h3`.
- Unavailable public-event and team-invite views lack a main landmark; axe flags `landmark-one-main` and `region`.
- `/docs` has a moderate `region` finding on the skip link; investigate landmark handling without removing the skip link.

**Fix:** use a coherent H1/H2/H3 hierarchy and semantic main containers in fallback views. Invalid streamed pages returned 200 with `noindex`; this alone was not classified as a data leak or an indexing blocker.

## Product trust and code quality

### T1 — Medium: signup asks for agreement to policies users cannot open

**Locations:** `apps/web/src/features/auth/components/SignUpTermsCheckbox.tsx:29`, `SignUpForm.tsx:52`; public route inventory.

Terms and Privacy Policy are plain text, not links; no corresponding policy pages were found in the app route inventory. The agreement is preselected. For an app storing contact details and dietary notes, users need a readable description of data use, retention, deletion, and contact channels before agreeing.

**Fix:** publish the actual policies, link them from signup/footer, and make acceptance an explicit informed choice. This is a product/trust finding, not a legal compliance determination.

### Q1 — Medium: event settings action trusts TypeScript input at runtime

**Location:** `apps/web/src/features/events/settings-actions.ts:26–55`.

`UpdateSettingsInput` is only a TypeScript interface. The exposed action calls `.trim()` on fields without a runtime schema. A malformed action payload such as a numeric/missing slug can throw instead of returning the action's documented result, and field/date bounds are not consistently checked here. Other actions already use Zod.

**Fix:** parse unknown input and IDs with a shared bounded schema before using them, validate dates explicitly, and return structured validation errors. Database authorization still applies; no RLS bypass is claimed.

### Q2 — Low: very large stateful modules make regressions harder to isolate

Examples excluding generated files: `HallStudio.tsx` 2,077 lines; film `engine.ts` 1,353; approvals `actions.ts` 1,018; `SettingsDesk.tsx` 1,014; `StudioPanels.tsx` 976.

Size is not itself a bug. It concentrates effects, state, rendering, persistence, and error handling, increasing review difficulty. The upload error handling and inconsistent email gates illustrate the value of shared boundaries.

**Fix:** prioritize extracting delivery authorization/idempotency and upload orchestration first, then separate hall/editor state transitions and persistence from presentation. Preserve behavior with the existing meaningful tests rather than rewriting purely for line count.

## SEO, AEO, and GEO

Here GEO means **generative engine optimization**; Nigerian geographic relevance was also reviewed in visible metadata. The following are opportunities unless explicitly described as a defect. No Search Console, analytics, indexed-query results, backlinks, or AI citation measurements were available, so ranking losses and AI visibility cannot be quantified.

| Area                       | Observed                                                                                                                                        | Recommended change                                                                                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary homepage intent    | Title is “Àríyá · The Yes”; H1 is “The Yes”. The description mentions Nigerian planning, but the most prominent search signals identify a film. | Preserve the film while giving the landing page a clear Nigerian wedding/event-planning title and a crawlable product summary with direct paths to invitations, RSVP, seating, and pricing.                                                                                    |
| Product title              | `/product` title is “What we do · Àríyá by OwambePlan”.                                                                                         | Use a descriptive planning/RSVP product title matching the page's actual purpose. Avoid keyword stuffing or invented geographic service claims.                                                                                                                                |
| Entity clarity for AEO/GEO | Home/about have no JSON-LD; `/product` has SoftwareApplication; pricing has visible FAQ and matching FAQPage; docs has WebPage/WebSite context. | Add consistent, factual Organization/WebSite identity, ownership/contact details, and verified sameAs links where available. Connect the software entity to that identity and add breadcrumb markup where breadcrumbs exist. Missing these schemas is not an indexing failure. |
| Useful answers             | Pricing FAQ and textual documentation already provide extractable answers.                                                                      | Expand clear answers on Nigerian guest-list workflows, WhatsApp sharing, exact free/paid limits, guest privacy, payment mode, and event expiry. Review claims against actual behavior, especially delivery caps and the broken sample journey.                                 |
| URL configuration          | Canonicals, sitemap, robots, and structured-data URLs hardcode `ariya-two.vercel.app`, which matches the deployment checked.                    | Centralize the production origin before any custom-domain move. This is portability risk, not a confirmed wrong canonical today. Preserve redirects and preferred-domain consistency.                                                                                          |
| Crawlability and privacy   | Five principal public URLs are listed in the sitemap; auth/invitation pages have noindex response protections.                                  | Retain private-page protections; submit/monitor the sitemap and important URLs in Search Console. Do not add guest tokens or private event data to public discovery files.                                                                                                     |
| Performance                | Production pages were reachable; no field Core Web Vitals or controlled performance profile was collected.                                      | Measure LCP, INP, and CLS with production RUM/CrUX and mobile lab tests before prescribing performance fixes. Do not interpret the timed-out axe scan as a measured Core Web Vital.                                                                                            |

Google says existing SEO fundamentals apply to AI features; there is no special AI schema or required AI text file. An absent `llms.txt` is therefore **not** reported as an error. See [Google Search Central's AI features guidance](https://developers.google.com/search/docs/appearance/ai-features).

## Defenses that held in the tests

- Anonymous `/events` requests redirected to signin, including a legacy middleware-subrequest bypass probe.
- Anonymous cron access returned 401; unsigned payment webhook returned 401.
- MCP rejected missing/forged bearer tokens; an unapproved Origin returned 403. Existing MCP tests also exercised cross-host access refusal.
- A separate authenticated outsider received zero rows when reading the disposable owner's guests or updating its event. Database tests covered broader role, RLS, token, storage, payment, expiry, and proposal restrictions.
- Cross-origin Server Action request was rejected. Redirect handling did not send the tested auth callback to an external destination.
- `/.env.local` and `/.git/config` probes returned 404 locally. No selected high-confidence key patterns appeared in current tracked files.
- Production headers included HSTS, nosniff, frame restriction, and referrer policy. The CSP limitation is described separately above.
- Installed Next.js was 16.4.3 and the app declares sharp 0.35.5. These are beyond the relevant patch baselines in the [official October 14 Next.js advisory](https://nextjs.org/blog/nextjs-security-update-october-14-2026). This selected advisory comparison is not a clean bill of health for every dependency.

## Limits and next verification

This audit did not test production data authorization, actual payment-provider settlement, live mail deliverability, cloud IAM/egress, DNS takeover, backups/restoration, DDoS resilience, complete dependency advisories, all git-history secrets, mobile Safari/VoiceOver, or breach indicators in hosting/auth logs. There was no high-volume load test and no destructive production testing. The local mail provider rejects the tested delivery API; successful production delivery was not inferred from local test success.

The immediate remediation order is **S1–S4**, then the upload failure, email HTML/state handling, and broken user journeys; follow with keyboard accessibility and search/entity improvements. After fixes, rerun the targeted reproductions with secure expectations, the original suite, and a separately scoped production/staging verification using safe test accounts and production-equivalent configuration.

No application code was changed or deployed by this audit. Only this report, evidence, and the archived reproduction harness were added.

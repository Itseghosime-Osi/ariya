# Àríyá quality remediation

Status: implemented locally on `fix/quality-without-redesign`, based on main `f2ca079`. Not deployed. No hosted database, Vercel, Paystack or authentication settings were changed. Existing dashboard-top-bar work in the separate checkout was not modified.

## Design preservation

No CSS files or inline stylesheet blocks were changed. Layouts, colours, fonts, images, components and animation settings remain in place. Approved visible changes correct pricing/product-status wording and make sample RSVP messages explicit about not sending email. Previously broken demo panels now display their existing sample content.

The wax seal reuses the same SVG drawing for its two animated halves, instead of duplicating its text. Its accessible label includes the visible initials. The isolated before/after seal screenshots have identical pixels. Full WebGL animation and real-font rendering could not be certified in this environment; comparison used reduced motion and disabled WebGL. This is not a blanket assertion of pixel equality for every route.

## Changes and verification

| Finding                           | Change                                                                                                                                                                                    | Verification                                                                                                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product/About demo script missing | Restored the original tab-local sample-data script from repository history; no production data or messages involved                                                                       | Guest search, vendor checkbox updates, nine sample tables, About accept/decline/reset pass at 390px and 1440px with no page exceptions                                                                                        |
| Incorrect prices and status       | Marketing matches the existing ₦50,000 checkout; free tier says 20 guest invitations; Planner uses the same per-event pass; unsupported SMS-reminder and unbuilt-account claims corrected | Regression tests compare advertised price to the checkout constant; payment amount unchanged                                                                                                                                  |
| Invitation privacy                | Generic metadata omits guest names; personal-link/auth/dashboard routes receive noindex, nofollow, noarchive, no-referrer and private/no-store headers                                    | Local production-server HTTP check confirms headers and metadata on the invalid invitation route; personal links excluded from sitemap                                                                                        |
| Dependencies                      | Upgrade Zod and compatible form resolver, preserve existing GUID acceptance rules, override PrismJS to patched release; use Sharp 0.35.5 for validation                                   | 220 unit tests pass; audit has no high/moderate/critical findings                                                                                                                                                             |
| Unpatched deepmerge advisory      | pnpm patch uses own data-property definitions rather than prototype setters, covering source, CJS and UMD builds                                                                          | Regression tests cover attacker-controlled target and null-prototype source cases plus ordinary nested merges. Audit still reports the low advisory because upstream version 4.3.1 has no published fix; it is not suppressed |
| Mobile accessibility              | Explicit sound/music names; seal name matches its initials without duplicate text; global search input labelled                                                                           | Marketing axe scans at 390px/1440px: original sound/seal failures resolved; no horizontal overflow. Automated checks do not establish full WCAG conformance                                                                   |
| Direct guest RPC abuse            | New migration enforces limits inside get_invitation/get_check_in_code (40/minute/token) and submit_rsvp (10/minute/token); counters only allocated for existing tokens                    | Eight new pgTAP assertions prepared, but not run. Local container pull failed; migration remains unverified and unapplied                                                                                                     |
| Canonicals/indexing               | Canonical production URLs and OG URLs, public sitemap/robots, permanent .html redirects, public-event canonical URLs                                                                      | Local HTTP checks and source regression tests pass; public marketing pages remain crawlable                                                                                                                                   |
| GEO/AEO                           | Organization/WebSite/SoftwareApplication structured data and FAQ markup consistent with visible answers                                                                                   | JSON parses and content/price regression tests pass. No invented ratings, testimonials, adoption numbers or promised ranking gains                                                                                            |
| Film loading                      | Three independent environment textures load concurrently with the original texture fallback                                                                                               | Same texture assets, shaders, pixel ratio and animation code retained; no measured live Core Web Vitals improvement claimed                                                                                                   |
| Redundant requests                | Invitation metadata no longer queries guest data; request-scoped public-event memoization; static marketing skips auth lookup                                                             | Route-proxy tests pass; no persistent or cross-user cache introduced                                                                                                                                                          |
| Search request volume/races       | 250ms debounce, cancellation on close/clear, stale-response guard, bounded server input and generic DB errors                                                                             | Tests cover typing burst, clearing an in-flight query and closing before dispatch                                                                                                                                             |
| Cover upload content              | Decode/validate actual JPEG/PNG/WebP bytes, reject malformed or mismatched files; bound decoded size to 40 megapixels                                                                     | Tests cover all three supported formats, byte preservation, disguised HTML, mismatched MIME and truncated data                                                                                                                |
| Response hardening                | nosniff, same-origin framing, referrer policy, CSP base-uri/object-src/frame-ancestors                                                                                                    | HTTP checks pass; same-origin film embeds and payment integrations remain allowed. This is a limited compatible CSP, not complete script-injection protection                                                                 |

## Cover-sharing limitation accepted by owner

The event-covers bucket remains public, as requested. Anyone who knows an existing cover-image URL can still load it, even if its event is private. Making an event private does not revoke that URL. Valid uploads are not recompressed or stripped of metadata. Do not treat cover URLs as access-controlled documents.

## Validation

- TypeScript, ESLint, Prettier and git diff whitespace checks pass.
- Sign-in, forgot-password and invalid-invitation pages have no axe violations or horizontal overflow at 390px and 1440px in the mocked-font production build. This does not verify authenticated pages or original-font contrast/layout.
- 37 unit-test files, 220 tests pass.
- Production build passes using the Next font-download mock, with webpack. This verifies compilation and route generation; it does not verify real font fetching or the normal Turbopack build.
- Ordinary build fails: `Failed to fetch Bodoni Moda from Google Fonts.` and `Failed to fetch Plus Jakarta Sans from Google Fonts.` A direct request returns `CONNECT tunnel failed, response 403`. Application font configuration was preserved.
- Bundle check passes: no Three.js or GSAP in the 81 app client chunks of the webpack validation build.
- Database tests were not run: registry initially returned `Get "https://public.ecr.aws/v2/": Forbidden`; alternate image pull failed with `failed to register layer: no space left on device`. No hosted fallback was attempted.
- Authenticated planner flows, real emails, payment webhooks and production RLS were not retested against the hosted project. No accounts, payments or production data were created.

## Installed requested skills

Installed locally for the agent: seo-audit, seo-geo, seo-aeo-best-practices, accessibility, ahrefs-python, gsap-performance, performance-optimization, security-review, application-security-testing and find-security-vulnerabilities-in-code. Full command output and supporting-file locations are retained outside the repository in `/workspace/ariya-remediation/skill-output` and `installed-skills.json`.

The requested `convex-performance-audit` command returned no matching skill. Àríyá uses Supabase; no Convex runtime or substitute dependency was added.

Ahrefs checks could not run without AHREFS_API_KEY. Strix scans could not run without a configured STRIX_LLM and LLM_API_KEY and a scan budget. The invoked Strix supporting skill instructs: “Ask the user for these if unset. Never hardcode or commit keys.” Its instructions are retained at `/workspace/ariya-remediation/skill-output/penetration-testing-with-strix.txt`. No private source was uploaded to an external scanner. The completed security work is code review, dependency inspection and local regression testing, not a completed penetration test.

## Before deploying

1. Run the normal build with access to Google Fonts and run the full local Supabase pgTAP suite in an environment with adequate container disk space. Resolve failures before approving deployment.
2. Review `20261029000000_guest_rpc_rate_limits.sql`. Link the intended hosted project from a clean checkout and show `supabase db push --dry-run --linked` output. Obtain the owner's explicit confirmation before applying. Do not seed production, push local auth config, or run local reset-style tests against production.
3. Recheck deployed headers, canonical URLs, crawlability, authenticated planner flows, real fonts/film rendering and mobile accessibility. Measure real-device Core Web Vitals; no numeric performance score is claimed here.
4. Keep gateway/IP-level abuse protection: the new database limits constrain successful known-token access, not distributed random-token traffic or all denial-of-service scenarios. Existing app IP limits remain in place.
5. Revisit the deepmerge patch when upstream publishes a fix. Optional Ahrefs/Strix verification requires credentials configured privately in the environment.

## Evidence outside the repository

`/workspace/ariya-remediation/` contains unit/type/lint/format/build logs, before/after dependency audits, HTTP results, desktop/mobile screenshots, browser/interactive-demo results and the design comparison. These are local artifacts, not deployment or live-site evidence.

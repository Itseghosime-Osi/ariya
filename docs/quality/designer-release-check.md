# Release check for the invitation studio

Run this before each release that touches the studio. It keeps `designer-redesign-checklist.md` honest.

## 0. Start from the report

Run `pnpm check:checklist` in `apps/web`. It lists the open items, the closed items whose evidence is undated or older than 60 days (set `STALE_DAYS` to change that), and any evidence link that no longer exists. Re-check those first, then update the item's note with the new date and evidence. A unit test keeps the counts in the close-out summary equal to the items, and fails when a closed item has no proof line or a link points at a missing file.

## 1. Automated

1. `pnpm lint && pnpm typecheck && pnpm test` in `apps/web` (designer unit tests are in `src/features/invitations`).
2. CI: Lint/types/unit/build, pgTAP, Rust, bundle check and the Playwright E2E suite must all pass on the release commit. The E2E suite takes about 35 minutes; do not push while it runs, because a push cancels it.

## 2. Local browser harness (no sign-in)

From `docs/quality/evidence/harness/README.md`: copy `fixture-page.tsx` into the excluded `zz-fixture` route, run `pnpm dev`, then run the batches that match what changed:

- `batch19` help, empty state, offline status, export summary
- `batch20` drag readout and undo toast
- `batch21` command palette, quick tour, long names, 60-layer drag timing
- `batch23` all layout presets with long names
- `batch24` print guides and PDF bleed
- `batch25` inspector sections
- `batch26` SVG, PDF, .ai and .psd import (needs the sample files described in the batch)
- `batch27` zoom presets
- `batch28` control names and keyboard tour
- `batch29` axe contrast scans, light and dark
- `batch30` WhatsApp export size
- `batch31` Try again on failed uploads

Any failed check is either fixed or written into the checklist as a known defect with its evidence file.

## 3. Performance budget (checklist E1)

With 60 layers (the studio's maximum), dragging a layer must keep the **95th-percentile frame under 100 ms**. Measure it on a **production build** (`SKIP_ENV_VALIDATION=1 next build`, then `next start`) with `batch51.mjs` (set `BASE`); the development build is several times slower and gives misleading numbers. Last measured (2026-11-13, production build, headless Chromium): median 16.7 ms, p95 16.7 ms and no long task, also with the CPU slowed 4x. A real mid-range phone has not been measured; record it here when someone runs the harness on one.

## 4. Update the documents

1. Re-open `designer-redesign-checklist.md`: move a status from open to closed only with a test, screenshot or measurement saved under `docs/quality/evidence/` or `screenshots/`.
2. Regenerate `designer-complaint-map.md` (it is built from the checklist headings and status).
3. Re-read `designer-heuristic-review.md`; add findings for anything new.
4. Record the date and commit of the check below.

## Check log

| Date       | Commit                      | Who                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | --------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-13 | feat/studio-checklist-close | Claude, for the owner | Full re-check after the studio tidy and polish. Closed 31 more checklist items with evidence (`evidence/closeout-*.json`); 20 remain, each with a reason in the checklist (people and devices, owner decisions or backend, Firefox and WebKit, judgement). Found and fixed on the way: History panel contrast in both themes, a raw browser error shown on a failed export, a blocked font changing an export silently. The first contrast scan did not switch panels (they are buttons, not tabs) and was thrown away; the corrected scan is the one recorded. |

## 2026-11-13, follow-up: open items closed

- B1/B6: Chromium, Firefox and WebKit all export PNG, JPEG, PDF and JSON with accented file names; a `cross-browser` CI job now runs `designer-export-names.spec.ts` in Firefox and WebKit (reporting only for now).
- D1, K5, L6: Simple mode opens with seven items; the options bar shows type controls for a selected text layer; the Pro inspector has "More options" (remembered). Four e2e specs open it first via `showAllInspectorOptions`.
- D7, L5: five help clips in Help; the emulated 350 px-tall phone window keeps focused fields visible.
- A3, F3, H2: brand styles and Stack, saved versions, per-layer text fit. Rust model gained `textFit`, `textStyles`, `styleId`; wasm rebuilt and the generated types refreshed.
- J1: anonymous studio metrics, migration written and not applied. F3's migration is also not applied.

# Release check for the invitation studio

Run this before each release that touches the studio. It keeps `designer-redesign-checklist.md` honest.

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

With 60 layers (the studio's maximum), dragging a layer must keep the **95th-percentile frame under 100 ms** in the harness (`batch21`, headless Chromium, dev build). Last measured: median 16.7 ms, p95 66.6 ms. A phone measurement is still missing; record it here when someone runs the harness on a mid-range phone.

## 4. Update the documents

1. Re-open `designer-redesign-checklist.md`: move a status from open to closed only with a test, screenshot or measurement saved under `docs/quality/evidence/` or `screenshots/`.
2. Regenerate `designer-complaint-map.md` (it is built from the checklist headings and status).
3. Re-read `designer-heuristic-review.md`; add findings for anything new.
4. Record the date and commit of the check below.

## Check log

| Date | Commit | Who | Notes |
| ---- | ------ | --- | ----- |

# Àríyá invitation designer — continuation handoff

Updated 10 November 2026. Repository: `Itseghosime-Osi/ariya`. Work branch: `feat/studio-pro-designer`. Latest implementation checkpoint when this handoff was written: `2de7e2e`.

## Start here

1. Read repository instructions, `CONTRIBUTING.md` and `apps/web/AGENTS.md`. Read the relevant installed Next.js documentation before changing frontend code.
2. Read the [283-item checklist](designer-checklist.md), [CSV status matrix](designer-test-matrix.csv), [verification record](designer-verification.md) and [control inventory](designer-control-inventory.md).
3. Inspect the current branch, working tree and recent commits before editing. Preserve other work. Stay on the feature branch; this handoff does not authorize merging or deploying production.

The checklist and matrix are committed repository files, not temporary artifacts. Current totals: **214 Pass, 21 Partial, 0 Not tested, 48 Not applicable** (see the 10 November continuation in the verification record; save/reload and exports were not re-run in that session). Only verified passes have checked boxes. Do not report the whole designer as finished.

## Product and design requirements

- This is an invitation editor for event hosts, not a general-purpose Photopea clone. It opens the event's existing template immediately. Do not require a blank canvas or paper-selection step.
- Keep Àríyá's ivory, burgundy and gold, existing typefaces, real logo and brand pattern. Improve usability without replacing the visual identity or removing existing features.
- Support Simple and Pro modes, desktop, phone, tablet and short landscape windows. Preserve keyboard access, focus, reduced motion and dark mode.
- Keep Rust/WASM as the design engine and Next.js/React as the frontend. Generate Rust wire types rather than maintaining hand-written copies. Keep the TypeScript fallback and WASM behavior in parity.
- Complete each task through editing, undo/redo, saving, reloading and independent export inspection. A visible control or source implementation alone is not evidence of a pass.

## Already implemented and verified

See the verification record for the full scope and evidence. Recent work includes serialized autosaves and stale-tab protection; recovery drafts; live independent corner widgets; rotated resizing and group transforms; responsive panels; keyboard menus; image replacement; guarded document-resolution PNG/JPEG/PDF exports; and guest rendering of the saved host artwork.

Checkpoint `2de7e2e` adds rotation-aware pass placement constraints in Rust and TypeScript, safe rounded-paper clearance, restoration of automatic pass adjustments on canvas Cancel/Undo, a protected foreground seal, measured backing plates for overlapping artwork and QR-only camera retries at 600px/400px after the original decode misses. Circular brand markers remain, with exact reserved QR modules and a four-module quiet zone. Some oversized raw ZXing crops still miss; the retry policy recovers the tested examples. Do not claim universal decoding or physical-camera verification.

Guest integration covers acceptance/decline, a party of three, companion and dietary details, revision to one attendee, card-off artwork retention and phone/desktop personal-pass exports. Personal links and pass codes remain in test memory, not shared evidence.

## Remaining priorities

Use individual checklist IDs and recorded limitations to choose bounded batches. Do not infer that every item below is entirely missing; many need broader acceptance coverage.

1. Selection and manipulation: overlapping-object selection, marquee, handle/modifier/zoom combinations and mixed groups containing a pass near paper boundaries.
2. Layout workflows: complete align/distribute/snap/history cases and background/template combinations.
3. Images and output: offered masks, edge/effect combinations, visual export comparisons, long names, tiny-document output and scan readability.
4. Interaction coverage: all offered shortcuts, manual keyboard and screen-reader review, and the native OS eyedropper.
5. Browser/device coverage: Safari, Firefox, physical iOS/Android, touch/stylus, real camera/video and printed-pass scans. Chromium emulation does not substitute for physical-device evidence.

The 47 Not applicable items include unoffered raster retouching, path/Bézier editing, RAW/PSD, channels, nested groups, multi-page and video tools. Leave them visible and unchecked; do not build them solely to fill the comparison checklist.

## Where to work

- Editor: `apps/web/src/features/invitations/components/designer/`
- Document model, TypeScript engine/fallback and exports: `apps/web/src/features/invitations/`
- Rust engine: `crates/design-core/`; generated types: `packages/design/src/generated/`
- Committed engine binary: `apps/web/public/wasm/ariya_design.wasm`
- Guest pass: `apps/web/src/features/invitations/components/InvitationCard.tsx`, `EntrySeal.tsx`; guest download component: `apps/web/src/features/rsvp/components/MyInvitation.tsx`
- Camera: `apps/web/src/features/check-in/components/CheckInCameraScanner.tsx`, `scaled-pass-retry.ts`
- Acceptance suites: `apps/web/e2e/designer-acceptance.spec.ts`, `designer-controls.spec.ts`, `designer-guest.spec.ts`, `designer-pass-layout.spec.ts`
- Independent exported-image inspection: `apps/web/e2e/fixtures/invitation-image.ts`
- Reviewed evidence: `docs/quality/evidence/`; screenshots: `docs/quality/screenshots/`

## Verification and setup boundaries

Use Node 24 and the pnpm version pinned in `package.json`. Follow the repo's Rust toolchain file. Previous checks passed: **1,101 unit tests across 115 files, 247 Rust tests, four designer browser suites, production build, TypeScript, ESLint and formatting**. These describe the checkpoint, not changes you have yet to make.

Before pushing, run the required repository checks:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

When Rust changes, also run `cargo test --workspace`, `cargo fmt --all --check`, regenerate affected wire types using the crate's generation workflow and run `pnpm build:wasm`. Commit the rebuilt WASM and generated types. Run the relevant browser suites against the actual local Next.js app and local Supabase.

Inspect `apps/web/playwright.config.ts` and `e2e/fixtures/test-helpers.ts` before browser runs. Authenticated suites require local backend credentials supplied through the process environment. The prior cloud session used an already running local app on port 8131, local Supabase API on 57321 and temporary external Playwright configurations. Those temporary runners are not portable repository setup. Configure the current test environment explicitly; do not point destructive fixtures at production. Disable credential-bearing traces and avoid screenshots of authentication fields. Reuse local fictional fixture users where supported.

Never print, log, commit or write secrets to files. Do not create or edit `.env*` files for this task. Do not change production Supabase, Vercel, Paystack, auth or delivery settings; run hosted migrations, seeds or reset tests; create production test accounts; or send real invitations. Public cover-image sharing is deliberately retained; document its limitation rather than changing that policy.

## Recording progress

For every completed batch, update both the Markdown checklist and CSV matrix, preserve their IDs and recompute totals. Add concise evidence with expected/actual behavior, browser/device and scope. Leave Partial and Not tested unchecked. Keep personal guest links, codes, images and secrets out of reports. Update the verification record with actual checks and unresolved failures. Commit and push cohesive checkpoints to `feat/studio-pro-designer`; report the commit and what remains.

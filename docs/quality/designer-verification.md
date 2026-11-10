# Invitation studio verification

Work branch: `feat/studio-pro-designer`, based on `7b415de`. Updated 10 November 2026.

This is a verification record, not a statement that all 283 comparison checks pass. The [live checklist](designer-checklist.md) and [CSV matrix](designer-test-matrix.csv) retain every comparison item. Checked boxes mean verified acceptance checks. Partial and untested checks remain unchecked. Blank-document creation is not applicable: the event already supplies the invitation template.

## Changes

- Keep the event invitation in view on arrival. Paper and canvas presets remain available under optional document settings.
- Use the existing Àríyá colours, typography and actual logo. Separate desktop tools, artwork and properties; use collapsible phone/tablet panels and a horizontally scrollable tool rail. Support short landscape windows, dark mode and reduced motion.
- Correct live corner movement at all four corners and after rotation. Report document pixels, restore cancelled edits and record one undo operation per gesture.
- Resize rotated rectangle/image boxes in their local axes instead of forcing their proportions or resizing along screen axes.
- Serialize autosaves so an older request cannot overwrite a later edit. Keep failed writes dirty, offer retry, and flush pending changes before internal navigation.
- Make menus and export dialogs use the existing Radix primitives. Protect fields/dialogs from document shortcuts; restore focus on closing export.
- Correct duplicate/import/sampler shortcuts, enforce the paste layer limit, separate copied group identities and preserve frontend effects through Rust duplication.
- Give 100% zoom its document-pixel meaning, provide actual-size and Fit commands, and space ruler ticks according to zoom. Replace the navigator placeholder with actual artwork, a live viewport and click/keyboard navigation.
- Export at document resolution, wait for fonts/images, remove selection outlines and editing overlays, cap canvas allocations and accurately describe flattened PDF output.
- Restrict the export image proxy to the configured public invitation-artwork storage bucket, reject redirects/non-images and cap response size. Current public-image sharing behavior is retained.
- Keep the fresh template's RSVP deadline beside its entry seal, deduplicate repeated venue parts and improve long-field spacing. Existing saved layouts retain their positions.
- Load saved database documents correctly instead of rebuilding the default invitation on refresh. Use an optimistic revision check to reject stale tab writes, and keep a per-tab recovery draft for failed saves.
- Preserve alpha-capable formats during image optimization and validate background images before export. Add missing blue-channel editing and keyboard colour-picker access.

## Browser checks

Chromium ran the actual React designer and committed Rust/WASM artifact in an isolated Vite fixture. Next.js links/images were replaced by ordinary elements for that fixture. Saves used browser storage with an injected failure switch; uploads were mocked. These checks do **not** verify production authentication, server actions, hosted persistence or storage.

Fictional event data was used throughout the screenshots.

| Check                                                               | Result                                                                     | Evidence                                                                                          |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Simple/Pro and light/dark mode switches                             | Pass                                                                       | [Functional results](evidence/functional-results.json)                                            |
| Selection, nudge, undo/redo, failed save/retry                      | Pass in fixture                                                            | [Functional results](evidence/functional-results.json)                                            |
| Four corner widgets, inward drag, Escape, undo/redo, rotation       | Pass                                                                       | [Corner results](evidence/corner-results.json)                                                    |
| Numeric radius, independent corner, relink, outward zero clamp      | Pass                                                                       | [Detailed controls](evidence/detail-results.json)                                                 |
| Rotated side resize                                                 | Pass: width follows local axis, height stays unchanged                     | `resize-transform.test.ts`; Chromium corner fixture                                               |
| Copy/paste, duplicate, deselect, malformed backup                   | Pass                                                                       | [Detailed controls](evidence/detail-results.json)                                                 |
| Lock/unlock, visibility, flip state, default/swap colours           | Pass for exercised operations                                              | [Guard results](evidence/guard-results.json)                                                      |
| Rulers/grid toggles, navigator artwork/viewport/navigation          | Pass for exercised operations                                              | [Guard results](evidence/guard-results.json)                                                      |
| Touch drag/undo and all phone panel tabs                            | Pass in Chromium touch emulation                                           | [Mobile results](evidence/mobile-results.json)                                                    |
| All 15 mobile tool buttons remain reachable by horizontal scrolling | Pass                                                                       | [Mobile results](evidence/mobile-results.json)                                                    |
| Export dialog keyboard focus and phone PDF download                 | Pass                                                                       | [Detailed controls](evidence/detail-results.json), [mobile results](evidence/mobile-results.json) |
| PNG/JPEG/PDF/JSON downloads and independent output inspection       | Pass for house template                                                    | PNG 3240×4536; JPEG 2160×3024; PDF 360×504pt with 1500×2100 raster                                |
| Phone, tablet, desktop and landscape layout                         | Pass for exercised layouts; no horizontal page overflow or page exceptions | [Responsive measurements](evidence/responsive-results.json)                                       |

Viewports: 375×812, 390×844, 768×1024, 1024×768, 1440×950, 1920×1080 and 844×390. Both Simple and Pro modes were checked. Physical iOS/Android devices, stylus, Firefox and Safari remain untested.

The PDF is flattened artwork at 5 inches wide and 300 DPI, not editable vector text. PNG/JPEG dimensions are limited for very large documents and reported before download.

## Authenticated integration verification

The local Supabase auth/storage API routing issue was isolated to container loopback health probes being sent through the outbound proxy. Internal/loopback exclusions were added to the local test containers while retaining their outbound proxy configuration. Auth and storage API endpoints returned 200, and authenticated Next.js tests could run. No production settings were changed.

`studio-checklist-audit.spec.ts` passed. The added `designer-acceptance.spec.ts` also passed against the real Next.js app and local Supabase, covering:

- Saved document reload and Simple/Pro round trips.
- Geometry, persisted aspect locks, independent corners and safe numeric input.
- Offline edit recovery after reload and rejection of stale writes from another tab.
- Inline text focus, commit, Escape cancellation and undo/redo.
- Editable JSON backup round trips and malformed backup rejection.
- Colour edits on house text, synchronized HEX/RGB channels and keyboard colour-field operation.
- Grid snapping, guide creation, locking, unlocking and clearing.
- PNG/JPEG/WebP uploads, saved image references, contain/cover, focal positioning and frame-preserving replacement.
- Damaged-file rejection followed by successful export.
- PNG/JPEG/PDF downloads with uploaded images and phone/tablet/desktop control reachability.

[Authenticated test evidence](evidence/authenticated-acceptance.json). The exported PNG sample pass also decoded successfully with ZXing. No real guest entry code was used.

The older isolated-fixture measurements remain supplementary evidence. Current desktop/phone screenshots below come from the authenticated Next.js test, restored to the clean invitation template after testing.

## Work remaining

The matrix deliberately retains partial and untested items; this branch does not claim that all 283 comparison checks pass. Remaining work includes the complete transform/handle/gesture matrix, group transforms, crop interaction semantics, every offered text/font/shape/effect combination, export visual comparisons across those combinations, full keyboard/accessibility checks, and broader browser/device testing. Photopea-only raster retouching, RAW, PSD, channels, multi-page and video workflows are comparison items and are not implemented by this change. Their scope classification is still open in the matrix.

## Regression checks

- Production Next.js build, with build-only environment placeholders: pass.
- TypeScript and ESLint: pass.
- Unit tests: 871 passing across 103 files, including Rust/TypeScript parity, save queue failures/races/history limits, corner projection, rotated resizing, export sizing and image-proxy restrictions.
- Rust workspace tests: 246 passing. Rust/WASM artifacts were rebuilt with the pinned Rust 1.99.1 toolchain.
- No new application dependencies, production debug routes, environment files, deployment changes or database migrations were added.

## Screenshots

[Desktop](screenshots/studio-desktop.png) · [Phone](screenshots/studio-mobile.png) · [Phone properties](screenshots/studio-mobile-panel.png) · [Corner controls](screenshots/studio-corner-controls.png)

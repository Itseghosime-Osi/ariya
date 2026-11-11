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
- Resize selected groups as one proportional unit, including typography, corners and effects; retain an opposite anchor and constrain the group before any child exceeds model limits.
- Give canvas sizing a genuine Apply/Cancel session and one undo entry. Clamp extreme pixel dimensions consistently in Rust and TypeScript; label this as document resizing rather than image cropping.
- Cancel exports while fonts, pictures or raster work are pending. Remove temporary artwork and prevent a late download; retain the paper's inset border while excluding its outer studio shadow.
- Draw equal-sided shapes with Shift and draw from the centre with Alt. Discard drawing previews on Escape, pointer cancellation or window blur; clean up listeners on unmount.
- Replace the shape flyout with Radix keyboard/focus handling. Correct Layers list semantics and nested controls, accessible label mismatches, numeric-unit contrast and segmented radio keyboard operation.
- Use working fallback font stacks and accurate typeface labels. Reset the sampler after all outcomes and offer manual colour controls if screen sampling is unavailable or denied.
- Keep a design-backup picker mounted independently of layer selection and expose it in File. Switching an imported mixed fill/gradient layer to solid now clears the gradient.

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
- Canvas-size Apply/Cancel/undo, group movement/scaling and exact undo/redo.
- Shift/Alt drawing and preview cancellation on Escape, pointer cancellation and window blur.
- Sampler API success, cancellation, rejection and unavailable-browser outcomes using API doubles. Native OS screen sampling remains manual.
- Offered font families, size/weight/italic, all three alignments and four case modes, tracking/line height and persisted typography.
- Zero axe violations in the exercised desktop and phone editor views, light and dark, and in the open shape menu. User artwork is excluded from the interface scans.
- PNG/JPEG/PDF downloads with uploaded images and phone/tablet/desktop control reachability.

[Authenticated test evidence](evidence/authenticated-acceptance.json). The exported PNG sample pass also decoded successfully with ZXing. No real guest entry code was used.

`designer-controls.spec.ts` separately verifies all eight shape insertions, shape geometry, linear/radial/no/solid fills, imported mixed-fill recovery, outline colour/width, all twelve blend modes, keyboard filter/opacity sliders, soft/foil/glow effects, rename, hide/show, both flips, exact 90/180-degree rotation, front/back stacking and delete/undo. It also scans the open gradient controls with axe. [Control evidence](evidence/controls-acceptance.json).

[Interface accessibility results](evidence/interface-accessibility.json) retain the tested viewport/theme combinations. Automated results do not establish complete accessibility or native device support.

The older isolated-fixture measurements remain supplementary evidence. Current desktop/phone screenshots below come from the authenticated Next.js test, restored to the clean invitation template after testing.

## Guest invitation and pass regression verification

`designer-guest.spec.ts` uses a fictional event, a reused local host account and a separate signed-out browser context. It verifies saved Unicode wording, uploaded image references and geometry, required single-pass guards, acceptance and decline, and access-card off/on transitions. Switching cards off now keeps the saved design rather than substituting generic artwork; entry-code lookup and fallback code text are skipped in that state.

Guest PNG downloads use the same bounded, font/image-aware exporter as the studio. Phone and desktop output is 3240 × 4536 pixels, with independent image-pixel checks and ZXing decoding against the personal code held only in test memory. An imported hidden seal with zero opacity, blur, mirroring, screen blending and unreadable colours is restored and remains scannable. The four standard theme palettes are unchanged. No guest URLs, codes or downloaded personal-pass images are saved in the evidence. [Guest test evidence](evidence/guest-acceptance.json).

Component tests cover duplicate download prevention, failure/retry, cancellation on unmount, card-off artwork, sample/personal pattern separation and destructive-effect isolation. Readability safeguards do not establish every possible pass placement or physical-print scan condition.

## Pass placement and scanning safeguards

The Rust engine now exposes a generated `constrainEntrySeals` edit. The TypeScript fallback agrees with it; a cached older WASM engine safely falls back if it does not recognize the edit. Only pass positions/sizes are constrained. Decorative bleed, colours and other layer data are retained. Constraints account for rotated bounds, rounded paper corners, minimum seal width and border clearance. A 960-case geometry matrix verifies rotated corners and idempotence; native Rust and WASM parity tests also exercise the operation.

Canvas resize Apply/Cancel/Undo restores any automatic pass adjustment along with the paper. Rounded paper radii now use document-relative units at fitted and native sizes. Passes occupy a protected foreground layer, reflected in the Layers panel. Actual rendered bounds determine when an opaque backing plate is needed; resize/font changes and native export dimensions are rechecked. Clear layouts retain their backing appearance.

The seal retains its circular crest, colours and data dots. Functional timing/alignment/format modules use exact square cells, and the foil sits beyond a complete four-module quiet zone. ZXing still misses some oversized rotated crops at native resolution. The actual QR-only camera fallback now retries unreadable frames at 600px and 400px maximum dimensions, retaining the original attempt for small-code detail. These frames stay in memory; no media is uploaded or retained. Unit tests cover retries, canvas reuse, readiness, missing context and camera cleanup/reporting.

`designer-pass-layout.spec.ts` checks imported extreme placements on sharp, rounded and deckled paper, numeric clamping, undo/redo/reload, foreground pinning, overlap plate activation/removal and exported sample decoding through the same retry policy. [Placement evidence](evidence/pass-layout-acceptance.json). It does not claim that every oversized raw ZXing input decodes or that physical cameras/prints have been tested.

The guest integration check also verifies a party of three, companion/dietary persistence and a revision to one attendee that clears the companion while keeping dietary information. No additional production accounts, hosted database changes or delivery settings are involved.

## Checklist continuation (10 November 2026)

This session had no Docker or local Supabase, so the authenticated suites could not be re-run. Instead, the real `InvitationDesigner` was mounted on a temporary no-login test page with fictional event data ([harness](evidence/harness/README.md)) and driven in Chromium 1440×900 (one phone check at 390×844). Server actions are not mocked, so saving fails there. These batches therefore verify editing, selection, undo/redo, history and layout. **Save, reload, uploads and exported files were not re-verified here**; the earlier authenticated results above still stand for the code as it was.

Fixes found by these checks:

- Vertical align/distribute used a guessed height for text layers (they have no stored height), so middle/bottom and equal gaps were wrong. They now measure the rendered boxes and leave the layers auto-sized.
- Typing into a text layer reversed the characters: the editor re-rendered the words from state on every keystroke and reset the caret. The browser now owns the text while editing.
- A text edit ended by clicking another layer or the empty card was not recorded, so Undo skipped it. It is now recorded.
- A hidden, closed menu dialog elsewhere on the page disabled arrow-key nudges, undo and delete. The shortcut guards now ignore hidden dialogs.
- Three Layers footer buttons and the theme switch lacked a name or tooltip.

Interface changes: History steps say what changed ("Moved Adaeze & Tunde", "Hid …", "Added Rectangle"); the Type tool opens a new text layer ready to type; the Properties / Layers split in the side panel can be dragged, moved with the arrow keys and reset by double-click.

Evidence: [batch 1](evidence/studio-batch1.json) selection and movement; [2](evidence/studio-batch2.json) align, distribute, snapping; [3](evidence/studio-batch3.json) accessibility names, overlap, history; [4](evidence/studio-batch4.json) panel split; [5](evidence/studio-batch5.json) rotate, resize, zoom; [6](evidence/studio-batch6.json) corner radius; [7](evidence/studio-batch7.json) text; [8](evidence/studio-batch8.json), [9](evidence/studio-batch9.json), [10](evidence/studio-batch10.json), [11](evidence/studio-batch11.json) background, swatches, layers, pan, effects, reduced motion. New unit tests cover the history descriptions and the inline text editor.

### Second pass (same day)

Further checks in the same harness: contextual options, corner-radius edge cases, horizontal distribute, single-step bring forward/send backward, border/outline pixels, long couple and venue names, Reset to Template, Simple-mode event details, blur-during-drag and Space-release cleanup, emulated pen and touch input, emulated high-DPI and zoomed viewports, and a PNG export inspected with Pillow (exact fill colour, rounded corner cut, crop overlay absent from the file). Evidence: [12](evidence/studio-batch12.json), [13](evidence/studio-batch13.json), [14](evidence/studio-batch14.json), [15](evidence/studio-batch15.json), [16](evidence/studio-batch16.json).

One more fix: 14 px objects showed four corner-radius widgets on top of the eight resize handles. The widgets now appear only when the selected box is at least 64 px on screen.

Totals now: **191 verified, 33 partial, 11 not tested, 48 not applicable.** DES-252 (save a reusable template) became Not applicable because the designer does not offer it.

Still not tested, because they need uploads, a real backend or other tooling that was not available: DES-006 (open another document with unsaved work), 025 (transparent-area hit testing), 076/077 (rounded image pixels and image border/shadow), 096 (line endpoints), 120 (slow font loading), 131 (exported text glyphs), 135 (drag a file onto the canvas), 146 (large image import), 155 (alpha) and 206 (clipping mask). Browsers other than Chromium, physical devices and a real stylus remain untested.

## Local stack, other browsers and the remaining items (10 November 2026)

Docker and a local Supabase stack were started in this session, so the authenticated suites ran again against the final code (local, fictional data only; credentials stayed in the process environment).

- **Chromium:** `designer-acceptance` (save/reload, recovery, stale tab, uploads, exports, responsive), `designer-controls` and the documentation suite pass. The new `designer-remaining.spec.ts` passes: frame masks and clipping, border and shadow on a rounded frame, see-through blending, transparent-picture hit testing, dropped files, a 6000 × 4000 photo, line length, opening another design and Undo, and export waiting for slow fonts. Exported PNG pixels were read back to check masks, borders, shadow and alpha. [Evidence](evidence/authenticated-remaining.json).
- **Firefox:** `designer-controls`, both `designer-remaining` tests and the full `designer-acceptance` suite pass (the Alt-draw check now allows a pixel of rounding, because Firefox and WebKit deliver whole-pixel pointer coordinates).
- **WebKit (Playwright's Safari engine on Linux):** exported PNGs did not clip circular, arched or rounded picture frames, because WebKit draws a background image square inside the SVG used for the export and ignores its `border-radius`. **Fixed:** the exporter now clips rounded backgrounds with an explicit `clip-path` (`clipRoundedBackgrounds` in `export-service.ts`; unit-tested). Verified by exporting the same rounded picture in WebKit and Chromium: identical corner and centre pixels for circle, rounded-rectangle and arch frames. After the fix `designer-controls`, both `designer-remaining` tests (including the DES-076/077 pixel checks) and `designer-acceptance` through the upload step pass in WebKit. The suite then stops at 'Cancel a pending export', which waits for a proxied picture request that WebKit does not make (it appears to serve the earlier exports' pictures from cache); that cancellation is covered in Chromium and Firefox. The earlier canvas-height failure was a test that read the field before the form re-rendered; it now polls. Real Safari on a Mac or iPhone was still not available.
- **Test-suite fixes:** sign-up and new-event pages are now awaited until hydrated before the helper fills them in (WebKit pressed Continue too early). `studio-pro-designer.spec.ts` (stale header role/label), `designer-guest.spec.ts` and `designer-pass-layout.spec.ts` were re-run on commit `4d8ac3f`, before this session's changes, and fail there too in this container. `interactive-designer-session.spec.ts` (a flaw-logging script that timed out) was not re-run on that commit. For the guest and pass-layout specs: the guest download is named `download` instead of the expected file name, and the pass-layout spec reads the seal before it re-renders after a reload. They were not changed.

Items closed here: DES-006, 025, 076, 077, 120, 135, 146, 155 and 206 pass (Chromium and, where noted, Firefox); DES-096 stays Partial because the designer offers no endpoint handles. DES-131 (exported text) now passes: accented Yoruba names export with the right typeface, every dot and accent, and nothing clipped ([evidence](evidence/studio-batch17.json)). Nothing remains Not tested.

## Work remaining

The matrix currently records **201 verified, 34 partial, 0 not tested and 48 not applicable**. This is still an incomplete acceptance audit.

Remaining work includes exhaustive browser handle/modifier/zoom combinations, overlapping-object and marquee selection, background/template combinations, all image masks and edge effects, complete align/distribute/snap/history workflows, further long-name/party variations, mixed-group pass boundaries and tiny-document/physical-print scanning, visual export comparisons across effects, every shortcut and a complete manual keyboard/screen-reader audit. Safari, Firefox, physical iOS/Android and stylus input remain untested. The native operating-system eyedropper needs a manual check.

The 47 not-applicable items remain visible and unchecked. They describe unoffered Photopea features such as raster retouching, path/Bézier editing, RAW/PSD, channel editing, nested groups, multi-page and video workflows. They are not reported as implemented or passing. See the [control inventory](designer-control-inventory.md) for the current boundaries.

## Regression checks

- Production Next.js build, with build-only environment placeholders: pass.
- TypeScript and ESLint: pass.
- Unit tests: 1,101 passing across 115 files, including Rust/TypeScript parity, save queue failures/races/history limits, corner projection, rotated/group resizing, drawing modifiers, export cancellation/sizing and image-proxy restrictions.
- Rust workspace tests: 247 passing. Rust/WASM artifacts were rebuilt with the pinned Rust 1.99.1 toolchain.
- No new application dependencies, production debug routes, environment files, deployment changes or database migrations were added.

## Screenshots

[Desktop](screenshots/studio-desktop.png) · [Phone](screenshots/studio-mobile.png) · [Phone properties](screenshots/studio-mobile-panel.png) · [Corner controls](screenshots/studio-corner-controls.png)

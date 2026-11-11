# Designer redesign checklist (from Canva and Figma reviews)

Source: current user reviews on Capterra, G2, Software Advice, GetApp, Trustpilot and PeerSpot (summarised in the session; links at the bottom).
Each item says what users complained about or praised, what we do about it in Àríyá, and how we will know it is done.
Status: `[ ]` open, `[x]` done and verified. Priority: **P0** do first, **P1** next, **P2** later.
Rules that still apply: keep brand, template-first flow, Rust/WASM engine, Next.js, 44px touch targets, desktop and mobile, fictional test data only.

## A. Keep what people praise

- [ ] **A1 (P0) Ease of use for non-designers.** Canva's top praise. Keep Simple mode and templates as the default way in; Pro tools stay one step away.
      Done when: a new user can open a template, change the names, date and venue, and export in under 2 minutes with no help text (timed run on desktop and phone).
- [ ] **A2 (P0) Real-time feel and stability.** Figma is praised for collaboration. Autosave status always visible ("Saved", "Saving", "Offline").
      Done when: status is visible at all times; a forced network drop shows "Offline" and recovers without losing edits.
- [ ] **A3 (P1) Auto layout and components idea.** Figma users say these save hours. Offer "Stack" (auto-spacing) for groups of text and "Brand styles" (names, date, venue styles reused across a card).
      Done when: changing one named style updates every layer using it, and undo reverses it in one step.
- [ ] **A4 (P1) Developer-style handoff, our version: print handoff.** Figma wins on handoff. Ours is the printer. One "Send to printer" export with bleed, crop marks and size notes.
      Done when: the export opens correctly in a PDF viewer at true size.

## B. Export (Canva's most common complaint)

- [ ] **B1 (P0) Consistent export.** Same card must look identical on screen, PNG, JPG, PDF and the guest download, in Chromium, Firefox and WebKit.
      Done when: export-matrix spec compares all formats and browsers with no visible differences (extend `designer-export-matrix.spec.ts`).
- [ ] **B2 (P0) Show what you will get before you export.** Preview step with format, size in pixels and file size.
      Done when: preview matches the downloaded file dimensions exactly.
- [ ] **B3 (P0) Fonts never change on export.** Embed fonts; fail loudly if one cannot load.
      Done when: a card using every brand font exports with the same glyph shapes; a blocked font shows a clear message, not a silent fallback.
- [ ] **B4 (P1) Editable source, not only flattened files.** Canva users cannot get layered files. Offer "Download my design" (.ariya JSON) that re-opens with all layers, plus SVG export for vector layers.
      Done when: downloading then re-importing gives an identical layer tree.
- [ ] **B5 (P1) Print-ready option.** CMYK note, 300 dpi, bleed, safe margin guides on canvas.
      Done when: guides toggle on and the export honours them.
- [ ] **B6 (P1) Sensible file names.** Names come from the event, not "download" (non-ASCII safe).
      Done when: e.g. an event named with accents downloads with that name in all three browsers.
- [ ] **B7 (P2) Transparent PNG and small-file option for WhatsApp sharing.**
      Done when: a "WhatsApp size" preset produces a file under a stated size limit with readable text.

## C. Pricing and paywalls (both tools)

- [ ] **C1 (P0) No surprise locks.** Show what is included before the user designs, not at export.
      Done when: every locked feature shows a lock icon and plan name before use; no feature is found locked only at the last step.
- [ ] **C2 (P0) Free versus paid is stated in one place.** One plain pricing table in the studio's help.
      Done when: the table matches the real entitlements checked in code (unit test comparing the two).
- [ ] **C3 (P1) No seat tricks.** Guests and helpers viewing or commenting never need a paid seat; only editing is limited.
      Done when: a view-only collaborator can open, comment and download the guest version without a paid seat.
- [ ] **C4 (P1) Gentle upgrade prompts.** At most one prompt per session, never blocking a task.
      Done when: no modal upgrade prompt appears mid-edit (E2E check).
- [ ] **C5 (P2) Premium filter clarity.** Template and asset lists must clearly separate free from premium (Canva reviewers called this confusing).
      Done when: filter chips "All / Free / Premium" work and counts are right.

## D. Learning curve and navigation

- [ ] **D1 (P0) Progressive tools.** Simple mode shows 6–8 controls; Pro reveals the rest. Figma's complexity hurts beginners.
      Done when: first-time users see only the essentials; a "More tools" control reveals the rest and remembers the choice.
- [ ] **D2 (P0) Guided first run.** 4-step coach marks (pick template, edit text, move/resize, export), skippable, shown once.
      Done when: completing or skipping stores the choice; re-openable from Help.
- [ ] **D3 (P0) Plain names for tools.** Replace jargon (e.g. "blend mode", "distribute") with labels plus tooltips; keep Pro names as secondary text.
      Done when: every tool has a tooltip with shortcut; a label audit finds no unexplained term in Simple mode.
- [ ] **D4 (P1) Find-anything search.** One search box for tools, templates, and settings (command palette on desktop, search button on phone).
      Done when: typing "export" or "align" jumps to the right control.
- [ ] **D5 (P1) Clear folders and navigation (Canva and Figma both criticised).** Designs grouped by event; breadcrumbs; a visible Back to event.
      Done when: from any studio screen the user can reach their event in one click, and the saved design list is grouped by event.
- [ ] **D6 (P1) Shortcut help.** Press `?` for a shortcut sheet.
      Done when: the sheet lists real, tested shortcuts only.
- [ ] **D7 (P2) Short video or GIF help per tool in Help.**

## E. Performance (Figma complaint: large files)

- [ ] **E1 (P0) Performance budget.** Interaction stays smooth with 100 layers and 20 images on a mid-range phone.
      Done when: a stress fixture with 100 layers keeps drag/resize under a stated frame time (measured, recorded in evidence).
- [ ] **E2 (P1) Heavy work off the main thread.** Keep alignment, distribution and export maths in Rust/WASM; move image decoding off the main thread where possible.
      Done when: long tasks over 50ms on the stress fixture are removed or justified.
- [ ] **E3 (P1) Image size control.** Downscale big uploads for editing, keep the original for export.
      Done when: a 12MP photo edits smoothly and exports at full quality.
- [ ] **E4 (P1) Fast open.** Studio ready quickly on a cold load; show a skeleton, not a blank screen.
      Done when: time to interactive is recorded for desktop and a throttled phone.
- [ ] **E5 (P2) Offline-tolerant editing.** Queue saves when the connection drops.

## F. Support and trust (Canva complaint: hard to reach support)

- [ ] **F1 (P0) Visible help.** A Help button in the studio with a short guide, contact email (`help@ariyaday.com` once created) and expected reply time.
      Done when: Help opens in one tap on phone and desktop.
- [ ] **F2 (P1) Clear error messages.** Every failure says what happened and what to do next.
      Done when: forced failures (export, save, image upload) each show a readable message and a retry.
- [ ] **F3 (P1) Version history users can find.** Name versions, restore one.
      Done when: restore from history returns the exact earlier design.
- [ ] **F4 (P2) Account sharing clarity.** Shared designs always say who owns them and which account is open (Canva complaint).

## G. Templates and content quality

- [ ] **G1 (P0) Fresh Nigerian-wedding-first templates.** Canva reviewers call templates dated. Audit each template on current style, Yoruba/Igbo/Hausa/Pidgin text, and long names.
      Done when: each template renders correctly with long names and diacritics (Àríyá, Ọlá, Ṣeun).
- [ ] **G2 (P1) Template search and filters.** Culture, mood, colour, size, free or premium.
      Done when: filters combine and results match.
- [ ] **G3 (P1) One-click colour and font themes** from the template, protecting contrast.
      Done when: axe contrast passes for every theme.
- [ ] **G4 (P2) AI helper that is predictable (Canva AI "hit or miss").** Only offer AI features that give reviewable, undoable results; label clearly as suggestions.

## H. Docs and text editing (Canva: clunky docs)

- [ ] **H1 (P1) Reliable text editing.** Caret never jumps, paste is plain text, undo steps are sensible, long names wrap or shrink predictably.
      Done when: the text regression specs stay green and a long-name fixture does not overflow.
- [ ] **H2 (P2) Text fit options.** "Shrink to fit" and "Grow box" per text layer.

## I. Accessibility and phones

- [ ] **I1 (P0) 44px targets and keyboard access everywhere.** Already enforced by `20-studio-accessibility.spec.ts`; keep it green.
- [ ] **I2 (P1) Screen reader pass** on the main flow (open, edit, export) with a real reader; record results.
- [ ] **I3 (P1) Phone-first checks on real devices** (iOS Safari, Android Chrome): layout, keyboard, export download.
- [ ] **I4 (P2) Stylus and trackpad checks.**

## J. Measurement (so we know it worked)

- [ ] **J1 (P0) Baseline metrics:** time to first export, export success rate, support questions per 100 designs, crash or error rate.
- [ ] **J2 (P1) Small user test** with 5 real couples or planners on phone; record where they stall.
- [ ] **J3 (P1) Re-check this list each release;** update status and evidence links.

## K. UI redesign (look and layout)

Context: the phone/tablet layout and side-panel proportions were reworked in PR #92. Not yet redesigned: tool rail, inspector forms, header, desktop options bar, phone Simple mode. Both reviews say users want less clutter and clearer hierarchy.

- [ ] **K1 (P0) Visual hierarchy audit.** One primary action per screen (Export), secondary actions quieter, destructive actions separated.
      Done when: a screenshot review of every studio state (empty, selected, panel open, export) shows one obvious primary action and no more than 2 competing emphases.
- [ ] **K2 (P0) Header redesign.** Event name, save status, undo/redo, Share and Export in a fixed order; secondary items moved into a menu.
      Done when: header fits at 360px, 768px and 1440px with no wrapping or clipped labels.
- [ ] **K3 (P0) Tool rail redesign.** Group tools (Select, Text, Shapes, Images, Seal/QR, More), consistent icons and labels, active state that is clear without relying on colour alone.
      Done when: every tool has an icon, label or tooltip, shortcut, and a 44px target; icon set is one consistent style.
- [ ] **K4 (P0) Inspector redesign.** Collapsible sections (Position, Text, Fill, Effects) with the most-used controls first; same control pattern everywhere (label above, value right).
      Done when: no inspector section needs scrolling to reach its primary control on a 768px-tall screen; sections remember open/closed.
- [ ] **K5 (P1) Desktop options bar.** Context-sensitive bar under the header that shows only controls for the current selection (text: font, size, weight; image: crop, replace; shape: fill, radius).
      Done when: each layer type shows only its relevant controls, nothing jumps position between selections.
- [ ] **K6 (P1) Layers panel redesign.** Clear thumbnails or type icons, readable names, lock/hide icons with tooltips, drag handle and keyboard reorder kept.
      Done when: 50 layers stay scannable; rename inline works; existing reorder tests stay green.
- [ ] **K7 (P1) Canvas surround.** Calm neutral background, soft page shadow, rulers/guides optional, zoom control with presets (Fit, 50, 100, 200).
      Done when: the card is visually the focus; zoom controls are reachable on phone and desktop.
- [ ] **K8 (P1) Design tokens.** One source for colours, spacing (4/8 scale), radius, shadow, type sizes, z-index; remove one-off values in `InvitationDesigner.module.css`.
      Done when: a grep finds no hard-coded colour or spacing outside the tokens file; light and dark both read from tokens.
- [ ] **K9 (P1) Typography.** Brand fonts for the product chrome, a readable UI size (min 14px body, 12px labels), consistent weights.
      Done when: no UI text under 12px; headings, labels and values follow one scale.
- [ ] **K10 (P1) Dark and light themes polished.** Contrast of 4.5:1 for text and 3:1 for icons/borders in both.
      Done when: axe contrast passes in both themes on all studio states.
- [ ] **K11 (P2) Iconography and brand touches.** Àríyá colours and motifs used sparingly (accent, empty states, loading), not on every control.
- [ ] **K12 (P2) Motion.** Short (120–200ms) transitions for panels, tool changes and toasts; respect `prefers-reduced-motion`.
      Done when: reduced-motion removes all non-essential animation.

## L. UX redesign (flows and feedback)

- [ ] **L1 (P0) Core journey map.** Write and test the main flow: Event → Choose template → Edit → Preview → Export/Share. Remove any step that does not help.
      Done when: each step is reachable in at most 2 taps and a user test records where people stall.
- [ ] **L2 (P0) Empty states that teach.** Empty canvas, no layers, no saved designs, and no images each show one sentence and one button.
      Done when: every empty state has a screenshot and a clear next action.
- [ ] **L3 (P0) Selection feedback.** Handles, size/position readout while dragging, snapping guides with labels, clear multi-select state.
      Done when: dragging shows live values and guides; handles are at least 44px touch targets on phone.
- [ ] **L4 (P0) Undo safety net.** Visible undo/redo, a "Reverted" toast with Redo, and confirmation only for truly destructive actions (delete design).
      Done when: no destructive action is lost without an undo or confirm.
- [ ] **L5 (P1) Phone Simple mode redesign.** Big tap targets, bottom sheet for text editing, one-handed reach for primary controls, keyboard never hides the field being edited.
      Done when: on a 360×640 emulated phone the edited field stays visible with the keyboard open (real-device check in I3).
- [ ] **L6 (P1) Progressive disclosure.** Advanced options (blend, distribute, effects) live behind "More"; the choice is remembered (links to D1).
- [ ] **L7 (P1) Toasts and status.** One toast pattern: saved, exported, copied, failed; non-blocking, dismissible, announced to screen readers.
      Done when: every async action shows a consistent toast and an `aria-live` announcement.
- [ ] **L8 (P1) Loading states.** Skeletons for studio, template grid and images; export shows progress and a cancel.
      Done when: no blank or frozen state longer than 300ms without feedback.
- [ ] **L9 (P1) Error and recovery UX.** Inline errors next to the cause, never only a toast; offline banner; autosave retry (links to F2).
- [ ] **L10 (P1) Event-facts banner and saved-card policy.** Keep the "Update the card / Keep my wording" banner clear, and show what changed.
      Done when: banner lists the changed fields and either choice is undoable.
- [ ] **L11 (P1) Share and guest preview.** "See it as a guest" preview, with a clear separation between the host's design and what guests receive. No guest links or codes shown in reports.
- [ ] **L12 (P2) Keyboard-first UX.** Full keyboard path through tools, inspector and layers; visible focus ring everywhere.
      Done when: tabbing through the studio never traps or hides focus.
- [ ] **L13 (P2) Microcopy pass.** Friendly, plain wording; consistent verbs (Save, Export, Share); no jargon in Simple mode (links to D3).
- [ ] **L14 (P2) Localisation readiness.** Layouts survive text 30% longer; support for Yoruba, Igbo, Hausa and Pidgin UI strings later.

## M. UI/UX validation

- [ ] **M1 (P0) Before/after screenshots** for each redesigned area at 360px, 768px, 1440px, light and dark, saved under `docs/quality/screenshots/`.
- [ ] **M2 (P0) Regression suite stays green:** studio accessibility (44px targets), acceptance, export matrix, layer and undo specs.
- [ ] **M3 (P1) Usability test script:** 5 tasks (change names, move a layer, change colour, export, share), 5 participants, success rate and time per task recorded.
- [ ] **M4 (P1) Heuristic review** (Nielsen's 10) with findings logged and ranked.
- [ ] **M5 (P1) Design review against the competitor complaints:** every A–L item mapped to a screen, so nothing from the reviews is left out.

## Suggested order

1. **Sprint 1 (P0 trust):** B1–B3, C1–C2, D1–D3, E1, F1, A1–A2, G1, J1.
2. **Sprint 2 (P0 UI/UX):** K1–K4, L1–L4, M1–M2.
3. **Sprint 3 (P1 polish):** B4–B6, C3–C4, D4–D6, E2–E4, F2–F3, G2–G3, H1, A3–A4, I2–I3, K5–K10, L5–L11, M3–M5.
4. **Sprint 4 (P2):** the remaining items.

## Evidence rule

Each item is closed only with a test, screenshot or measurement saved under `docs/quality/evidence/`, like the earlier designer checklist.

## Sources

- Canva: [Capterra](https://www.capterra.com/p/168956/Canva/reviews/), [Capterra 1-star](https://www.capterra.com/p/168956/Canva/reviews/?rating=1), [Software Advice](https://www.softwareadvice.com/graphic-design/canva-profile/reviews/), [GetApp](https://www.getapp.com/design-software/a/canva/)
- Figma: [Capterra](https://capterra.com/p/175027/Figma/reviews/), [G2](https://www.g2.com/products/Figma/reviews), [Trustpilot](https://www.trustpilot.com/review/figma.com?page=3), [PeerSpot](https://origin.peerspot.com/products/figma-pros-and-cons)

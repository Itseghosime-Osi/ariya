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

## Suggested order

1. **Sprint 1 (P0 trust):** B1–B3, C1–C2, D1–D3, E1, F1, A1–A2, G1, J1.
2. **Sprint 2 (P1 polish):** B4–B6, C3–C4, D4–D6, E2–E4, F2–F3, G2–G3, H1, A3–A4, I2–I3.
3. **Sprint 3 (P2):** the remaining items.

## Evidence rule

Each item is closed only with a test, screenshot or measurement saved under `docs/quality/evidence/`, like the earlier designer checklist.

## Sources

- Canva: [Capterra](https://www.capterra.com/p/168956/Canva/reviews/), [Capterra 1-star](https://www.capterra.com/p/168956/Canva/reviews/?rating=1), [Software Advice](https://www.softwareadvice.com/graphic-design/canva-profile/reviews/), [GetApp](https://www.getapp.com/design-software/a/canva/)
- Figma: [Capterra](https://capterra.com/p/175027/Figma/reviews/), [G2](https://www.g2.com/products/Figma/reviews), [Trustpilot](https://www.trustpilot.com/review/figma.com?page=3), [PeerSpot](https://origin.peerspot.com/products/figma-pros-and-cons)

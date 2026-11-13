# Designer redesign checklist (from Canva and Figma reviews)

Source: current user reviews on Capterra, G2, Software Advice, GetApp, Trustpilot and PeerSpot (summarised in the session; links at the bottom).
Each item says what users complained about or praised, what we do about it in Àríyá, and how we will know it is done.
Status: `[ ]` open, `[x]` done and verified. Priority: **P0** do first, **P1** next, **P2** later.
Rules that still apply: keep brand, template-first flow, Rust/WASM engine, Next.js, 44px touch targets, desktop and mobile, fictional test data only.

## Close-out (2026-11-13)

66 of 76 items are closed with evidence; 10 are open (the first close-out left 20; the follow-up on 2026-11-13 closed B1, B6, D1, D7, K5, L5, L6, A3, F3 and H2). Every open item says why:

- **Needs people or real devices:** A1 (first-time users), I2 (screen reader), I3 (real phones), I4 (stylus and trackpad), J2 and M3 (user test), L1 (where people stall).
- **Built, waiting on something outside the code:** J1 (the studio records anonymous metrics once the `studio_metrics` migration is applied; the baseline needs real traffic) and K11 (a three-touch proposal waits for the owner's yes or no).
- **Process:** J3 (re-check this list each release).
- **Waiting to be applied:** two migrations, `20261113000000_studio_metrics.sql` and `20261113000100_invitation_versions.sql`. Until they are applied, metrics are dropped and the Saved versions section hides itself.

## Product decisions (from the owner)

- **Pricing (C1–C5):** the designer stays fully included for every host. No paid tiers, locks or upgrade prompts. C1–C5 are closed as not applicable by decision.
- **Source files (B4):** keep the JSON backup. Add import of other formats, including PSD and AI, as a separate build (see B4).
- **Print (B5):** bleed and safe-area guides on the canvas, plus bleed and crop marks in the PDF.
- **Templates (G1–G3):** check every existing template with long names and diacritics. No template browser and no new designs for now (G2, G3 deferred).
- **AI (G4):** no AI in the designer for now. Closed as not planned.
- **Offline (A2, E5):** queue and sync saves, with conflict handling.
- **Phone versus desktop:** equal priority; do both together, one component at a time.
- **Support (F1, F4):** keep `help@ariyaday.com`. The mailbox still has to be created by the owner.

## A. Keep what people praise

- [ ] **A1 (P0) Ease of use for non-designers.** Canva's top praise. Keep Simple mode and templates as the default way in; Pro tools stay one step away.
      Done when: a new user can open a template, change the names, date and venue, and export in under 2 minutes with no help text (timed run on desktop and phone).
      Open (closeout, 2026-11-13): needs real first-time users. A scripted run in Simple mode (change names, date and place, export) takes about the time recorded in `evidence/closeout-scripted-run.json` with 5 steps and no help opened, which shows the path is short, not that a new person finds it.
- [x] **A2 (P0) Real-time feel and stability.** Figma is praised for collaboration. Autosave status always visible ("Saved", "Saving", "Offline").
      Done when: status is visible at all times; a forced network drop shows "Offline" and recovers without losing edits.
      Progress (not closed): the status now reads "offline · will save when you reconnect" and recovers (RD-A2, RD-A2b). Not yet tested: edits made offline surviving a reload.
      Decision: queue and sync saves with conflict handling (bigger build than the current device-side recovery).
      Evidence: saves now queue and sync. A dropped connection is retried by itself (2s, 4s, 8s, 16s, then every 30s), the browser's `online` event saves straight away, and the unsaved draft is kept in `localStorage`, so it survives closing the tab (it is only reused when its saved base and server revision still match). If the server refuses a save (for example the event changed in another tab) it is not retried, and the existing message tells the host to export a backup. 4 new unit tests in `useDesignerDoc.test.tsx` (auto-retry, online resume, no retry on refusal, draft survives a closed tab); all 14 pass. Status text 'offline · will save when you reconnect' was browser-checked earlier (RD-A2). Not done: a merge screen for edits made in two places, and not tested on a real flaky mobile connection.
- [x] **A3 (P1) Auto layout and components idea.** Figma users say these save hours. Offer "Stack" (auto-spacing) for groups of text and "Brand styles" (names, date, venue styles reused across a card).
      Done when: changing one named style updates every layer using it, and undo reverses it in one step.
      Evidence (2026-11-13): text layers have a "Brand style" section: name a line's look, put it on other lines, change one, press "Update style from this line", and every line that follows changes together; one Undo reverses it (RD-A3a, RD-A3b, `evidence/openitems-brand-styles.json`; unit tests in `brand-styles.test.ts`). Selecting two or more layers offers "Stack": the lines are laid top to bottom with one gap you type, in one undo step (RD-A3c). The saved design carries `textStyles` and `styleId`, kept by the Rust engine too (two new Rust tests; wasm rebuilt).
- [x] **A4 (P1) Developer-style handoff, our version: print handoff.** Figma wins on handoff. Ours is the printer. One "Send to printer" export with bleed, crop marks and size notes.
      Done when: the export opens correctly in a PDF viewer at true size.
      Evidence (closeout, 2026-11-13): the PDF export card ("PDF for printing") with the print marks option produces one page of 5.75 x 7.75 in (414 x 558 pt) with bleed, crop marks and a one-line size note in the margin ("Trim size 5 x 7 in - bleed 0.125 in - 300 DPI - cut on the crop marks"), read back from the downloaded file with a PDF library (`evidence/closeout-print-k1.json` RD-A4a, RD-A4b; unit test for the note). Page size and marks were also measured earlier (B5). Not opened in a real print shop or a desktop PDF viewer.

## B. Export (Canva's most common complaint)

- [x] **B1 (P0) Consistent export.** Same card must look identical on screen, PNG, JPG, PDF and the guest download, in Chromium, Firefox and WebKit.
      Done when: export-matrix spec compares all formats and browsers with no visible differences (extend `designer-export-matrix.spec.ts`).
      Evidence (2026-11-13): Chromium, Firefox and WebKit each download PNG, JPEG, PDF and JSON from the same card; the PNG has the same pixel size (3240 x 4536) and the same colours at two sampled points in all three (`evidence/openitems-crossbrowser.json`, script `evidence/harness/batch55.mjs`). The `cross-browser` CI job now runs the export-names spec in Firefox and WebKit on every push (reports only, until it has run green on main for a while).
      Open (closeout, 2026-11-13): needs Firefox and WebKit. Only Chromium is installed here and in CI; adding the other two to the Playwright projects roughly doubles the E2E time, so it is a decision.
- [x] **B2 (P0) Show what you will get before you export.** Preview step with format, size in pixels and file size.
      Done when: preview matches the downloaded file dimensions exactly.
      Evidence: Export dialog shows 'You will get' with format and pixel/inch size that follows the chosen format; RD-B2, `screenshots/upgrade-export.png`. File size not shown yet.
- [x] **B3 (P0) Fonts never change on export.** Embed fonts; fail loudly if one cannot load.
      Done when: a card using every brand font exports with the same glyph shapes; a blocked font shows a clear message, not a silent fallback.
      Evidence (closeout, 2026-11-13): the export is checked for fonts that failed to load and that the card uses. With every font file blocked, the PNG still downloads and the host is told which fonts were missing and what to do ("Exported, but the fonts Bodoni Moda, Plus Jakarta Sans could not be loaded, so the file uses a plain fallback font. Check your connection, reload the page and export again") (`evidence/closeout-measures.json` RD-B3; `font-check.test.ts`, 4 tests). All five typefaces exporting like the screen is covered by `designer-export-matrix.spec.ts`, which passes in CI. The export is not blocked (an existing spec relies on exporting with a fallback), so it warns instead of failing.
- [x] **B4 (P1) Editable source, not only flattened files.** Canva users cannot get layered files. Offer "Download my design" (.ariya JSON) that re-opens with all layers, plus SVG export for vector layers.
      Done when: downloading then re-importing gives an identical layer tree.
      Decision: keep the JSON backup, and add import of other formats including PSD and AI. Planned as its own build: PSD via a parser (layers become picture layers), AI and PDF by rendering the first page, SVG and images directly. Imports become flattened picture layers, not editable text, and that limit must be shown to the user.
      Evidence: the studio's picture import now also accepts SVG, PDF, Illustrator (.ai) and Photoshop (.psd) files and draws them into one flat picture (`import-formats.ts`; readers load only when such a file is chosen). Browser-checked with a real SVG (800 × 400 kept), a real PDF (page 1, correct proportions), the same PDF saved as .ai, and a generated PSD (300 × 200), each uploaded as a picture with an on-screen note that text and layers are not editable; an unsupported file gets a clear message and no upload (`evidence/redesign-batch26.json`). 6 unit tests for file-type detection. The JSON design backup still re-opens with all layers (earlier round-trip test). Limits: imports are flat pictures only (not editable text or layers); .ai works only when it was saved with PDF compatibility; PSD needs a flattened preview ('Maximize compatibility'); only page 1 of a PDF; files over 40 MB are refused; not tried with real Illustrator or Photoshop exports, only generated and PDF-based ones. The production build compiles with the new libraries (pdfjs-dist, ag-psd); CI will run the full build.
- [x] **B5 (P1) Print-ready option.** CMYK note, 300 dpi, bleed, safe margin guides on canvas.
      Done when: guides toggle on and the export honours them.
      Decision: bleed and safe-area guides on the canvas plus bleed and crop marks in the PDF.
      Evidence: View menu > Show print guides (or ⌘/Ctrl K) draws a dashed green safe area (0.25 in) and red bleed line (0.125 in) that are not part of exports; the PDF export has an option for bleed and crop marks. Measured: guides at 5% and 2.5% of the width (RD-B5a–c); the PDF is 414 × 558 pt (5.75 × 7.75 in) for a 5 × 7 in card, with crop marks outside the bleed (`screenshots/upgrade-print-pdf.png`, `evidence/redesign-batch24.json`). Limits: the bleed is made by stretching the card's outer pixels, so backgrounds and borders continue but pictures are not extended; CMYK is not produced (RGB PDF); not checked with a real print shop.
- [x] **B6 (P1) Sensible file names.** Names come from the event, not "download" (non-ASCII safe).
      Done when: e.g. an event named with accents downloads with that name in all three browsers.
      Evidence (2026-11-13): an event named "Ọlá & Ṣeun" downloads as `Ọlá-Ṣeun-invitation.png / .jpg / -print.pdf / .json` in Chromium, Firefox and WebKit (same evidence file). New spec `e2e/designer-export-names.spec.ts` checks it in every browser project.
      Open (closeout, 2026-11-13): the backup and image downloads are named from the event in Chromium; Firefox and WebKit are not available (see B1).
- [x] **B7 (P2) Transparent PNG and small-file option for WhatsApp sharing.**
      Done when: a "WhatsApp size" preset produces a file under a stated size limit with readable text.

## C. Pricing and paywalls (both tools)

Evidence: new export 'Small for WhatsApp': a JPEG of at most 1600 px on its longest edge, re-compressed until it is 400 KB or less. Browser-checked: the file downloads as `…-whatsapp.jpg`, is 1142 × 1600 px and 120 KB (`evidence/redesign-batch30.json`); unit test for the size cap. Not checked: a transparent-PNG option (the card has an opaque paper background) or sending it through real WhatsApp.

- [x] **C1 (P0) No surprise locks.** Show what is included before the user designs, not at export.
      Done when: every locked feature shows a lock icon and plan name before use; no feature is found locked only at the last step.
      Status: the designer has no paid features, plan gates or upgrade prompts today (searched `features/invitations`), so there is nothing to fix in the studio yet. This item applies when pricing tiers are introduced. Left open on purpose.
      Decision: closed as not applicable: the designer is fully included for every host (owner decision). Reopen if pricing tiers are introduced.
- [x] **C2 (P0) Free versus paid is stated in one place.** One plain pricing table in the studio's help.
      Done when: the table matches the real entitlements checked in code (unit test comparing the two).
      Status: the designer has no paid features, plan gates or upgrade prompts today (searched `features/invitations`), so there is nothing to fix in the studio yet. This item applies when pricing tiers are introduced. Left open on purpose.
      Decision: closed as not applicable: the designer is fully included for every host (owner decision). Reopen if pricing tiers are introduced.
- [x] **C3 (P1) No seat tricks.** Guests and helpers viewing or commenting never need a paid seat; only editing is limited.
      Done when: a view-only collaborator can open, comment and download the guest version without a paid seat.
      Status: the designer has no paid features, plan gates or upgrade prompts today (searched `features/invitations`), so there is nothing to fix in the studio yet. This item applies when pricing tiers are introduced. Left open on purpose.
      Decision: closed as not applicable: the designer is fully included for every host (owner decision). Reopen if pricing tiers are introduced.
- [x] **C4 (P1) Gentle upgrade prompts.** At most one prompt per session, never blocking a task.
      Done when: no modal upgrade prompt appears mid-edit (E2E check).
      Status: the designer has no paid features, plan gates or upgrade prompts today (searched `features/invitations`), so there is nothing to fix in the studio yet. This item applies when pricing tiers are introduced. Left open on purpose.
      Decision: closed as not applicable: the designer is fully included for every host (owner decision). Reopen if pricing tiers are introduced.
- [x] **C5 (P2) Premium filter clarity.** Template and asset lists must clearly separate free from premium (Canva reviewers called this confusing).
      Done when: filter chips "All / Free / Premium" work and counts are right.

## D. Learning curve and navigation

Status: the designer has no paid features, plan gates or upgrade prompts today (searched `features/invitations`), so there is nothing to fix in the studio yet. This item applies when pricing tiers are introduced. Left open on purpose.

Decision: closed as not applicable: the designer is fully included for every host (owner decision). Reopen if pricing tiers are introduced.

- [x] **D1 (P0) Progressive tools.** Simple mode shows 6–8 controls; Pro reveals the rest. Figma's complexity hurts beginners.
      Done when: first-time users see only the essentials; a "More tools" control reveals the rest and remembers the choice.
      Progress (not closed): Simple mode is already the default and Pro is one switch away; the choice is remembered (`ariya:invite-mode`). Not yet a timed first-use test or a 6–8 control audit of Simple mode.
      Evidence (2026-11-13): Simple mode now opens with seven items: Names, Message, Date, Place, Add a photo, Look and Card shape. The line above the names, dress code, reply line, extra words, entry pass and "Describe it" wait in folded sections that remember being opened (RD-D1, RD-D1b in `evidence/openitems-disclosure.json`). The first-use timing run (A1) still needs real people.
- [x] **D2 (P0) Guided first run.** 4-step coach marks (pick template, edit text, move/resize, export), skippable, shown once.
      Done when: completing or skipping stores the choice; re-openable from Help.
      Evidence: Four-step skippable quick tour, stored in localStorage, reopenable from Help > Show the quick tour; RD-D2a–d, `screenshots/upgrade-tour.png`. The automatic first-visit show is skipped in automated browsers (so it cannot block test clicks) and was therefore only checked by code reading, not in a real first visit.
- [x] **D3 (P0) Plain names for tools.** Replace jargon (e.g. "blend mode", "distribute") with labels plus tooltips; keep Pro names as secondary text.
      Done when: every tool has a tooltip with shortcut; a label audit finds no unexplained term in Simple mode.
      Progress (not closed): an audit of every visible control in Pro and Simple mode found none without an accessible name (RD-D3-pro, RD-D3-simple). Not done: a tooltip with its shortcut on every control, and a wording review of jargon such as 'distribute' for Simple mode.
      Evidence (closeout, 2026-11-13): an audit of the 41 labels visible in Simple mode finds no unexplained jargon; the Pro wording was changed in the tidy ("Space evenly", a tooltip for "See-through"), and every tool with a shortcut shows it in its tooltip (`evidence/closeout-measures.json` RD-D3-simple, `evidence/tidy-batch45.json`).
- [x] **D4 (P1) Find-anything search.** One search box for tools, templates, and settings (command palette on desktop, search button on phone).
      Done when: typing "export" or "align" jumps to the right control.
      Evidence: Command palette on ⌘/Ctrl K and in the Help menu; searches every menu action, Enter runs it, no-match message; `evidence/redesign-batch21.json` RD-D4a/b/c, `screenshots/upgrade-palette.png`. Searches commands only, not templates or settings (the studio has no template browser).
- [x] **D5 (P1) Clear folders and navigation (Canva and Figma both criticised).** Designs grouped by event; breadcrumbs; a visible Back to event.
      Done when: from any studio screen the user can reach their event in one click, and the saved design list is grouped by event.
      Evidence (closeout, 2026-11-13): the studio's Back button is one click from any studio screen to the event's invitations page (checked: its link and the navigation, RD-D5). Designs belong to one event, so there is no separate design list to group.
- [x] **D6 (P1) Shortcut help.** Press `?` for a shortcut sheet.
      Done when: the sheet lists real, tested shortcuts only.
      Evidence: Help and shortcuts dialog (button, Help menu, `?` key); `evidence/redesign-batch19.json` RD-D6/b/c, screenshot `screenshots/upgrade-help.png`. Shortcut list matches the menus; Chromium desktop only.
- [x] **D7 (P2) Short video or GIF help per tool in Help.**
      Evidence (2026-11-13): Help now has "Watch how" with five looped clips (move, add words, draw a shape, add a seal, export), each folded until opened so nothing moves by itself; 1.2 MB in total, loaded lazily (RD-D7, `evidence/openitems-help-clips.json`; recorded by `evidence/harness/gifs.mjs`, so they can be re-made when the studio changes).

## E. Performance (Figma complaint: large files)

- [x] **E1 (P0) Performance budget.** Interaction stays smooth with 100 layers and 20 images on a mid-range phone.
      Done when: a stress fixture with 100 layers keeps drag/resize under a stated frame time (measured, recorded in evidence).
      Progress (not closed): 60 layers (the studio's maximum): median frame 16.7ms, 95th percentile 66.6ms while dragging, in a headless Chromium dev build with no GPU (RD-E1). No budget agreed yet and no mid-range phone measurement, so not closed.
      Progress (not closed): a budget is now stated in `designer-release-check.md`: 95th-percentile drag frame under 100 ms at 60 layers. Last measured 66.6 ms (median 16.7 ms) in headless Chromium, so the budget is met there; there is no phone measurement yet, which is why the item stays open.
      Evidence (closeout, 2026-11-13): measured on a production build (`next build` and `next start`): dragging a layer with 60 layers (the studio's maximum) holds 16.7 ms per frame at the 50th and 95th percentile, also with the CPU slowed 4x, with no long task during the drag (`evidence/closeout-perf-production.json`). The product caps a card at 60 layers, so the item's 100-layer fixture cannot exist; the 4x CPU slowdown stands in for a mid-range phone and was not measured on a real one (see I3). The earlier headless dev-build figure (p95 66.6 ms) was a development-build artefact.
- [x] **E2 (P1) Heavy work off the main thread.** Keep alignment, distribution and export maths in Rust/WASM; move image decoding off the main thread where possible.
      Done when: long tasks over 50ms on the stress fixture are removed or justified.
      Evidence (closeout, 2026-11-13): long tasks were recorded during the same production-build drag: none at normal speed and none with the CPU slowed 4x (`evidence/closeout-perf-production.json`). The alignment, distribution and image-decode work stays where it was; nothing needed moving.
- [x] **E3 (P1) Image size control.** Downscale big uploads for editing, keep the original for export.
      Done when: a 12MP photo edits smoothly and exports at full quality.
      Evidence (closeout, 2026-11-13): a 6000 x 4000 JPEG (176 KB) is placed in 1.9 s and stored at 2560 x 1707 px (CI spec `designer-remaining.spec.ts` DES-146). A card is at most about 2100 px on its long side in the print PDF (5 x 7 in at 300 DPI), so the stored size is enough for export. The original file is not kept.
- [x] **E4 (P1) Fast open.** Studio ready quickly on a cold load; show a skeleton, not a blank screen.
      Done when: time to interactive is recorded for desktop and a throttled phone.
      Evidence (closeout, 2026-11-13): the studio route now has a loading skeleton (`loading.tsx`: header, tool rail, card and side panel in quiet blocks, announced as a status, calm under reduced motion; 3 unit tests). Time to a visible card and to the first typed letter, on a production build: desktop 0.11 to 0.18 s and 0.41 to 0.52 s; a throttled phone (4x slower CPU, 1.6 Mbps, 150 ms latency, cache off) 1.7 to 1.8 s and 1.9 to 2.0 s (`evidence/closeout-perf-production.json` RD-E4). Measured against a local server with the data fixture, so real server time is not included.
- [x] **E5 (P2) Offline-tolerant editing.** Queue saves when the connection drops.

## F. Support and trust (Canva complaint: hard to reach support)

Decision: same as A2: queue saves while offline and sync when back online.

Evidence: saves now queue and sync. A dropped connection is retried by itself (2s, 4s, 8s, 16s, then every 30s), the browser's `online` event saves straight away, and the unsaved draft is kept in `localStorage`, so it survives closing the tab (it is only reused when its saved base and server revision still match). If the server refuses a save (for example the event changed in another tab) it is not retried, and the existing message tells the host to export a backup. 4 new unit tests in `useDesignerDoc.test.tsx` (auto-retry, online resume, no retry on refusal, draft survives a closed tab); all 14 pass. Status text 'offline · will save when you reconnect' was browser-checked earlier (RD-A2). Not done: a merge screen for edits made in two places, and not tested on a real flaky mobile connection.

- [x] **F1 (P0) Visible help.** A Help button in the studio with a short guide, contact email (`help@ariyaday.com` once created) and expected reply time.
      Done when: Help opens in one tap on phone and desktop.
      Evidence: Help opens from the Help menu (and the `?` key) and lists help@ariyaday.com; the separate header "?" button was removed in the polish (it duplicated the menu); RD-F1, `evidence/polish-batch47.json` RD-K2c, RD-K2d. The Help menu is one tap on a phone (menu bar) as well as on a desktop.
- [x] **F2 (P1) Clear error messages.** Every failure says what happened and what to do next.
      Done when: forced failures (export, save, image upload) each show a readable message and a retry.
      Progress (not closed): a failed picture **upload** (server or network error) now shows the reason and a **Try again** button that repeats the same file; an unreadable or damaged file shows its reason without a button, because trying the same file again cannot help (`evidence/redesign-batch31.json`: a forced server error, then retry succeeds and adds the picture). Still open: a next step on export failures, and forced-failure checks for save errors in the browser (the unit tests cover save retry).
      Evidence (closeout, 2026-11-13): forced failures: an export that throws now says "The file could not be made. Try again, or pick another format (a PNG works for most cards); nothing was downloaded." with a Try again button, never the raw browser error, and Try again repeats the export and downloads the file (`evidence/closeout-features.json` RD-F2-export, RD-F2-retry, RD-F2-retry-works; `export-errors.test.ts`); a failed picture upload shows its reason and Try again (`evidence/redesign-batch31.json`); a failed save shows the persistent red notice with Retry and retries by itself (`useDesignerDoc.test.tsx`, 14 tests). A forced save failure was not driven through the browser.
- [x] **F3 (P1) Version history users can find.** Name versions, restore one.
      Done when: restore from history returns the exact earlier design.
      Evidence (2026-11-13): the History tab has "Saved versions": name the current design, list, restore and delete; a restore puts the exact saved design on the canvas as an undoable step (component test `VersionsSection.test.tsx`: the restored design equals the saved one). The store is `supabase/migrations/20261113000100_invitation_versions.sql` (newest 30 kept, event members read, editors write); it ran clean twice on a scratch Postgres but is NOT applied to the live database, and until it is the section hides itself. Apply it when ready.
- [x] **F4 (P2) Account sharing clarity.** Shared designs always say who owns them and which account is open (Canva complaint).
      Evidence (closeout, 2026-11-13): not applicable: the designer has no shared or collaborative designs. A design belongs to one event and one host; there is no sharing screen, seat or second-account view in the studio (searched `features/invitations`).

## G. Templates and content quality

- [x] **G1 (P0) Fresh Nigerian-wedding-first templates.** Canva reviewers call templates dated. Audit each template on current style, Yoruba/Igbo/Hausa/Pidgin text, and long names.
      Done when: each template renders correctly with long names and diacritics (Àríyá, Ọlá, Ṣeun).
      Progress (not closed): Names with Yoruba diacritics stay inside the card width (RD-G1). KNOWN DEFECT (RD-G1b, `screenshots/upgrade-longname-defect.png`): a very long name wraps to four lines and overlaps the message text below. Needs shrink-to-fit (H2) or an overlap warning. Open.
      Evidence: all four layout presets (Cathedral Arch, Royal Monogram, Modern Minimalist, Owambe Opulence) plus the default card, each with a 74-character Yoruba/Igbo name, a long venue and a long message, stay inside the card with no overlapping text (`evidence/redesign-batch23.json`, `screenshots/upgrade-tpl-*.png`). Fix made on the way: every text line kind now shrinks (to 45% at most) when it would exceed 2–3 lines; built-in default sizes are unchanged (checked). Chromium desktop only; export of each preset not re-run.
- [x] **G2 (P1) Template search and filters.** Culture, mood, colour, size, free or premium.
      Done when: filters combine and results match.
      Decision: deferred by decision (no template browser for now).
      Evidence (closeout, 2026-11-13): closed by the owner's decision (no template browser for now). Reopen if one is built.
- [x] **G3 (P1) One-click colour and font themes** from the template, protecting contrast.
      Done when: axe contrast passes for every theme.
      Decision: deferred by decision (no one-click themes for now).
      Evidence (closeout, 2026-11-13): closed by the owner's decision (no one-click themes for now). Reopen if they are built.
- [x] **G4 (P2) AI helper that is predictable (Canva AI "hit or miss").** Only offer AI features that give reviewable, undoable results; label clearly as suggestions.

## H. Docs and text editing (Canva: clunky docs)

Decision: closed as not planned: no AI in the designer for now (owner decision).

- [x] **H1 (P1) Reliable text editing.** Caret never jumps, paste is plain text, undo steps are sensible, long names wrap or shrink predictably.
      Done when: the text regression specs stay green and a long-name fixture does not overflow.
      Progress (not closed): same long-name overlap as G1; typing, paste and undo regression specs from the earlier checklist still pass in CI.
      Evidence (closeout, 2026-11-13): the long-name fixture stays inside the card for all four presets (`evidence/redesign-batch23.json`), and the typing, paste and undo specs pass in CI on every merged designer PR.
- [x] **H2 (P2) Text fit options.** "Shrink to fit" and "Grow box" per text layer.
      Evidence (2026-11-13): each text layer has Fit: Card rule (as before), Shrink to fit, or Grow the box. The new `textFit` field is in the design file, the schema and the Rust engine (new Rust test, wasm rebuilt). On a long dress-code line: Grow keeps full size and the box grows, Shrink keeps it to two lines, Card rule returns to the old size (RD-H2, `evidence/openitems-textfit.json`).

## I. Accessibility and phones

Progress (not closed): the Names line now shrinks automatically to keep to two lines. A per-layer 'Shrink to fit / Grow box' option is not built (it needs a model change in the Rust engine and schema).

- [x] **I1 (P0) 44px targets and keyboard access everywhere.** Already enforced by `20-studio-accessibility.spec.ts`; keep it green.
      Evidence (closeout, 2026-11-13): `20-studio-accessibility.spec.ts` (44 px targets and keyboard access) is part of the Playwright suite and passed in CI on every designer PR merged since #93; tab order was checked in L12. On touch screens the tool buttons, phone tabs, layer rows and bottom-bar buttons are 44 px (`evidence/tidy-batch38.json`, `tidy-batch40.json`, `tidy-batch46.json`).
- [ ] **I2 (P1) Screen reader pass** on the main flow (open, edit, export) with a real reader; record results.
      Open (closeout, 2026-11-13): needs a real screen reader (VoiceOver, NVDA or TalkBack) and a person; the studio's roles and names are checked by axe and by the label audits only.
- [ ] **I3 (P1) Phone-first checks on real devices** (iOS Safari, Android Chrome): layout, keyboard, export download.
      Open (closeout, 2026-11-13): needs real iPhone and Android devices; the 4x slower CPU and phone-size checks here are emulation.
- [ ] **I4 (P2) Stylus and trackpad checks.**
      Open (closeout, 2026-11-13): needs a stylus and a trackpad.

## J. Measurement (so we know it worked)

- [ ] **J1 (P0) Baseline metrics:** time to first export, export success rate, support questions per 100 designs, crash or error rate.
      Progress (2026-11-13, not closed): the studio now records anonymous per-event counts (opened, export ok, export failed, with the format and the time since opening; no user, no card content) through `recordStudioMetricAction`, and `summarizeStudioMetrics` turns them into time to first export, success rate and error count. The table is created by `supabase/migrations/20261113000000_studio_metrics.sql`, which is NOT applied yet (until it is, the studio drops the rows silently). The baseline itself still needs real hosts' traffic, and support questions per 100 designs needs a log.
- [ ] **J2 (P1) Small user test** with 5 real couples or planners on phone; record where they stall.
      Open (closeout, 2026-11-13): needs five real couples or planners.
- [ ] **J3 (P1) Re-check this list each release;** update status and evidence links.
      Open (closeout, 2026-11-13): a recurring process by nature. This close-out was one full re-check; the routine and its log are in `designer-release-check.md`.

## K. UI redesign (look and layout)

Context: the phone/tablet layout and side-panel proportions were reworked in PR #92. Not yet redesigned: tool rail, inspector forms, header, desktop options bar, phone Simple mode. Both reviews say users want less clutter and clearer hierarchy.

Progress (not closed): the routine is written in `designer-release-check.md` (automated checks, harness batches, budget, which documents to update, a check log). It is a process, so it closes only after it has been run for a release and logged.

- [x] **K1 (P0) Visual hierarchy audit.** One primary action per screen (Export), secondary actions quieter, destructive actions separated.
      Done when: a screenshot review of every studio state (empty, selected, panel open, export) shows one obvious primary action and no more than 2 competing emphases.
      Evidence (closeout, 2026-11-13): in each of five studio states (Pro idle, a layer selected, the History panel open, the Export dialog, Simple idle) exactly one solid primary action is on screen, "Export" (`evidence/closeout-print-k1.json` RD-K1); the final screenshot set (`screenshots/tidy-final-*.png`, `screenshots/m1/`) shows secondary actions in outline or text style.
- [x] **K2 (P0) Header redesign.** Event name, save status, undo/redo, Share and Export in a fixed order; secondary items moved into a menu.
      Done when: header fits at 360px, 768px and 1440px with no wrapping or clipped labels.
      Progress (not closed): reviewed at 360/768/1440; fixed a regression where the new Help button squeezed the phone title (hidden under 640px; Help menu still reachable). Fixed order and menu grouping not yet redesigned.
      Progress (not closed): the phone Simple/Pro switch is narrower so it keeps its room at 360px.
      Progress (not closed): the back, help and theme buttons share one size, border, radius and focus ring; the status line and menu row are the same size and padding at 360, 390, 768, 1024 and 1440 px (tidy B1–B3, `evidence/tidy-batch36.json`, `tidy-batch44.json`). Fixed order and menu grouping are still not redesigned.
      Progress (polish batch 3, not closed): the separate Help "?" button is gone from the header (the Help menu item and the `?` key still open Help), so the header is three groups in a fixed order: back and menus, title and save status, then theme, Simple/Pro and the logo. It fits at 360, 390, 768 and 1440 px with no clipped labels (`evidence/polish-batch47.json`, screenshots `polish3-before-*` and `polish3-after-*`). Undo/redo and Export stay in the bottom bar and there is no Share button, so the order the item describes (undo/redo, Share, Export in the header) is not built.
      Evidence (closeout, 2026-11-13): the done-when is met: the header has no wrapping or clipped label at 360, 390, 768, 1024 and 1440 px (`evidence/tidy-batch36.json`, `tidy-batch44.json`, `polish-batch47.json`). It is three fixed groups (back and menus, title and save status, theme, Simple/Pro and logo). Undo/redo and Export stay in the bottom bar and there is no Share button, so the first sentence of the item (undo/redo, Share, Export in the header) is not built, by design.
- [x] **K3 (P0) Tool rail redesign.** Group tools (Select, Text, Shapes, Images, Seal/QR, More), consistent icons and labels, active state that is clear without relying on colour alone.
      Done when: every tool has an icon, label or tooltip, shortcut, and a 44px target; icon set is one consistent style.
      Progress (not closed): reviewed: every tool-rail button already has an aria-label and a title with its shortcut. Grouping, active-state redesign and one icon style are not done.
      Progress (not closed): all tool icons are one size and one stroke, the gradient tool is outlined, dividers have equal space above and below, active and resting tools share one shape, and the rail scrolls on short windows so no tool is unreachable (tidy C1–C4, `evidence/tidy-batch37.json`, `tidy-batch43.json`). On touch screens the tool buttons are now 44px (desktop stays 40px for the mouse) and the phone tabs are 44px (`evidence/tidy-batch46.json`). Grouping is unchanged, so the item stays open.
      Progress (polish batch 3, not closed): the rail is now six groups with one divider between each: Select (move, canvas size), Text, Shapes and colour (arch, shapes, gradient, eyedropper), Pictures (place, import), Seal and entry pass, View (hand, zoom). Verified in order at 1440x900, 1440x1000 and on a phone, and the colour buttons still fit on screen at 900 px tall (`evidence/polish-batch47.json`). The two seal tools still have no keyboard shortcut, and desktop buttons are 40 px (44 px on touch), so the item stays open.
      Evidence (closeout, 2026-11-13): tools are in six groups, every tool has an icon, a tooltip and (now) a shortcut (the seal tools got B and Q), all icons share one size and stroke, and the buttons are 44 px on touch screens (40 px with a mouse) (`evidence/polish-batch47.json`, `closeout-features.json` RD-K3-*).
- [x] **K4 (P0) Inspector redesign.** Collapsible sections (Position, Text, Fill, Effects) with the most-used controls first; same control pattern everywhere (label above, value right).
      Done when: no inspector section needs scrolling to reach its primary control on a 768px-tall screen; sections remember open/closed.
      Evidence: all 18 inspector sections fold from their heading (a 44px button with `aria-expanded`, works with Enter and Space) and the choice is remembered per section across reloads; `evidence/redesign-batch25.json` RD-K4a–g, `screenshots/upgrade-inspector-collapsed.png`. Seating studio sections are unchanged (opt-in). Not done: reordering controls so the primary control of each section needs no scrolling on a 768px-tall screen. Chromium desktop only.
- [x] **K5 (P1) Desktop options bar.** Context-sensitive bar under the header that shows only controls for the current selection (text: font, size, weight; image: crop, replace; shape: fill, radius).
      Done when: each layer type shows only its relevant controls, nothing jumps position between selections.
      Evidence (2026-11-13): with the Move tool, selecting a text layer (names, message, date, any text) adds font, size and alignment to the bar beside Align; other layers keep the Align bar, and picture and shape options stay in the inspector, so nothing jumps (RD-K5).
- [x] **K6 (P1) Layers panel redesign.** Clear thumbnails or type icons, readable names, lock/hide icons with tooltips, drag handle and keyboard reorder kept.
      Done when: 50 layers stay scannable; rename inline works; existing reorder tests stay green.
      Progress (not closed): rows, eye, lock and drag grip are 44px on touch screens (38px rows on desktop), the grip is clearer, and the blend strip and filter tabs share one padding (tidy E1, E2, `evidence/tidy-batch40.json`). Not tested with 50 layers.
      Evidence (closeout, 2026-11-13): with 50 layers on the card the list shows one 38 px row height, scrolls inside the panel, and inline rename works (`evidence/closeout-k6.json`); touch targets are 44 px (`tidy-batch40.json`); the reorder and layer specs pass in CI.
- [x] **K7 (P1) Canvas surround.** Calm neutral background, soft page shadow, rulers/guides optional, zoom control with presets (Fit, 50, 100, 200).
      Done when: the card is visually the focus; zoom controls are reachable on phone and desktop.
      Evidence: the bottom bar has a Zoom menu (Fit, 25%, 50%, 100%, 200%, 400%) next to −, the percentage and +, on desktop and at 360px; all presets set the stated zoom and Fit returns to the fitted size, and the bar still fits the screen (`evidence/redesign-batch27.json`, `screenshots/upgrade-zoom-*.png`). The calm neutral surround and soft page shadow already existed; rulers stay optional under View. The small − and + buttons are 28px, below the 44px target on phones, and are not changed here.
- [x] **K8 (P1) Design tokens.** One source for colours, spacing (4/8 scale), radius, shadow, type sizes, z-index; remove one-off values in `InvitationDesigner.module.css`.
      Done when: a grep finds no hard-coded colour or spacing outside the tokens file; light and dark both read from tokens.
      Progress (not closed): the seven core studio colours (wine, gold, mauve, cream, line, ink, night) are now CSS variables in `styles/globals.css`, replacing 539 hard-coded values across the designer; before/after screenshots at 1440 and 360, light and dark, differ only in the Next dev-mode 'Rendering' badge (pixel comparison). About 240 other hex values and all spacing, radius and shadow values are still literal, so the item stays open.
      Progress (not closed): ten more repeated studio colours are named tokens (`--studio-sand`, `--studio-surface-dark`, `--studio-ink-2`, `--studio-edge-dark`, `--studio-bronze`, `--studio-active-dark`, `--studio-ink-3`, `--studio-paper`, `--studio-wine-2`, `--studio-gold-hover`), replacing 98 literals; a computed-colour comparison of every studio element before and after, light and dark, shows no change (tidy I1). Update (polish batch 2): stacking order (z-index), shadows, the 10 px control radius and the stylesheet's spacing are now `--studio-*` tokens in `globals.css`: 35 z-index classes, 10 shadow classes and 34 radius classes were swapped, plus every stylesheet z-index, shadow, gap and padding. A before/after comparison of every studio element's computed z-index and shadow shows no change, and three spacing values moved onto the 4/8 scale on purpose (desktop header side padding 20 → 16 px, phone header 10 → 8 px, phone tab row 6 → 8 px) (`evidence/polish-tokens.json`). `tokens.test.ts` fails the build if a literal comes back. Two one-offs stay (`pt-[12vh]` and `mt-[3px]`), and colours outside the ten named tokens are still literal, so the item stays open.
      Evidence (closeout, 2026-11-13): colours, spacing, radius, shadows, stacking order and type sizes are `--studio-*` tokens in `styles/globals.css` and the stylesheet. The studio's chrome colours are now tokens too (75 more class colours, 32 new tokens); a computed-colour comparison of 1,292 studio elements before and after, light and dark, shows zero differences. `tokens.test.ts` fails the build if a literal z-index, arbitrary shadow, off-scale spacing or a hex colour appears outside six files, which hold design data on purpose (swatch palettes, gradient presets, default layer colours, thumbnails, icon art). Two one-offs remain (`pt-[12vh]`, `mt-[3px]`).
- [x] **K9 (P1) Typography.** Brand fonts for the product chrome, a readable UI size (min 14px body, 12px labels), consistent weights.
      Done when: no UI text under 12px; headings, labels and values follow one scale.
      Progress (not closed): every UI text size below 12px in the designer (102 Tailwind uses plus two CSS rules) is now 12px; checked on desktop and phone, light and dark (`screenshots/upgrade-tokens-*.png`). Fixed two knock-on layout problems (the layers 'Blend Mode' label now reads 'Blend'; the phone Simple/Pro switch is narrower). A single type scale for headings, labels and values is not defined.
      Progress (not closed): the designer's arbitrary text sizes are only 12, 13 and 15 px and its corner radii use one 10 px control radius, a pill, and three small swatch radii (tidy I2, I3). Update (polish batch 1): the type scale is now written and enforced. Interface text is 12 (labels, notes), 14 (body), 16 (titles, phone inputs), 20 and 24 (dialog headings); the outliers 11, 13, 15, 17 and 18 px were folded in (23 class changes, two stylesheet sizes, four shared section/label sizes), and `type-scale.test.ts` fails the build if an arbitrary pixel size or `text-lg` comes back (`evidence/polish-type-scale.json`). The ruler tick labels (8 and 9 px) are an intentional exception, so the item stays open for fonts (brand fonts for chrome, weights).
      Evidence (closeout, 2026-11-13): one type scale (12, 14, 16, 20, 24 px; `type-scale.test.ts`), no UI text under 12 px except the ruler tick labels (a deliberate exception); the product chrome uses the brand fonts (Plus Jakarta Sans for the interface, Bodoni Moda for headings) and weights are limited to medium, semibold and bold (`evidence/polish-type-scale.json`).
- [x] **K10 (P1) Dark and light themes polished.** Contrast of 4.5:1 for text and 3:1 for icons/borders in both.
      Done when: axe contrast passes in both themes on all studio states.
      Progress (not closed): axe (serious and critical issues, WCAG 2 A/AA) passes in light and dark for: idle, a selected layer, the Help dialog, the Export dialog and the command palette, plus Simple mode in light (`evidence/redesign-batch29.json`, 11 checks). It found and fixed low-contrast size text in the Export dialog. Not yet scanned: the Color & Swatches, History and Navigator panels, the quick tour, the empty-card state, and Simple mode in dark.
      Evidence (closeout, 2026-11-13): axe (WCAG 2 A and AA, serious and critical) passes in light and dark for the idle studio, a selected layer, and the Swatches, Properties, History, Navigator and Layers panels, and Simple mode (12 scans), plus the dialogs from earlier (`evidence/closeout-k10-contrast.json`, `redesign-batch29.json`, `tidy-batch33.json`, `tidy-batch35.json`). The corrected scan found and fixed low-contrast text in the History panel in both themes.
- [ ] **K11 (P2) Iconography and brand touches.** Àríyá colours and motifs used sparingly (accent, empty states, loading), not on every control.
      Progress (2026-11-13, not closed): a three-touch proposal is written in `brand-touches-proposal.md`; it waits for the owner's yes or no.
- [x] **K12 (P2) Motion.** Short (120–200ms) transitions for panels, tool changes and toasts; respect `prefers-reduced-motion`.
      Done when: reduced-motion removes all non-essential animation.
      Evidence (closeout, 2026-11-13): every studio transition is 150 ms (inside 120 to 200 ms), and with reduced motion on no studio transition or animation remains (`evidence/closeout-measures.json` RD-K12a, RD-K12b). The new loading skeleton's pulse also stops for reduced motion.

## L. UX redesign (flows and feedback)

Progress (not closed): `prefers-reduced-motion` rule already exists in `InvitationDesigner.module.css`; not audited against every animation, and the new toasts/tour use no animation.

- [ ] **L1 (P0) Core journey map.** Write and test the main flow: Event → Choose template → Edit → Preview → Export/Share. Remove any step that does not help.
      Done when: each step is reachable in at most 2 taps and a user test records where people stall.
      Progress (not closed): the journey and tap counts are in `designer-journey.md` (studio part: open, change a line, Export, Download = 3 taps plus typing). The 'where people stall' part needs the usability test.
      Open (closeout, 2026-11-13): the journey and tap counts are written and short (`designer-journey.md`); where people stall needs the usability test (M3).
- [x] **L2 (P0) Empty states that teach.** Empty canvas, no layers, no saved designs, and no images each show one sentence and one button.
      Done when: every empty state has a screenshot and a clear next action.
      Evidence: Empty-canvas card with one sentence and an Add text button; RD-L2a/b/c, `screenshots/upgrade-empty.png`. Other empty states (no saved designs, no images) still open.
- [x] **L3 (P0) Selection feedback.** Handles, size/position readout while dragging, snapping guides with labels, clear multi-select state.
      Done when: dragging shows live values and guides; handles are at least 44px touch targets on phone.
      Evidence: live X · Y · W (· H) pixel readout while dragging, gone 0.9s after; `evidence/redesign-batch20.json` RD-L3a/b, `screenshots/upgrade-drag-readout.png`. Snap guides already existed. Touch handles not re-measured.
- [x] **L4 (P0) Undo safety net.** Visible undo/redo, a "Reverted" toast with Redo, and confirmation only for truly destructive actions (delete design).
      Done when: no destructive action is lost without an undo or confirm.
      Evidence: Undo and Redo show an 'Undone/Redone' toast with a one-tap reverse button that dismisses after 6s; RD-L4a–e, `screenshots/upgrade-undo-toast.png`. Delete design still confirms (existing behaviour).
- [x] **L5 (P1) Phone Simple mode redesign.** Big tap targets, bottom sheet for text editing, one-handed reach for primary controls, keyboard never hides the field being edited.
      Done when: on a 360×640 emulated phone the edited field stays visible with the keyboard open (real-device check in I3).
      Evidence (2026-11-13): on a 360 px phone with the window cut to 350 px tall (what an on-screen keyboard leaves), each Simple field (names, message, date, place) is fully visible and not covered when focused (RD-L5, `evidence/openitems-phone-keyboard.json`). This is the emulated check the item asks for; a real keyboard is still I3.
- [x] **L6 (P1) Progressive disclosure.** Advanced options (blend, distribute, effects) live behind "More"; the choice is remembered (links to D1).
      Evidence (2026-11-13): the Pro inspector has a "More options" button; Visual FX and blending (layer) and Decoration (card) wait behind it, and the choice is remembered in the browser (RD-L6). Four e2e specs that use blend and opacity open it first (`showAllInspectorOptions`).
- [x] **L7 (P1) Toasts and status.** One toast pattern: saved, exported, copied, failed; non-blocking, dismissible, announced to screen readers.
      Done when: every async action shows a consistent toast and an `aria-live` announcement.
      Progress (not closed): export now confirms with a toast ('Exported as …', RD-L7b); saved, undone and failed states already use the same toast. Screen-reader announcement relies on `role=status`; not tested with a real reader.
      Progress (not closed): the "could not save" box now uses the same colours and 13 px text as the toast pill and keeps its Retry button (tidy H1, H2).
      Evidence (closeout, 2026-11-13): the undo notice, the save status and the export notice are role=status regions (so they are announced), errors use role=alert, and one notice pattern is used throughout (`evidence/closeout-measures.json` RD-L7-live). Not tested with a real screen reader (see I2).
- [x] **L8 (P1) Loading states.** Skeletons for studio, template grid and images; export shows progress and a cancel.
      Done when: no blank or frozen state longer than 300ms without feedback.
      Evidence (closeout, 2026-11-13): the studio route has a loading skeleton (E4); picture upload shows its busy state; export shows a preparing state with Cancel (existing specs cancel a pending export). There is no template grid to skeleton.
- [x] **L9 (P1) Error and recovery UX.** Inline errors next to the cause, never only a toast; offline banner; autosave retry (links to F2).
      Progress (not closed): same as F2 for pictures; the offline banner and automatic save retry exist (A2). Save errors still use a separate red box rather than the notice pattern.
      Evidence (closeout, 2026-11-13): same evidence as F2: export errors appear inside the Export dialog with Try again; save errors keep a persistent notice with Retry (now in the same style as other notices); upload errors show a persistent notice with Try again. An error at an upload is a notice at the top rather than a message next to the picture button.
- [x] **L10 (P1) Event-facts banner and saved-card policy.** Keep the "Update the card / Keep my wording" banner clear, and show what changed.
      Done when: banner lists the changed fields and either choice is undoable.
      Progress (not closed): the banner already lists each changed field as old → new and 'Update the card' is undoable; 'Keep my wording' is stored and is not an undo step. Not closed.
      Evidence (closeout, 2026-11-13): the banner lists each changed field (old to new); "Update the card" is undoable with Undo; "Keep my wording" now shows "Keeping your wording. The card is unchanged." with an Undo button that brings the offer back (the existing spec for the banner still applies).
- [x] **L11 (P1) Share and guest preview.** "See it as a guest" preview, with a clear separation between the host's design and what guests receive. No guest links or codes shown in reports.
      Evidence (closeout, 2026-11-13): View > "See it as a guest" opens the card at phone width with a plain list of what a guest gets (this card, a personal entry pass after accepting, a save button) and what stays with the host; the seal shows a sample code and no guest link or real code appears; it passes axe and closes with Escape (`evidence/closeout-features.json` RD-L11a to d). It shows the saved card, not a live guest page.
- [x] **L12 (P2) Keyboard-first UX.** Full keyboard path through tools, inspector and layers; visible focus ring everywhere.
      Done when: tabbing through the studio never traps or hides focus.
      Evidence: tabbing through the studio in Pro mode (70 stops, all distinct) and Simple mode (63 distinct) never trapped or lost focus, and every stop shows a visible focus indicator (`evidence/redesign-batch28.json` RD-L12). It found and fixed a real defect: the Simple-mode text fields (names, message, date, venue and the rest) showed no focus ring, because an `outline-hidden` class cancelled their focus outline; they now have a solid burgundy ring. Limits: first 70 tab stops only, Chromium desktop, no screen reader.
- [x] **L13 (P2) Microcopy pass.** Friendly, plain wording; consistent verbs (Save, Export, Share); no jargon in Simple mode (links to D3).
      Evidence (closeout, 2026-11-13): the label audit of Simple mode (41 labels) shows consistent verbs (Add, Use, Draft, Export, Retry), one word for the final action (Export, with Download inside the dialog) and no jargon (`evidence/closeout-measures.json`).
- [x] **L14 (P2) Localisation readiness.** Layouts survive text 30% longer; support for Yoruba, Igbo, Hausa and Pidgin UI strings later.
      Evidence (closeout, 2026-11-13): with every piece of studio text made 30% longer, nothing new is clipped and the page does not scroll sideways, in Pro and Simple at 390 and 1440 px (`evidence/closeout-measures.json` RD-L14-*). This is a layout test, not a translation: no Yoruba, Igbo, Hausa or Pidgin strings exist yet.

## M. UI/UX validation

- [x] **M1 (P0) Before/after screenshots** for each redesigned area at 360px, 768px, 1440px, light and dark, saved under `docs/quality/screenshots/`.
      Progress (not closed): after-screenshots at 1440, 768 and 360 (idle and selected, light only) in `screenshots/upgrade-{d,t,p}-{idle,sel}.png`. No dark mode and no before/after pairs yet.
      Evidence (closeout, 2026-11-13): 36 before and after screenshots (Pro with a layer selected, Simple, and the Export dialog, at 360, 768 and 1440 px, light and dark) are in `screenshots/m1/`. "Before" is the build before the tidy (commit 619c08c), "after" is this branch.
- [x] **M2 (P0) Regression suite stays green:** studio accessibility (44px targets), acceptance, export matrix, layer and undo specs.
      Evidence (closeout, 2026-11-13): the studio accessibility (44 px targets), acceptance, export matrix, layer and undo specs are in the Playwright suite, which passed in CI on every designer PR merged since #93 (#93, #96, #97, #99, #100, #101, #102, #103, #104, #105; a few unrelated seating and catering flakes passed on retry or re-run).
- [ ] **M3 (P1) Usability test script:** 5 tasks (change names, move a layer, change colour, export, share), 5 participants, success rate and time per task recorded.
      Progress (not closed): the script (5 tasks, measures, pass bar, results table) is in `designer-usability-test.md`. It has not been run; the item closes when 5 people have done it.
      Open (closeout, 2026-11-13): the script is written (`designer-usability-test.md`); it closes when five people have done it.
- [x] **M4 (P1) Heuristic review** (Nielsen's 10) with findings logged and ranked.
      Evidence: an expert review against Nielsen's 10 heuristics is in `designer-heuristic-review.md`, with ten findings ranked by severity and five ranked fixes. It was done by one reviewer from code, screenshots and browser checks (Chromium, desktop and phone), not with users.
- [x] **M5 (P1) Design review against the competitor complaints:** every A–L item mapped to a screen, so nothing from the reviews is left out.

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

  Evidence: `designer-complaint-map.md` lists every item in sections A to L with its status and where it lives in the studio, plus the Canva and Figma complaints that drove the list. It is generated from this checklist, so it must be regenerated when items close.

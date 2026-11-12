# Studio tidy list (keep the design, make it consistent)

Scope agreed with the owner: **keep the current design** (layout, Àríyá colours, Bodoni, template-first) and tidy it in detail. No new look, no renamed modes. Each item says where it lives, what changes, and how it will be checked. Before screenshots are in `screenshots/tidy-before-*.png` (Chromium, desktop 1440, tablet 768, phone 390, light theme, from the local harness).

Order of work: A to D first (visible defects), then E to H, then I to K. One branch and PR per group, from `main` after PR #93 merges.

## A. Defects found in the audit (fix first)

| #   | Where                            | Problem seen                                                                     | Fix                                                                                            | Check                                                       |
| --- | -------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A1  | `StudioBottomDock.tsx` zoom menu | The "Zoom" menu I added shows "Zoo" (clipped) on desktop and phone               | Give it room or show a chevron label, 44px target on touch                                     | Screenshot at 1440 and 390; no clipped text                 |
| A2  | `InvitationDesigner.tsx` header  | On a 390px phone the Simple/Pro switch runs off the right edge ("Pro" is cut)    | Fit the header at 360 to 430: tighten gaps, drop the theme button into the View menu on phones | Screenshot at 360, 390, 430; no clipping (extend `batch28`) |
| A3  | Options bar on phone             | The Rulers / Grid / Snap row is cut mid-word at the edge with no sign it scrolls | Add an edge fade and keep the first off-screen item partly visible, or wrap                    | Screenshot at 390                                           |
| A4  | Simple mode (desktop)            | Rulers are on by default in Simple mode, which adds clutter for beginners        | Rulers off by default in Simple mode; remembered choice in Pro unchanged                       | Simple screenshot has no rulers; Pro keeps its setting      |

## B. Header and menu bar

| #   | Problem                                                                                           | Fix                                                                            |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| B1  | Header items use three different looks: text `?`, a palette icon for the theme, an avatar tile    | One icon style and size for the three round buttons; same hover and focus ring |
| B2  | Title is Bodoni 17px but the status line under it is a different weight and colour on each screen | One status style (12px, muted), same on every width                            |
| B3  | Menu bar (File, Edit, Insert…) sits at a different height and spacing on phone                    | Same row height and padding scale as the header on all widths                  |

## C. Tool rail

| #   | Problem                                                                               | Fix                                                                                            |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| C1  | Icons mix outline and filled styles (the gradient square is filled, the rest outline) | One stroke weight and size; the gradient tool keeps a small gradient chip but in outline style |
| C2  | Active, hover and focus states differ between tools                                   | One state set: active (filled wine), hover (tint), focus (ring)                                |
| C3  | Colour swatches and the swap arrow at the bottom are cramped and tiny                 | 44px targets, even spacing, a clear label on hover                                             |
| C4  | Group separators are uneven                                                           | Same gap above and below every divider                                                         |

## D. Options bar and inspector

| #   | Problem                                                                                                             | Fix                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| D1  | Alignment icons appear twice: in the options bar and again in the inspector                                         | Keep one set (options bar); the inspector keeps only what is not duplicated     |
| D2  | Inspector starts with a small "NAMES" heading, then "POSITION & SIZE": two heading styles that look equal in weight | One heading level for the layer name (larger) and one for sections (small caps) |
| D3  | Label spacing above number fields is uneven (X, Y, Width, Turn, See-through)                                        | One label-above-field pattern and one gap                                       |
| D4  | Fields, buttons and segmented controls use different corner radii (8, 12, 99 px) in Pro versus Simple               | Two radii only: controls 10px, pills 99px, used the same in both modes          |

## E. Layers panel and bottom bar

| #   | Problem                                                                      | Fix                                                           |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| E1  | Layer rows are 42px with a tiny drag grip and faint lock and eye icons       | One row height, clearer grip, 44px hit areas for eye and lock |
| E2  | Blend / opacity strip crowds the tab row                                     | Same padding scale as the rest of the panel                   |
| E3  | Zoom, size readout and Export have uneven gaps; the − and + buttons are 28px | One gap scale; 44px targets on touch screens                  |

## F. Simple mode

| #   | Problem                                                                       | Fix                                                                         |
| --- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| F1  | Panel starts with a long "Your own card" explainer before the words           | Put "Words" first; move the import into a collapsed "Use your own card" row |
| F2  | Field radius and size differ from Pro                                         | See D4                                                                      |
| F3  | "Show" checkboxes sit on the label row at a different baseline from the label | Align on one baseline                                                       |

## G. Phone

| #   | Problem                                                                                         | Fix                                                      |
| --- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| G1  | Pro bottom tabs and the status bar are two stacked rows                                         | Keep both but give them one background and one separator |
| G2  | The Properties / Colours / Layers / History / View tabs have no active indicator colour at rest | Active tab gets the same wine fill as the desktop tabs   |

## H. Notices and messages

| #   | Problem                                                                         | Fix                                                                                   |
| --- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| H1  | Two message styles: a pill at the top and a red box bottom-left for save errors | One notice component for both; keep the `studio-error-alert` test id and Retry button |
| H2  | Notice text sizes differ (13px pill, 12px box)                                  | 13px for both                                                                         |

## I. Tokens and scale (finish what K8 and K9 started)

| #   | Fix                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------- |
| I1  | Replace the remaining hard-coded colours with the studio CSS variables; add spacing (4, 8, 12, 16, 24) and radius (10, 99) tokens |
| I2  | One type scale: 12 / 13 / 15 / 17 / 20 px; no other sizes                                                                         |
| I3  | Replace odd values (`10.5px`, `13px` outliers, `rounded-[...]` one-offs) with the scale                                           |

## J. Wording (labels only, no renaming of modes)

| #   | Fix                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------- |
| J1  | Plain-words pass on Pro labels: "Distribute" to "Space evenly", "See-through" tooltip says "Opacity" |
| J2  | Every tool tooltip carries its shortcut                                                              |

## K. Checks for the whole tidy

1. Before and after screenshots for every group (360, 390, 768, 1440; light and dark; Simple and Pro).
2. `batch28` (names and keyboard), `batch29` (axe contrast), the 44px accessibility spec and the full E2E suite stay green.
3. Pixel comparison shows only the intended differences.
4. Update `designer-redesign-checklist.md` (K1, K2, K3, K5, K6, K8, K9, L5, L7) only with evidence.

Not part of this tidy: a new layout, new modes, new brand motifs, version history, templates.

## Done so far

### Export dialog (owner screenshot, dark computer with a light studio)

Problems seen: badges, descriptions and sizes almost invisible; badges wrapping onto two lines; cards of unequal height with an empty slot; the Download button below the fold; focus on the close button. Root cause: the dialogs used Tailwind `dark:` styles, which follow the computer's dark mode, while the studio has its own light/dark setting. A dark computer with a light studio gave a dark panel with light-theme text.

What changed (`ExportModal.tsx`, new `dialog-theme.ts`):

- Colours now come from the studio's own theme (four combinations of computer and studio theme checked).
- Header and footer stay in view; only the middle scrolls, so Download is always visible (also on a 390 px phone).
- Format cards: short one-line badges (Print, Lossless, Light, Under 400 KB, Editable), equal heights per row, the backup card full width, `aria-pressed` for the chosen card, focus lands on the chosen card.
- Same theme fix applied to the Help dialog, command palette and quick tour (`dialog-theme.ts`).
- Format titles and button names are unchanged, so the existing E2E specs still find them.
- Evidence: `evidence/tidy-batch32.json` (axe in four theme combinations, footer visible, card heights, backup download), `evidence/tidy-batch33.json` (axe for Help, palette and tour), screenshots `tidy-export-after-*.png`.

### Group A: defects from the audit (A1 to A4), all fixed

- **A1** The Zoom menu is now a compact chevron (▾), no clipped text, still sets 25 to 400% and Fit.
- **A2** The Simple/Pro switch has the room it needs, so it is fully on screen at 360, 390 and 430 px. The theme button stays in the header (an existing E2E step uses it on a phone).
- **A3** The options row shows a soft edge on the side where there is more to scroll to (CSS only).
- **A4** Rulers follow the mode: off by default in Simple, on in Pro; once the host chooses, their choice stands.
- Evidence: `evidence/tidy-batch34.json` (11 checks) and `screenshots/tidy-after-a*.png`.

### Theme sweep: no `dark:` styles left in the designer

The last `dark:` styles (empty-card prompt, "Add text" button in the options bar, notice buttons) now follow the studio's own theme. Checked with axe on the idle studio, a selected layer, the undo toast and the empty card, with the computer in dark mode and the studio in light and in dark (`evidence/tidy-batch35.json`, 8 checks, all clear).

### D1: alignment shown twice, on purpose (change tried and reverted)

The alignment icons appear in the options bar and again in the inspector. Removing the inspector row looked like a tidy-up and passed local checks, but CI caught a case it broke: the options bar shows each tool's own options, so its Align row exists only while the Select tool is active. After drawing a shape the options bar shows shape options, and the inspector row is then the only way to align the layer (`studio-checklist-audit.spec.ts` clicks "Align left" in that state). So both stay. A better tidy would keep an Align row in the options bar for every tool; that is a larger change and is left open.

### Second batch: B1, C3, E3 and H1

- **B1** The back, help and theme buttons in the header share one size (40 px), border, radius and focus ring.
- **H1/H2** The "could not save" box uses the same colours and 13 px text as the message pill at the top. It keeps its `studio-error-alert` test id and its Retry button.
- **C3** The colour reset and swap buttons are 32 px buttons with the same hover and focus look as the tools. While doing this I found a defect that was already there: on a desktop window shorter than about 940 px the tool rail was cut off, and the tools below the hand could not be reached. The rail now scrolls in that case (`RD-C5`).
- **E3** On touch screens the undo, redo, zoom −/+, zoom percentage and Export buttons are 44 px. Below 430 px wide the zoom presets menu is hidden to make room (the −/+ buttons and the percentage button remain). Desktop sizes are unchanged. Checked at 360, 390 and 1440 px (`evidence/tidy-batch38.json`).
- Evidence: `evidence/tidy-batch36.json`, `tidy-batch37.json`, `tidy-batch38.json`; screenshots `screenshots/tidy-*-after-*.png`.
- Still open from the list: B2, B3, C1, C2, C4, D2 to D4, E1, E2, F1, F3, G1, G2, I1 to I3, J1, J2, K.

### Third batch: D2, D3, D4, E1 and E2

- **D2** In the inspector the layer's own name is now the title (15 px, semibold, dark ink) and "Position & size" is a plain 13 px sub-heading instead of a second small-caps heading, so the two no longer look equal in weight.
- **D3** Every two-column field grid in the inspector uses one gap (10 px) and every number field has one label spacing (4 px).
- **D4** Fields, buttons and cards in the inspector and in Simple mode use one corner radius (10 px). Pills stay fully round (for example the search box). The shared panel components that the seating studio also uses were left alone on purpose.
- **E1** Layer rows are 38 px on a desktop and 44 px on touch screens; the eye and lock buttons are 44 px on touch; the drag grip is wider and darker.
- **E2** The blend/opacity strip and the layer filter tabs share one padding (12 px sides, 8 px top and bottom); the filter tabs have a 44 px minimum height on touch.
- Evidence: `evidence/tidy-batch39.json` (4 checks), `tidy-batch40.json` (4 checks); `batch28`, `batch29` and `batch33` still pass. Screenshots `screenshots/tidy-d-*` and `tidy-e-after-390.png`.
- Still open from the list: B2, B3, C1, C2, C4, F1, F3, G1, G2, I1 to I3, J1, J2, K.

### Fourth batch: F1, F3, G1 and G2

- **F1** Simple mode starts with "Words". The import moved down into "Use your own card", which starts folded (it stays open when a card has already been imported). This needed one small option on the shared panel section (`defaultClosed`); sections that do not use it behave as before.
- **F3** Each word field's label and its "Show" checkbox now sit on one line (same 44 px row, both centred).
- **G1** Checked, nothing to change: the phone tab row and the status bar already share one background and one separator.
- **G2** The phone tabs (Properties, Colours, Layers, History, View) have a soft pill background while the panel is closed, so they read as buttons; the open tab keeps its wine fill. The tab text is 12 px (it was 11.5 px). Checked at 360 and 390 px, with axe.
- Left open: the phone tabs are 38 px tall inside a 48 px row (the studio's 44 px rule is met for the controls people use most, but not for these); fixing it means changing the sheet's height budget.
- Evidence: `evidence/tidy-batch41.json` (4 checks), `tidy-batch42.json` (4 checks); `batch28`, `batch29` and `batch33` still pass. Screenshots `screenshots/tidy-f-after-1440.png`, `tidy-g-before-390.png`, `tidy-g-after-390.png`.
- Still open from the list: B2, B3, C1, C2, C4, I1 to I3, J1, J2, K.

### Fifth batch: B2, B3, C1, C2, C4 and I1

- **B2, B3, C2, C4** Measured at 360, 390, 768, 1024 and 1440 px: the status line under the title already has one size, weight and colour (12 px, regular, muted); the menu row buttons already share one text size and padding; active and resting tools already share size and corner shape; the space above and below each tool-rail divider is equal (10 px). Nothing to change; the checks are kept as guards (`evidence/tidy-batch43.json`, `tidy-batch44.json`).
- **C1** All tool icons now share one size (18 px) and one stroke (1.8; the three icons from the shared icon set were 2). The gradient tool is an outlined square with a small gradient inside instead of a filled square.
- **I1** Ten colours used again and again in the designer are now named studio tokens in `globals.css` (`--studio-sand`, `--studio-surface-dark`, `--studio-ink-2`, `--studio-edge-dark`, `--studio-bronze`, `--studio-active-dark`, `--studio-ink-3`, `--studio-paper`, `--studio-wine-2`, `--studio-gold-hover`), replacing 98 hard-coded values. I compared the computed colour of every element in the studio, light and dark, before and after: the only differences are the gradient chip (on purpose) and the same colours printed in a different colour space.
- **I2, I3** The designer's arbitrary text sizes are already only 12, 13 and 15 px and its one-off radii are the 10 px control radius plus three small ones (2, 3 and 4 px) used inside swatches and handles. Nothing further to change.
- Still open from the list: J1, J2 (wording and tooltips), K (final before/after set).

### Sixth batch: J1, J2 and K (the tidy is complete)

- **J1** Plain words: "Distribute" is now "Space evenly" everywhere (the inspector section, its two buttons, the options bar label and the buttons' names, and the multi-select hint), with "left to right" and "top to bottom" saying what each does. The "See-through" field keeps its name (existing tests and users rely on it) and now explains itself in a tooltip: "Opacity: 0% is solid, 100% is invisible".
- **J2** Every tool that has a keyboard shortcut shows it in its tooltip (13 of 13 checked); the two seal tools have no shortcut, so their tooltips are just their names. Evidence: `evidence/tidy-batch45.json` (3 checks).
- **K1** Final screenshots for Simple and Pro, light and dark, at 360, 390, 768 and 1440 px: `screenshots/tidy-final-*.png` (16 images). Earlier groups also have their own before/after images (`tidy-before-*`, `tidy-*-after-*`).
- **K2** `batch28` (names and keyboard, 8 checks), `batch29` (axe contrast, 11 checks) and `batch33` (dialogs, 9 checks) still pass; the 44 px accessibility spec and the full E2E suite pass in CI on every merged tidy PR.
- **K3** Pixel comparison was done as a computed-colour comparison of every studio element before and after the colour-token change (light and dark): the only difference is the gradient chip, on purpose.
- **K4** `designer-redesign-checklist.md` now has progress notes on K2, K3, K6, K8, K9 and L7. None is closed: the items ask for more than the tidy covers (tool buttons are 40 px not 44 px, no written type scale, spacing and shadow still literal, 50-layer test not run, header order not redesigned).
- **Open after the tidy:** the phone tabs are 38 px tall (see the fourth batch); the shared panel components used by the seating studio (`studio-ui.tsx`) still have their own radii and colours; a real-device pass on phones.

### After the tidy: 44 px touch targets for the tool buttons and phone tabs

- On touch screens the tool rail buttons are 44 px (they were 40 px) and the five phone tabs (Properties, Colours, Layers, History, View) are 44 px tall (they were 38 px). To make room the phone tab row and the tool strip are 52 px tall instead of 48 px; the canvas still ends above the bottom bar at 360, 390 and 768 px. Desktop tool buttons stay 40 px (mouse). Evidence: `evidence/tidy-batch46.json` (8 checks), `screenshots/tidy-touch-after-390.png`.
- This closes the first two items in "Open after the tidy" above. Still open: the shared panel components used by the seating studio, and a real-device pass on phones.

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

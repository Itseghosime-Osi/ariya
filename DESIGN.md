# Àríyá design patterns

How Àríyá looks and behaves, so new screens feel like the same product. The reference implementations are the event pages (`/events` and `/events/[id]`); their building blocks live in `src/features/events/components/desk/` and `src/styles/desk.css`. For the build rules an agent should follow, see `.codex/skills/ariya-celebration-ui/SKILL.md`.

## Principles

1. **Joyful, not administrative.** This is a celebration tool for Nigerian weddings and owambe. Warm, handmade and festive beats neutral SaaS.
2. **One memorable thing per section.** Replace many small widgets with a single considered visual (rings, a constellation, a woven strip).
3. **Interactive by default.** Things respond to pointer, touch and keyboard: they tilt, dim, filter, reorder, tick off and celebrate.
4. **Calm banners.** A hero holds a seal, names, one detail line, a few actions and one big number. Nothing else.
5. **Everyone can use it.** Reduced motion, keyboard access and WCAG 2.2 AA are requirements, not polish.

## Colour

Tokens are in `src/styles/globals.css`. Prefer tokens; the hex values below are the ones used in the desk components.

| Role                          | Token / value                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Page background               | `--background` `#faf6ee`, `--ivory` `#f7f2ea`                                                |
| Cards                         | `--surface` white, `--surface-container*` for tints                                          |
| Text                          | `--night` `#1c0f14`, secondary `--label-2` `#5a474e`                                         |
| Primary                       | burgundy `--burgundy` `#6b1e2e`, wine `--wine` `#4a111d`, deep `#6e1426`                     |
| Dark stage                    | `#1c070d` with an aurora of burgundy and gold                                                |
| Accent                        | gold `#b8864b`, champagne `#e9c98a`, gold ink `--gold-ink` `#7a5612` (text on light)         |
| Success / declined / awaiting | `#1f6b4a` / `#9e2a2b` / `#b88728` (`--rsvp-*`)                                               |
| Ring palette                  | replies `#c1283d`, seating `#2e6a4f`, vendors `#8a6620`, deposits `#b4531f`, tasks `#3b5b8a` |
| Tints                         | blush, sage, sand, sky (`--tint-*`)                                                          |

Rules: colour never carries meaning alone (always add words, icons or numbers); text on gold or burgundy must hold 4.5:1; large shapes hold 3:1.

## Typography

- **Display:** Bodoni Moda (`font-display`) for couple names, page and card titles, and big numbers.
- **Body:** Plus Jakarta Sans (`font-sans`).
- **Eyebrow:** `text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink` above a card title. Use it to label a section ("Readiness", "Budget", "Guestbook").
- Numbers that change use `tabular-nums`. Animated numbers use `@number-flow/react`.

## Surfaces

| Surface      | Use                                                               | How                                                   |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------- |
| Bento card   | Default content container                                         | `bento-card`, 24px radius, soft shadow                |
| Velvet stage | Hero, featured banner, night-sky guest view                       | `#1c070d` + `desk-aurora` + `GoldDust` + `desk-grain` |
| Stationery   | Anything that stands for a real invitation or upcoming-event card | `desk-paper` + `foil-sheen` in a `TiltCard`           |
| Glass        | Floating bars and the next-up strip                               | `glass`                                               |

Radius: 32px for hero stages, 20-24px for cards, full pills for buttons and chips.

## Signature motifs

- **Wax seal** (`MonogramSeal`): initials of the couple on a burgundy seal. Marks every event (list rows, tiles, hero, invitation).
- **Weave** (`weave`, `weave-fill`): a woven stripe texture, a nod to aso ebi fabric. Used for progress fills and card top bands.
- **Foil sheen** (`foil-sheen`): a light sweep across stationery and seals.
- **Gold dust** (`GoldDust`): drifting particles on dark stages that scatter from the cursor.
- **Date stamp:** a small calendar block (month on burgundy, day below) next to titles.

## Data visualisation

Avoid default charts. Use these instead:

- **Readiness rings** (`ReadinessRings`): concentric rings, one per area, with a legend row each. Hover or focus a ring or row to dim the rest and show its number in the centre.
- **Guest constellation** (`GuestConstellation`): stars grouped by side with filter chips and an expected-on-the-day stepper.
- **Reply waffle** (`GuestRepliesBentoCard`): 100 dots, one per percent; filled, open, and small dots for accepted, awaiting, declined.
- **Budget weave** (`BudgetWeave`): a strip of bands sized by cost, solid for paid, hatched for unpaid.
- **Mini rings:** two small rings (Replied, Seating) on upcoming-event tiles and ledger rows.
- Always provide the numbers as text (legend, caption or `sr-only`) alongside the graphic.

## Interaction patterns

- **Tilt** (`TiltCard`): cards lean toward the pointer. Fine pointers only.
- **Sparkle and confetti** (`SparkleSurface`, `celebrate`): tap a hero for sparkles; a button or first completion throws confetti. Celebrate a milestone once (`claimMilestone`).
- **Reorder:** drag a grip, or focus it and use the arrow keys (To-do board).
- **Tick off:** a round check button moves an item to a "Done" lane with Undo.
- **Carousel:** arrows, dots, swipe and arrow keys (`CelebrationStage`).
- **Tabs and phases:** `role="tablist"` with a visible selected state (`PlanningRibbon`).
- **Shared-element morph:** list card to detail hero via React `ViewTransition` (`name="celebration-{id}"`).
- **Optimistic updates:** apply the change at once, call the server action, roll back and show an error if it fails.

## Motion

- Easing `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`; most transitions 150-300ms, hero draws 1-1.1s with staggered delays.
- Everything respects `prefers-reduced-motion` (CSS overrides, `respectMotionPreference`, `MotionConfig`).
- Never animate money (CBN rules).

## Layout

- 12-column bento grid on desktop (`lg:grid-cols-12`); cards span 4, 5, 7 or 12.
- Phone (390px): single column, legends full width, 44px tap height where possible. The shared layout owns the sidebar, top bar and phone dock; pages render content only.
- Long titles: `line-clamp` plus `[overflow-wrap:anywhere]`. Chips: `whitespace-nowrap shrink-0`.

## Content voice

Warm and short, Nigerian-aware: "Every yes, together.", "Owambe mode", "aso ebi", "small chops", "gele". Say what to do next ("Seat 44 confirmed guests"), not what the system did. Use Naira (`₦`) with `formatNairaCompact`.

## Accessibility checklist

- axe with `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`: zero violations on `/events` at 1440 and 390 (CI enforces).
- Targets at least 24x24px (44px for primary controls).
- An `aria-label` must start with the visible text (no `label-content-name-mismatch`).
- Visible focus rings; keyboard alternatives for any drag or hover-only behaviour.
- Colour is never the only signal.

## Where things live

| Thing                                                  | Location                                         |
| ------------------------------------------------------ | ------------------------------------------------ |
| Colour, font and component tokens                      | `src/styles/globals.css`, `src/styles/glass.css` |
| Desk motifs and animations                             | `src/styles/desk.css`                            |
| Desk components                                        | `src/features/events/components/desk/`           |
| Events list components                                 | `src/features/events/components/`                |
| Pure insight helpers (readiness, phases, next actions) | `src/features/events/lib/overview-insights.ts`   |
| Agent skill                                            | `.codex/skills/ariya-celebration-ui/SKILL.md`    |

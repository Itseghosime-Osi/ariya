---
name: ariya-celebration-ui
description: Design language and build rules for Àríyá (Nigerian owambe and wedding event planner), used for any new or redesigned screen in the ariya repo. Covers the burgundy, ivory and gold look, wax-seal and invitation-paper motifs, tilting cards, woven progress bars, confetti and sparkles, accessibility gates and the motion/Next.js conventions in this codebase.
---

# Àríyá celebration UI

Use this when building or restyling a screen in the `ariya` repo (Next.js App Router, Tailwind v4, motion). The goal is a page that feels joyful and handmade, not a generic SaaS dashboard.

## Before you write code

- `AGENTS.md` says this Next.js (16.x) has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` first.
- Look at `src/features/events/components/desk/` and `src/styles/desk.css` before inventing a new component. Reuse first.

## Look and feel

- **Palette:** burgundy `#6e1426` / `#1c070d` (night), ivory/cream surfaces, gold `#b8864b` / `#e9c98a`. Status colours: green `#2e6a4f`, amber `#8a6620`, orange `#b4531f`, blue `#3b5b8a`, red `#c1283d`.
- **Type:** `font-display` (serif) for names, titles and big numbers; small uppercase tracked eyebrows (`text-[11px] tracking-[0.24em] text-gold-ink`) above headings.
- **Motifs:** wax-seal monogram (`MonogramSeal`), invitation stationery (`desk-paper`, `foil-sheen`), a woven texture (`weave`, `weave-fill`), a velvet dark stage (aurora gradient + `GoldDust` + grain) for hero areas. Light cards are `bento-card`.
- **Tone:** warm and celebratory. People should feel joy, not admin. Prefer one memorable thing per section over many small widgets. Keep banners uncluttered: seal, names, one detail line, a few actions, one big number.

## Interaction patterns

- Cards tilt toward the pointer with a foil sheen (`TiltCard`); only on fine pointers and when motion is allowed.
- Tap or click anywhere on a hero throws sparkles (`SparkleSurface`); a button can throw confetti (`celebrate.ts`, lazy-loaded `canvas-confetti`). Celebrate milestones once (`claimMilestone`).
- Progress is shown as rings, a dot grid, or a woven strip, never a plain bar. Numbers animate with `@number-flow/react`.
- Lists a user cares about are draggable with a keyboard alternative (grip handle + arrow keys), using motion `Reorder` and `useDragControls`.
- Selecting something previews it (hover or focus dims the rest and shows the detail in the centre).
- A list card morphs into its detail page with React `ViewTransition` (`name="celebration-{id}" share="desk-morph" default="none"`).
- Never animate money (CBN rules). Show naira with the hand-rolled `formatNairaCompact`, not `Intl` compact notation (hydration mismatch).

## Hard rules

- **Reduced motion:** every animation, tilt, particle and confetti path must respect `prefers-reduced-motion` (CSS overrides in `desk.css`, `respectMotionPreference` on NumberFlow, motion `MotionConfig`).
- **Accessibility gate:** the Playwright E2E runs axe with tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` on `/events` at 1440px and 390px and expects **zero violations of any impact**. Watch for:
  - `target-size`: every interactive target at least 24x24px (pad small dots and thin bands with `min-w-6`, `h-6`).
  - `label-content-name-mismatch`: an `aria-label` must start with, or equal, the visible text. Prefer visible text + `sr-only` extras over `aria-label` overrides.
  - `button-name` / `region`: icon-only controls need names; content belongs in landmarks.
  - Colour contrast on gold-on-dark and burgundy-on-ivory text.
- **Hydration safety:** round SVG coordinates to 2 decimals; avoid `Date.now()`, locale formatting or `Math.random()` in render without a stable initial value.
- **Bundle:** no Three.js or GSAP in app chunks (`pnpm check:bundle`). Lazy-load heavy effects.
- **Motion setup:** components using `m.*` need a `LazyMotion` ancestor (`domAnimation`, strict). Import from `motion/react`.
- **Layout shell:** pages render only their content. `app/(app)/layout.tsx` owns the sidebar, top bar and phone dock; do not wrap pages in `AppShell`.

## Responsive

- Design at 1440px and 390px. At phone width cards stack, legends go full width, and controls keep 44px tap height where possible.
- Long titles use `line-clamp` plus `[overflow-wrap:anywhere]`; chips use `whitespace-nowrap` and `shrink-0`.

## Keep tests meaningful

- Keep existing `data-testid`s when restyling (`todo-bento-card`, `todo-item-{id}`, `donut-attending-count`, `donut-legend-{key}`, `week-day-*`, `tab-upcoming`, `single-event-seating-progress`, `invitation-tile`, `featured-celebration`, etc.).
- If a redesign removes a feature, move it somewhere visible instead of dropping it (seating conflicts now lead the "Next up" strip). Update the E2E test to the new place rather than deleting the assertion.

## Done checklist

`pnpm typecheck && pnpm lint && pnpm test && pnpm format:check && SKIP_ENV_VALIDATION=1 pnpm build && pnpm check:bundle`, then an axe scan at 1440 and 390 with the tags above. Use a temporary preview route with mock data for screenshots; delete it before committing.

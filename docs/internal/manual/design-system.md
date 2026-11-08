# Design system

Colour, type, surfaces, motifs, motion and the accessibility checklist.

Audience: Designers and developers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Principles

1. **Joyful, not administrative.** Warm and festive beats neutral SaaS.
2. **One memorable thing per section.** Replace several small widgets with one considered visual.
3. **Interactive by default.** Things tilt, dim, filter, reorder, tick off and celebrate.
4. **Calm banners.** A seal, names, one detail line, a few actions and one big number.
5. **Everyone can use it.** Reduced motion, keyboard access and WCAG 2.2 AA are requirements.

## Colour

| Role       | Value                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| Page       | `#faf6ee` background, `#f7f2ea` ivory                                                        |
| Text       | Night `#1c0f14`, secondary `#5a474e`                                                         |
| Primary    | Burgundy `#6b1e2e`, wine `#4a111d`                                                           |
| Dark stage | `#1c070d` with burgundy and gold aurora                                                      |
| Accent     | Gold `#b8864b`, champagne `#e9c98a`, gold ink `#7a5612` for text on light                    |
| Status     | Accepted `#1f6b4a`, declined `#9e2a2b`, awaiting `#b88728`                                   |
| Rings      | Replies `#c1283d`, seating `#2e6a4f`, vendors `#8a6620`, deposits `#b4531f`, tasks `#3b5b8a` |

Tokens live in `src/styles/globals.css`. Colour never carries meaning alone.

## Type

Display: Bodoni Moda. Body: Plus Jakarta Sans. Eyebrow labels are 11 px, semibold, uppercase, widely tracked, in gold ink. Changing numbers use tabular figures.

## Surfaces and motifs

- **Bento card** (24 px radius), **velvet stage** for heroes, **stationery** for anything that stands for a real invitation, **glass** for floating bars.
- **Wax seal** with the couple's initials, **weave** stripe (aso ebi), **foil sheen**, **gold dust**, **date stamp**.

## Charts

Avoid default charts: use readiness rings, the guest constellation, the reply waffle, the budget weave and mini rings, always with numbers as text.

## Motion

Ease `cubic-bezier(0.22, 1, 0.36, 1)`, mostly 150–300 ms. Never animate money. Respect reduced motion everywhere.

## Voice

Warm, short, Nigerian-aware. Say what to do next ('Seat 44 confirmed guests'), not what the system did. Use ₦.

The full guide is `DESIGN.md`; the agent skill is `.codex/skills/ariya-celebration-ui/SKILL.md`.

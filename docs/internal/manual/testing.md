# Quality and testing

What CI runs, the test layers and the accessibility and bundle guards.

Audience: Developers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Layers

| Layer                | Tool                      | Covers                                                     |
| -------------------- | ------------------------- | ---------------------------------------------------------- |
| Unit and integration | Vitest                    | Pure logic, schemas, actions, route handlers, parity tests |
| Database             | pgTAP (`pnpm test:db`)    | RLS, privileges, triggers, functions                       |
| End to end           | Playwright                | Real flows in Chromium, with axe accessibility scans       |
| Rust                 | `cargo test`, fmt, clippy | Both engines                                               |
| Bundle guard         | `pnpm check:bundle`       | No Three.js or GSAP in app chunks                          |

## CI jobs

- Lint, types, unit tests and build
- Database pgTAP tests
- Playwright E2E tests
- App bundle check (no Three.js or GSAP)
- Rust core (fmt, clippy, tests, wasm matches a fresh build, generated types match)

## End-to-end suites

Numbered specs in `apps/web/e2e/` cover sign-in, events, guests and import, RSVP and email, seating, check-in, team, billing, accessibility, the film, catering, installability, MCP, approvals, expiry, archive, the offline run sheet, RSVP questions, the studio, the entry seal, error pages, Connect AI, the seating workspace and the legal pages.

## Accessibility standard

- axe with `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`: zero violations on `/events` at 1440 and 390 px.
- Targets at least 24×24 px (44 px for primary controls).
- An `aria-label` must start with the visible text.
- Visible focus rings; keyboard alternatives for any drag or hover behaviour; colour is never the only signal.
- Everything respects `prefers-reduced-motion`.

## Before you push

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Husky runs lint-staged on commit and the type check and unit tests on push.

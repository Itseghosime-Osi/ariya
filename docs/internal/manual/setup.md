# Local setup

Install, run the database, seed demo data and start the app.

Audience: Developers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Prerequisites

- Node 24 (see `.nvmrc`) and pnpm (version pinned in `package.json`).
- The Supabase CLI and Docker for the local stack.
- Rust (stable) with the `wasm32-unknown-unknown` target only if you change the engines.
- Mailpit for local email (the Supabase stack provides it on port 57324 in the CI setup).

## Steps

```bash
pnpm install
cp .env.example .env.local
supabase start
pnpm db:reset
pnpm dev
```

Fill `.env.local` with the values printed by `supabase start`. See [Environment variables](environment.md).

## Demo data

```bash
pnpm db:seed
```

Creates or reuses the demo host and replaces the event `folake-demola-2026` with 60 guests, 7 banquet tables and 6 vendors. Sign in as `demo@owambe.ng` (password in the README), open `/events`, and the public page is `/e/folake-demola-2026`. Run it only against a disposable local database.

## Everyday commands

| Command             | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `pnpm dev`          | Start the app                                             |
| `pnpm build`        | Production build                                          |
| `pnpm lint`         | ESLint across the source                                  |
| `pnpm typecheck`    | `tsc --noEmit`                                            |
| `pnpm test`         | Vitest unit and integration tests                         |
| `pnpm test:db`      | pgTAP database, RLS and privilege tests                   |
| `pnpm test:e2e`     | Playwright end-to-end suite with axe accessibility checks |
| `pnpm check:bundle` | Fail if Three.js or GSAP appear in app client chunks      |
| `pnpm format:check` | Prettier check                                            |
| `pnpm analyze`      | Bundle analyzer                                           |
| `pnpm db:types`     | Regenerate Supabase TypeScript types                      |

> Note: Install Chromium once with `pnpm exec playwright install --with-deps chromium`. Database and E2E tests create local users and events; never point them at production.

> This is not the Next.js you know: The repository's `AGENTS.md` warns that this Next.js version has breaking changes. Read the matching guide in `node_modules/next/dist/docs/` before writing framework code.

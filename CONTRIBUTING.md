# Contributing

## Branches

- `main` is production. Vercel deploys every push to it.
- Work happens on short-lived branches named by type: `feat/…`, `fix/…`, `chore/…`,
  `docs/…`, `ci/…`.
- Every change reaches `main` through a pull request. CI must pass and the owner must
  approve. Nobody merges their own pull request.
- Delete a branch once it's merged.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), small and each one building
cleanly: `feat(guests): …`, `fix(rsvp): …`, `refactor: …`, `test: …`, `docs: …`,
`build(deps): …`, `ci: …`.

## Setup

Node 22 (see `.nvmrc`), pnpm (the version is pinned in `package.json`), and the Supabase CLI.

```bash
pnpm install
cp .env.example .env.local
supabase start
pnpm db:reset
pnpm dev
```

## Before you push

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Husky runs lint-staged on commit and the type check and unit tests on push. CI runs the
full set on every pull request.

## Database changes

1. Add a migration in `supabase/migrations`; never edit one that has already shipped.
2. Add or update pgTAP tests in `supabase/tests` (`pnpm test:db`).
3. Regenerate the types with `pnpm db:types` and commit them.
4. Every new table gets Row Level Security in the same migration.

## Environment variables

Add each new variable to `.env.example` (name only, no value) and to the Zod schema in
`src/lib/env`. Public ones start with `NEXT_PUBLIC_`; anything else stays on the server.

## Never commit

Secrets or keys, `.env` files, and anything new in `private-media/`. The song in
`private-media/` is a commercial track for a private class demo and must never be served
or deployed.

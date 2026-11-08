# Contributing

Branches, commits, review rules and what never to commit.

Audience: Developers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Branches

- `main` is production; Vercel deploys every push to it.
- Short-lived branches named `feat/…`, `fix/…`, `chore/…`, `docs/…`, `ci/…`.
- Everything reaches `main` through a pull request. CI must pass and the owner must approve. Nobody merges their own pull request.
- Delete a branch once merged.

## Commits

Conventional Commits, small and each building cleanly: `feat(guests): …`, `fix(rsvp): …`, `refactor: …`, `test: …`, `docs: …`, `build(deps): …`, `ci: …`.

## Review checklist

- No hand-written wire types in `apps/web`: import generated types from `@ariya/studio` and `@ariya/design`; never re-declare them.
- Domain types the app owns (`Zone`, `Footprint`, `TableTop`, `FitResult`) are the opposite: TypeScript is the source of truth and the Rust is held to it by a parity corpus.
- A new table has Row Level Security in the same migration.
- A new function is added to the privilege audit.
- A new variable goes in `.env.example` (name only) and the Zod schema in `src/lib/env`. Public ones start with `NEXT_PUBLIC_`.

## Never commit

Secrets, keys or `.env` files. Do not add other copyrighted media to `public/`; the film's song is the one owner-provided exception.

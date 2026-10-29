## What and why

<!-- One or two sentences: what changes, and the reason. Link the issue if there is one. -->

## How to check it

<!-- Steps a reviewer can follow, plus screenshots for anything visual. -->

## Checklist

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass locally
- [ ] Database changes come with a migration in `supabase/migrations` and pgTAP tests in `supabase/tests`
- [ ] Generated types are regenerated (`pnpm db:types`) if the schema changed
- [ ] New environment variables are added to `.env.example` and validated in `src/lib/env`
- [ ] No secrets, keys or private media are committed
- [ ] Loading, empty, error and success states are covered for any new screen

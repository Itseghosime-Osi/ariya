# Security policy

## Reporting a vulnerability

Please don't open a public issue. Report it privately through
[GitHub security advisories](https://github.com/itseghosime/ariya/security/advisories/new),
or email info.itseghosime@gmail.com with "Security" in the subject.

Include what you found, how to reproduce it, and what it could expose. You'll get a reply
within three working days, and a fix or a plan within fourteen.

## Scope

- The Àríyá app (`src/`), its database policies and functions (`supabase/`), and its
  webhooks and scheduled jobs (`src/app/api/`)
- Guest links (`/i/[token]`) and public event pages (`/e/[slug]`)

The static film and marketing pages in `public/site/` hold no data, but issues there are
welcome too.

## How the app protects data

- Row Level Security on every table; members only reach the events they belong to, by role
- Guests never query tables: their links resolve through `security definer` functions that
  return only that guest's invitation, with rate limiting on guest routes
- Paystack webhooks are verified by HMAC-SHA512 signature and are idempotent by reference
- Secrets are read only in server code, through the validated environment in `src/lib/env`;
  the Supabase service-role key never reaches a client module

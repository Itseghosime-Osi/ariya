# Àríyá

Àríyá is a wedding and event planner for Nigerian couples and planners. It replaces guest lists and RSVPs scattered across WhatsApp groups. Every guest gets a personal, unguessable RSVP link. Planners pay per event.

Live deployment: [https://ariya-two.vercel.app](https://ariya-two.vercel.app)

## Architecture

The project consists of:

1. **Marketing Site & Wedding Film (`public/site/`)**: The static marketing pages and "The Yes" 3D scroll-driven wedding film (Three.js), served framework-free via Next.js rewrites at `/`, `/about`, `/product`, `/pricing`, and `/story`.
2. **Àríyá Application (`src/`)**: Built on Next.js 16 (App Router), React 19, TypeScript strict mode, Tailwind CSS v4, shadcn/ui (Radix primitives), and Supabase.
   - **Authenticated Shell**: My Events, Create Event Wizard, Event Overview, Guest Registry, Seating Chart, Invitation Studio, Check-in Desk, Vendors, Team, and Billing.
   - **Guest Routes**: Public celebration landing (`/e/[slug]`) and guest invitation & RSVP (`/i/[token]`).
   - **Background & Webhooks**: Paystack webhooks (`/api/webhooks/paystack`) and Vercel Cron reminder triggers (`/api/cron/reminders`).
   - **Installable app**: `src/app/manifest.ts` and the icons in `public/icons/` let phones add Àríyá to the home screen, where it opens full screen (`display: standalone`) with no browser address bar. A small hint in the app shell (`src/components/layout/install-hint.tsx`) shows iPhone and iPad users the Share steps and offers Android and Chrome touch devices an Install button; laptops are left to their browser's own install button. There is deliberately no service worker, so nothing is cached offline.

> **Note on `public/site/assets/music.mp3`**: "Forever Sweet" by Dotti, a commercial song, is served publicly with the film and the About page by the owner's choice. It is copyrighted and anyone can download it from the live site; replace or remove it if a licence is not in place. Without the file, the film and About page fall back to their live Web Audio API groove.

> [!IMPORTANT]
>
> **Email Confirmation in Local Development vs. Hosted Production**:
> Email confirmation is disabled in `supabase/config.toml` (`enable_confirmations = false`) strictly for local development convenience to allow automated testing and frictionless iteration. In any hosted staging or production Supabase project, email confirmation must remain enabled (`enable_confirmations = true`). The application sign-up flow in `src/features/auth/` gracefully supports both scenarios: immediate session redirection when confirmations are off, and prompting the user to check their email when confirmation is required.

## Local Development

### Prerequisites

- Node.js 22, matching CI (the package engine requires at least 20.9)
- pnpm 12.15.0, pinned by `packageManager` in `package.json`
- Docker running and the Supabase CLI (CI uses 2.122.0)

### Setup

1. Clone the repository, enter it, and install dependencies with the pinned pnpm version:
   ```bash
   git clone https://github.com/Itseghosime-Osi/ariya.git
   cd ariya
   corepack enable
   pnpm install --frozen-lockfile
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
3. Start Supabase locally:
   ```bash
   supabase start
   supabase db reset
   ```
   `supabase db reset` rebuilds the **local** database and applies migrations and the configured SQL seed. There is no `pnpm db:reset` script.
4. Configure `.env.local` before starting the app:
   - Keep `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
   - Use `supabase status` to get the local API URL, anon key, and service-role key, and put them in the corresponding Supabase variables. Keep service-role keys server-only.
   - Configure Paystack **test** keys. Use the real Paystack API for manual test-checkout flows; the billing E2E suite starts its own local mock.
   - For local email, use `EMAIL_TRANSPORT=mailpit` and point `MAILPIT_URL` at a running Mailpit HTTP API. CI uses `http://127.0.0.1:8025`; its setup is in `.github/workflows/ci.yml`. Set a non-empty local `RESEND_API_KEY` placeholder and a valid `RESEND_FROM_EMAIL` even when Mailpit is selected, because both fields are validated.
   - Generate a `RATE_LIMIT_SECRET` of at least 32 characters and a non-empty `CRON_SECRET` locally. Never commit `.env.local` or real credentials.
5. Run the development server:
   ```bash
   pnpm dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) for the film, or [http://localhost:3000/sign-in](http://localhost:3000/sign-in) to sign in to the application.

### Routes

| Area               | Routes                                                                                                                                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Film and marketing | `/`, `/film`, `/about`, `/product`, `/pricing`, `/story`                                                                                                                                                                                                                                                                                          |
| Authentication     | `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/auth/callback`                                                                                                                                                                                                                                                                   |
| Events             | `/events`, `/events/new`, `/events/[eventId]`                                                                                                                                                                                                                                                                                                     |
| Event management   | `/events/[eventId]/guests`, `/events/[eventId]/guests/import`, `/events/[eventId]/seating`, `/events/[eventId]/seating/print`, `/events/[eventId]/invitations`, `/events/[eventId]/page-editor`, `/events/[eventId]/settings`, `/events/[eventId]/check-in`, `/events/[eventId]/vendors`, `/events/[eventId]/team`, `/events/[eventId]/reminders` |
| Billing            | `/events/[eventId]/billing`, `/events/[eventId]/billing/callback`                                                                                                                                                                                                                                                                                 |
| Guest access       | `/e/[slug]`, `/i/[token]`, `/invite/[token]` (team invitation)                                                                                                                                                                                                                                                                                    |
| Server endpoints   | `/api/webhooks/paystack`, `/api/cron/reminders`                                                                                                                                                                                                                                                                                                   |

`/login` and `/signup` redirect to the corresponding authentication pages. Legacy `/planner.html` redirects to `/events`; `/rsvp.html?token=...` and `/rsvp.html?g=...` redirect to `/i/[token]`. Marketing `.html` aliases and `/rsvp/[token]` are configured in `next.config.ts`.

## Quality & Testing Commands

Install Chromium before the first E2E run with `pnpm exec playwright install --with-deps chromium`. Database and E2E tests require the local Supabase stack; E2E email checks also require Mailpit. See `.github/workflows/ci.yml` for the complete isolated CI setup. These tests create local users and events; do not point them at production.

- `pnpm lint`: Run ESLint across all TypeScript source files.
- `pnpm typecheck`: Run TypeScript compiler check without emitting files (`tsc --noEmit`).
- `pnpm test`: Run Vitest unit and integration test suite.
- `pnpm test:db`: Run pgTAP database security, RLS, and privilege audit tests.
- `pnpm test:e2e`: Run complete Playwright end-to-end suite (including Axe WCAG 2.1 AA audits).
- `pnpm check:bundle`: Verify zero Three.js or GSAP presence in App Router client chunks.
- `pnpm db:seed`: Seed a realistic Nigerian wedding celebration with 60 guests, 7 banquet tables, and 6 vendors.
- `pnpm build`: Create an optimized production build.
- `pnpm format:check`: Verify formatting across the repository with Prettier.
- `pnpm analyze`: Inspect client bundle sizes with Next.js bundle analyzer.

## Demo Celebration Workspace

To create sample celebration data in your **local** Supabase project after configuring `.env.local`:

```bash
pnpm db:seed
```

The script uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. It creates or reuses the demo host and replaces the event with slug `folake-demola-2026`. Run it only against a disposable local database. This account is seeded locally; it is not a promised shared production login.

- **Demo Host**: `demo@owambe.ng`
- **Password**: `Celebration2026!`
- **Celebration Desk**: `/events`
- **Public event page**: `/e/folake-demola-2026`

## Deploying

The application is deployed on Vercel (project `ariya`, live at [https://ariya-two.vercel.app](https://ariya-two.vercel.app)).

### Target Infrastructure & Regions

- **Hosting (Vercel)**: London, UK (`lhr1`)
- **Database (Supabase)**: London, UK (`eu-west-2` AWS)

Matching regions minimizes round-trip latency for database operations, authentication, and webhook processing.

### Production Environment Variables

All production environment variables are strictly validated at application startup using Zod schemas (`src/lib/env/server.ts` and `src/lib/env/client.ts`). The application will refuse to boot in production if required variables are missing or invalid (for instance, if `EMAIL_TRANSPORT` is set to `mailpit`).

| Variable                          | Description                             | Required?    | Production Rule / Safe Default                                                                                 |
| :-------------------------------- | :-------------------------------------- | :----------- | :------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`             | Canonical public application URL        | **Required** | `https://ariya-two.vercel.app` (used for personal RSVP links in emails)                                        |
| `NEXT_PUBLIC_SUPABASE_URL`        | Hosted Supabase project URL             | **Required** | `https://<project-ref>.supabase.co`                                                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase public anonymous API key       | **Required** | Hosted project anon key                                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY`       | Supabase service-role admin key         | **Required** | Hosted project service-role key (server-only; used for rate limit enforcement, billing triggers, and webhooks) |
| `PAYSTACK_SECRET_KEY`             | Paystack merchant secret key            | **Required** | Must start with `sk_live_` (or `sk_test_` in test mode)                                                        |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key for client checkout | **Required** | Must start with `pk_live_` (or `pk_test_` in test mode)                                                        |
| `PAYSTACK_API_BASE`               | Paystack API base URL                   | Optional     | Defaults to `https://api.paystack.co` (strictly required to match `https://api.paystack.co` in production)     |
| `EMAIL_TRANSPORT`                 | Email dispatcher transport              | **Required** | Must be strictly `resend` in production (setting `mailpit` causes startup boot failure)                        |
| `RESEND_API_KEY`                  | Resend transactional email API key      | **Required** | Non-placeholder production key (must start with `re_`)                                                         |
| `RESEND_FROM_EMAIL`               | Sender email address for invitations    | **Required** | Set a sender allowed by your Resend account; there is no runtime default                                       |
| `RATE_LIMIT_SECRET`               | HMAC salt for IP anonymization          | **Required** | Minimum 32 characters, no default (`openssl rand -hex 32`)                                                     |
| `CRON_SECRET`                     | Secret bearer token for Vercel Cron     | **Required** | Bearer token authenticating `/api/cron/reminders`                                                              |
| `MAILPIT_URL`                     | Mailpit HTTP API endpoint               | Local only   | Ignored in production (default: `http://127.0.0.1:57324`)                                                      |

### Webhook Setup

Configure your Paystack Dashboard webhook URL to:
`https://ariya-two.vercel.app/api/webhooks/paystack`

Ensure event `charge.success` is selected. The application verifies inbound requests via constant-time HMAC-SHA512.

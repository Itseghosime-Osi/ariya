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

> **Note on `public/site/assets/music.mp3`**: "Yori Yori" by Abefe, a commercial song, is served publicly with the film and the About page by the owner's choice. It is copyrighted and anyone can download it from the live site; replace or remove it if a licence is not in place. Without the file, the film and About page fall back to their live Web Audio API groove.

> [!IMPORTANT]
> **Email Confirmation in Local Development vs. Hosted Production**:
> Email confirmation is disabled in `supabase/config.toml` (`enable_confirmations = false`) strictly for local development convenience to allow automated testing and frictionless iteration. In any hosted staging or production Supabase project, email confirmation must remain enabled (`enable_confirmations = true`). The application sign-up flow in `src/features/auth/` gracefully supports both scenarios: immediate session redirection when confirmations are off, and prompting the user to check their email when confirmation is required.

## Local Development

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- Supabase CLI

### Setup

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
3. Start Supabase locally:
   ```bash
   supabase start
   pnpm db:reset # or supabase db reset
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) to view the site, or [http://localhost:3000/events](http://localhost:3000/events) to enter the application.

## Quality & Testing Commands

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

To test the application with realistic celebration data:

```bash
pnpm db:seed
```

- **Demo Host**: `demo@owambe.ng`
- **Password**: `Celebration2026!`
- **Celebration Desk**: `/events`
- **Public Gazette**: `/e/folake-demola-2026`

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
| `RESEND_FROM_EMAIL`               | Sender email address for invitations    | **Required** | Default: `rsvps@ariya-two.vercel.app` (or your verified domain sender)                                         |
| `RATE_LIMIT_SECRET`               | HMAC salt for IP anonymization          | **Required** | Minimum 32 characters, no default (`openssl rand -hex 32`)                                                     |
| `CRON_SECRET`                     | Secret bearer token for Vercel Cron     | **Required** | Bearer token authenticating `/api/cron/reminders`                                                              |
| `MAILPIT_URL`                     | Mailpit HTTP API endpoint               | Local only   | Ignored in production (default: `http://127.0.0.1:57324`)                                                      |

### Webhook Setup

Configure your Paystack Dashboard webhook URL to:
`https://ariya-two.vercel.app/api/webhooks/paystack`

Ensure event `charge.success` is selected. The application verifies inbound requests via constant-time HMAC-SHA512.

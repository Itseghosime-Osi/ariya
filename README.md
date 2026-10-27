# Àríyá by OwambePlan

Àríyá is a wedding and event planner for Nigerian couples and planners. It replaces guest lists and RSVPs scattered across WhatsApp groups. Every guest gets a personal, unguessable RSVP link. Planners pay per event.

## Architecture

The project consists of:

1. **Marketing Site & Wedding Film (`public/site/`)**: The static marketing pages and "The Yes" 3D scroll-driven wedding film (Three.js), served framework-free via Next.js rewrites at `/`, `/about`, `/product`, `/pricing`, and `/story`.
2. **Àríyá Application (`src/`)**: Built on Next.js 16 (App Router), React 19, TypeScript strict mode, Tailwind CSS v4, shadcn/ui (Radix primitives), and Supabase.
   - **Authenticated Shell**: My Events, Create Event Wizard, Event Overview, Guest Registry, Seating Chart, Invitation Studio, Check-in Desk, Vendors, Team, and Billing.
   - **Guest Routes**: Public celebration landing (`/e/[slug]`) and guest invitation & RSVP (`/i/[token]`).
   - **Background & Webhooks**: Paystack webhooks (`/api/webhooks/paystack`) and Vercel Cron reminder triggers (`/api/cron/reminders`).

> **Note on `private-media/music.mp3`**: The file `private-media/music.mp3` is a commercial song used solely for private offline local class demos. It is kept completely outside `public/` so it is never bundled, served, or deployed publicly. The film automatically falls back to its live Web Audio API owambe groove when the file is absent.

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

## Production Deployment

### Target Regions

- **Vercel**: London, UK (`lhr1`)
- **Supabase**: London, UK (`eu-west-2` AWS)
  Matching regions minimizes network latency for database queries and webhook round-trips.

### Required Environment Variables

| Variable                        | Description                | Production Requirement                             |
| :------------------------------ | :------------------------- | :------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL       | Canonical project HTTPS URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key       | Hosted project anon key                            |
| `SUPABASE_SERVICE_ROLE_KEY`     | Backend admin key          | Required for webhooks & rate limiter               |
| `PAYSTACK_SECRET_KEY`           | Paystack merchant secret   | Must start with `sk_live_` (or `sk_test_` in test) |
| `PAYSTACK_API_BASE`             | Paystack API endpoint      | Must be `https://api.paystack.co`                  |
| `EMAIL_TRANSPORT`               | Dispatcher mode            | Must be `resend` in production                     |
| `RESEND_API_KEY`                | Resend API key             | Valid non-placeholder `re_***` key                 |
| `RATE_LIMIT_SECRET`             | HMAC secret for IP hashing | 32+ character hex key (`openssl rand -hex 32`)     |
| `CRON_SECRET`                   | Vercel Cron bearer token   | Required for `/api/cron/reminders`                 |

### Webhook Setup

Configure your Paystack Dashboard webhook URL to:
`https://your-domain.com/api/webhooks/paystack`
Ensure event `charge.success` is selected. The application verifies inbound requests via constant-time HMAC-SHA512.

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

- `pnpm lint`: Run ESLint on the `src` codebase.
- `pnpm typecheck`: Run TypeScript compiler check without emitting files.
- `pnpm test`: Run Vitest unit and integration tests.
- `pnpm build`: Create an optimized production build with Next.js Turbopack.
- `pnpm test:e2e`: Run Playwright end-to-end test suite.
- `pnpm analyze`: Run Next.js bundle analyzer.

import type { DocPage } from "../types";

export const engineeringPages: DocPage[] = [
  {
    slug: "setup",
    title: "Local setup",
    group: "engineering",
    audience: "Developers",
    summary: "Install, run the database, seed demo data and start the app.",
    blocks: [
      { t: "h2", x: "Prerequisites" },
      {
        t: "ul",
        x: [
          "Node 24 (see `.nvmrc`) and pnpm (version pinned in `package.json`).",
          "The Supabase CLI and Docker for the local stack.",
          "Rust (stable) with the `wasm32-unknown-unknown` target only if you change the engines.",
          "Mailpit for local email (the Supabase stack provides it on port 57324 in the CI setup).",
        ],
      },
      { t: "h2", x: "Steps" },
      {
        t: "code",
        lang: "bash",
        x: "pnpm install\ncp .env.example .env.local\nsupabase start\npnpm db:reset\npnpm dev",
      },
      {
        t: "p",
        x: "Fill `.env.local` with the values printed by `supabase start`. See [Environment variables](/documentation/environment).",
      },
      { t: "h2", x: "Demo data" },
      {
        t: "code",
        lang: "bash",
        x: "pnpm db:seed",
      },
      {
        t: "p",
        x: "Creates or reuses the demo host and replaces the event `folake-demola-2026` with 60 guests, 7 banquet tables and 6 vendors. Sign in as `demo@owambe.ng` (password in the README), open `/events`, and the public page is `/e/folake-demola-2026`. Run it only against a disposable local database.",
      },
      { t: "h2", x: "Everyday commands" },
      {
        t: "table",
        head: ["Command", "What it does"],
        rows: [
          ["`pnpm dev`", "Start the app"],
          ["`pnpm build`", "Production build"],
          ["`pnpm lint`", "ESLint across the source"],
          ["`pnpm typecheck`", "`tsc --noEmit`"],
          ["`pnpm test`", "Vitest unit and integration tests"],
          ["`pnpm test:db`", "pgTAP database, RLS and privilege tests"],
          [
            "`pnpm test:e2e`",
            "Playwright end-to-end suite with axe accessibility checks",
          ],
          [
            "`pnpm check:bundle`",
            "Fail if Three.js or GSAP appear in app client chunks",
          ],
          ["`pnpm format:check`", "Prettier check"],
          ["`pnpm analyze`", "Bundle analyzer"],
          ["`pnpm db:types`", "Regenerate Supabase TypeScript types"],
        ],
      },
      {
        t: "note",
        tone: "warn",
        x: "Install Chromium once with `pnpm exec playwright install --with-deps chromium`. Database and E2E tests create local users and events; never point them at production.",
      },
      {
        t: "note",
        tone: "info",
        title: "This is not the Next.js you know",
        x: "The repository's `AGENTS.md` warns that this Next.js version has breaking changes. Read the matching guide in `node_modules/next/dist/docs/` before writing framework code.",
      },
    ],
  },
  {
    slug: "deployment",
    title: "Deploying",
    group: "engineering",
    audience: "Developers and operators",
    summary:
      "Vercel, Supabase, DNS, cron jobs and the one-time dashboard steps.",
    blocks: [
      { t: "h2", x: "Where things run" },
      {
        t: "table",
        head: ["Part", "Service", "Region"],
        rows: [
          [
            "App",
            "Vercel (project `ariya`, live at https://ariya-two.vercel.app)",
            "London `lhr1`",
          ],
          ["Database, auth, storage", "Supabase", "London (`eu-west-2`)"],
          ["Email", "Resend (sender domain `ariyaday.com`)", ""],
          ["Payments", "Paystack", ""],
        ],
      },
      {
        t: "p",
        x: "Matching regions keeps database, sign-in and webhook round trips short.",
      },
      { t: "h2", x: "Release flow" },
      {
        t: "ol",
        x: [
          "Work on a short-lived branch, open a pull request.",
          "CI must pass (see [Quality and testing](/documentation/testing)) and the owner approves.",
          "Merging to `main` deploys production on Vercel.",
          "Database migrations are applied to the hosted project deliberately (never edit one that has shipped).",
        ],
      },
      { t: "h2", x: "Scheduled jobs" },
      {
        t: "table",
        head: ["Job", "Where", "When"],
        rows: [
          [
            "`/api/cron/reminders`",
            "Vercel Cron (`vercel.json`)",
            "Daily at 09:00",
          ],
          [
            "`/api/cron/digest`",
            "GitHub Actions (`cron-digest.yml`)",
            "Weekly",
          ],
        ],
      },
      {
        t: "p",
        x: "Both authenticate with `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` in Vercel and as a GitHub repository secret.",
      },
      { t: "h2", x: "One-time dashboard steps" },
      {
        t: "ul",
        x: [
          "**Supabase Auth**: Site URL and redirect URLs for your domain; Google provider with client ID and secret; the OAuth Server settings in [AI connections](/documentation/mcp).",
          "**Google Cloud**: OAuth client with the Supabase callback URL; consent screen with `https://ariyaday.com/privacy` and `/terms`; publish the app so any user can sign in.",
          "**Vercel**: all variables in [Environment variables](/documentation/environment), including `NEXT_PUBLIC_GOOGLE_SIGN_IN=true` once Google is enabled.",
          "**Resend**: verify the domain and add the API key.",
          "**Paystack**: webhook URL `https://<your-domain>/api/webhooks/paystack`, event `charge.success`.",
          "**Mailbox**: create `help@ariyaday.com`, the contact on the legal pages.",
        ],
      },
      {
        t: "note",
        tone: "info",
        x: "The app refuses to boot in production if a required variable is missing or invalid, for example `EMAIL_TRANSPORT=mailpit`. The check is `src/lib/env/server.ts` and `client.ts`.",
      },
    ],
  },
  {
    slug: "architecture",
    title: "Architecture",
    group: "engineering",
    audience: "Developers",
    summary:
      "Repository layout, route groups, request flow and the rules that keep it tidy.",
    blocks: [
      { t: "h2", x: "Two domains in one repository" },
      {
        t: "ol",
        x: [
          "**Marketing site and film** (`public/site/`): framework-free, served through Next.js rewrites at `/`, `/about`, `/product`, `/pricing`, `/story` and `/film`. Its assets live under `public/site/assets/`.",
          "**Application** (`src/`): Next.js 16 App Router, React 19, strict TypeScript and Tailwind v4, organised by feature under `src/features/` with its own actions, queries, schemas and components.",
        ],
      },
      {
        t: "note",
        tone: "warn",
        title: "The /assets rule",
        x: "`/assets/*` is reserved for the legacy site rewrite. Code under `src/` must never serve from or link to `/assets/`, and `three` or `gsap` must never be imported into `src/`. CI enforces the second with `pnpm check:bundle`.",
      },
      { t: "h2", x: "Route groups" },
      {
        t: "table",
        head: ["Group", "Contains"],
        rows: [
          [
            "`(shell)/(app)`",
            "Signed-in app: events, approvals, connect-ai, profile, settings",
          ],
          [
            "`(shell)/(auth)`",
            "Sign-in, sign-up, forgot and reset password, OAuth callback",
          ],
          ["`(shell)/(guest)`", "Guest pages `/e/[slug]` and `/i/[token]`"],
          ["`(shell)/(legal)`", "`/privacy` and `/terms`"],
          ["`(shell)/(docs)`", "This manual at `/documentation`"],
          ["`(shell)/(print)`", "Print layouts such as the seating chart"],
          ["`(marketing)`", "Product, pricing, about, story and film"],
        ],
      },
      {
        t: "p",
        x: "Full-screen workspaces (seating, the invitation designer) hide the app chrome through `isWorkspaceRoute` in `components/layout/nav-items.ts`.",
      },
      { t: "h2", x: "Request flow" },
      {
        t: "ol",
        x: [
          "`proxy.ts` lets public pages and static files through, refreshes the Supabase session for everything else, and redirects signed-out visitors.",
          "Server components read through the caller's Supabase client, so Row Level Security applies.",
          "Mutations are Server Actions that validate with Zod, check the caller's role, then write.",
          "Privileged work (rate limits, billing, webhooks, digests) uses the service-role client in trusted server code only.",
        ],
      },
      { t: "h2", x: "Technology" },
      {
        t: "table",
        head: ["Layer", "Choice"],
        rows: [
          [
            "Framework",
            "Next.js 16 (App Router, Turbopack), React 19, TypeScript strict",
          ],
          [
            "Styling",
            "Tailwind CSS v4 with CSS-variable tokens, Radix primitives",
          ],
          [
            "Data and auth",
            "Supabase Postgres, Auth, Storage with RLS on every table",
          ],
          ["Forms", "React Hook Form with Zod"],
          ["Tables and drag", "TanStack Table, dnd-kit"],
          ["Email", "Resend with React Email templates"],
          ["Payments", "Paystack"],
          ["Engines", "Rust to WebAssembly (studio and design)"],
        ],
      },
      { t: "h2", x: "Legacy URLs" },
      {
        t: "table",
        head: ["Request", "Behaviour"],
        rows: [
          [
            "`/`, `/about`, `/product`, `/pricing`, `/story`, `/film`",
            "Rewrite to the matching `/site/*.html`",
          ],
          [
            "`/about.html` and the other `.html` forms",
            "Rewrite (and canonical redirects for SEO)",
          ],
          ["`/assets/:path*`", "Rewrite to `/site/assets/:path*`"],
          ["`/planner.html`", "307 redirect to `/events`"],
          ["`/rsvp.html?token=…` or `?g=…`", "Redirect to `/i/[token]`"],
          ["`/login`, `/signup`", "Redirect to `/sign-in`, `/sign-up`"],
        ],
      },
      { t: "h2", x: "Performance budgets" },
      {
        t: "p",
        x: "Framework baseline: 489.7 KB uncompressed (147.7 KB gzipped). Guest routes must add no more than 20 KB gzipped of page-specific code.",
      },
      {
        t: "table",
        head: ["Route", "First-load gzip", "Page delta"],
        rows: [
          ["`/i/[token]`", "159.8 KB", "+12.0 KB"],
          ["`/e/[slug]`", "148.9 KB", "+1.2 KB"],
          ["`/events`", "177.8 KB", "+30.1 KB"],
          ["`/events/[id]/guests`", "245.7 KB", "+98.0 KB"],
        ],
      },
      {
        t: "p",
        x: "Heavy libraries (tables, QR scanners, charts, the designer) are loaded only on signed-in routes.",
      },
      { t: "h2", x: "Global search" },
      {
        t: "p",
        x: "`⌘K` calls the `global_search` function, scoped to the caller's celebrations, with escaped wildcards and a 250 ms debounce that cancels stale requests.",
      },
    ],
  },
  {
    slug: "data-model",
    title: "Data model",
    group: "engineering",
    audience: "Developers",
    summary: "The tables, what they hold and the important database functions.",
    blocks: [
      { t: "h2", x: "Tables" },
      {
        t: "table",
        head: ["Table", "Holds"],
        rows: [
          ["`profiles`", "A person's name and photo, linked to the auth user"],
          [
            "`events`",
            "A celebration, including `hall_layout` (≤ 64 KB JSON) and `invitation_design` (JSON)",
          ],
          ["`event_members`", "Who has which role in an event"],
          ["`event_invites`", "Team invitation tokens (7-day expiry)"],
          [
            "`guests`",
            "Guest parties, party size, `check_in_code`, invited state, token",
          ],
          [
            "`rsvps`, `rsvp_answers`",
            "A guest's reply and answers to the host's questions",
          ],
          [
            "`tables`, `seat_assignments`",
            "Banquet tables (positions in cm) and who sits where",
          ],
          ["`check_ins`", "Door admissions with time"],
          ["`vendors`, `vendor_tasks`", "Vendor roster and dated tasks"],
          [
            "`tasks`",
            "The generated checklist (unique `(event_id, source_key)`, tombstone deletes)",
          ],
          ["`invoices`, `payments`", "Celebration Pass billing"],
          ["`email_log`", "Every email attempt and its outcome"],
          ["`digest_log`", "One weekly digest per person per week"],
          [
            "`notification_preferences`, `push_subscriptions`",
            "Notification settings and devices",
          ],
          ["`rate_limits`", "Counters behind the rate limiter"],
          [
            "`ai_proposals`, `ai_activity_log`, `ai_connection_settings`, `ai_quota_usage`",
            "The AI connection layer",
          ],
        ],
      },
      { t: "h2", x: "Functions worth knowing" },
      {
        t: "table",
        head: ["Function", "Purpose"],
        rows: [
          [
            "`is_event_member`, `has_event_role`",
            "Security-definer helpers used by RLS policies",
          ],
          [
            "`hit_rate_limit`",
            "Atomic counter, service role only, prunes old rows",
          ],
          ["`record_successful_payment`", "Idempotent payment finalisation"],
          ["`global_search`", "Events, guests and vendors the caller may see"],
          [
            "`search_check_in_guests`",
            "Name search at the desk for staff and up",
          ],
          [
            "`get_invitation`, `get_check_in_code`, `submit_rsvp`",
            "Guest-facing, token-limited (40 and 10 per minute per token)",
          ],
          ["`create_event`", "App-token-limited creation"],
        ],
      },
      { t: "h2", x: "Triggers" },
      {
        t: "ul",
        x: [
          "`tr_event_member_security`: no self-role changes, last owner protected.",
          "`tr_event_protection`: users cannot mark an event paid.",
          "`tr_guests_app_token_quota` and `tr_ai_proposals_quota`: daily ceilings for app tokens.",
        ],
      },
      { t: "h2", x: "Changing the schema" },
      {
        t: "ol",
        x: [
          "Add a new migration in `supabase/migrations`. Never edit one that has shipped.",
          "Add or update pgTAP tests in `supabase/tests` (`pnpm test:db`). If you add a function, update the privilege audit allow-list.",
          "Run `pnpm db:types` and commit the regenerated types.",
          "Enable Row Level Security on every new table in the same migration.",
        ],
      },
    ],
  },
  {
    slug: "design-engine",
    title: "Rust engines",
    group: "engineering",
    audience: "Developers",
    summary:
      "How the invitation design engine and the studio engine are built, shipped and kept honest.",
    blocks: [
      { t: "h2", x: "Why Rust" },
      {
        t: "p",
        x: "The arithmetic must be identical in a browser, an AI call and a test, and heavy maths should not weigh down the page. Both engines are small Rust crates compiled to WebAssembly and loaded lazily.",
      },
      {
        t: "table",
        head: ["Engine", "Crates", "Browser package", "Artifact"],
        rows: [
          [
            "Studio (hall, thermal, catering, risk, checklist)",
            "`crates/studio-core`, `studio-wasm`, `render-core`",
            "`@ariya/studio`",
            "`public/wasm/ariya_studio.wasm`",
          ],
          [
            "Design (invitation editing)",
            "`crates/design-core`, `design-wasm`",
            "`@ariya/design`",
            "`public/wasm/ariya_design.wasm`",
          ],
        ],
      },
      { t: "h2", x: "The pattern" },
      {
        t: "ol",
        x: [
          "A pure core crate owns the model and operations (serde with camelCase fields; enum variant fields need `rename_all_fields`).",
          "A thin wasm crate exposes a C-ABI: `ariya_design_alloc`, `ariya_design_free` and `ariya_design_call`. JSON goes in, JSON comes out.",
          "Failures are returned as data (`{ ok: false, code, message }`), never a panic across the boundary.",
          "Types are generated from Rust with `ts-rs` into `packages/*/src/generated` (excluded from Prettier).",
          "A TypeScript package wraps the wasm and falls back to a TypeScript implementation if loading fails, so a failed load never blanks the page.",
          "The compiled `.wasm` is committed and built deterministically with `--remap-path-prefix` by `apps/web/scripts/build-wasm.mjs`.",
        ],
      },
      { t: "h2", x: "Design engine operations" },
      {
        t: "p",
        x: "Add shape, add layer of a kind, add image, duplicate, stacking order, align and distribute, import a card, remove the card, ensure the entry seal, fast resize (minimum width 5%, height 1%) and rotation snapping.",
      },
      { t: "h2", x: "Keeping it honest" },
      {
        t: "ul",
        x: [
          "Rust unit and integration tests, including a fixture design (`tests/fixtures/house.json`).",
          "A TypeScript/Rust **parity test** (`engine.parity.test.ts`) runs the same operations on both and compares normalised results.",
          "CI checks that the committed wasm equals a fresh build, and that regenerated types equal the committed ones.",
          "The studio's parity corpus has 693 cases for geometry.",
        ],
      },
      { t: "h2", x: "Rebuilding" },
      {
        t: "code",
        lang: "bash",
        x: "cd apps/web && node scripts/build-wasm.mjs   # builds both targets\ncargo test --workspace                       # Rust tests",
      },
      {
        t: "p",
        x: "Next phases (not started): a picture pipeline, effects, and print-ready export. See [Roadmap](/documentation/roadmap).",
      },
    ],
  },
  {
    slug: "testing",
    title: "Quality and testing",
    group: "engineering",
    audience: "Developers",
    summary:
      "What CI runs, the test layers and the accessibility and bundle guards.",
    blocks: [
      { t: "h2", x: "Layers" },
      {
        t: "table",
        head: ["Layer", "Tool", "Covers"],
        rows: [
          [
            "Unit and integration",
            "Vitest",
            "Pure logic, schemas, actions, route handlers, parity tests",
          ],
          [
            "Database",
            "pgTAP (`pnpm test:db`)",
            "RLS, privileges, triggers, functions",
          ],
          [
            "End to end",
            "Playwright",
            "Real flows in Chromium, with axe accessibility scans",
          ],
          ["Rust", "`cargo test`, fmt, clippy", "Both engines"],
          [
            "Bundle guard",
            "`pnpm check:bundle`",
            "No Three.js or GSAP in app chunks",
          ],
        ],
      },
      { t: "h2", x: "CI jobs" },
      {
        t: "ul",
        x: [
          "Lint, types, unit tests and build",
          "Database pgTAP tests",
          "Playwright E2E tests",
          "App bundle check (no Three.js or GSAP)",
          "Rust core (fmt, clippy, tests, wasm matches a fresh build, generated types match)",
        ],
      },
      { t: "h2", x: "End-to-end suites" },
      {
        t: "p",
        x: "Numbered specs in `apps/web/e2e/` cover sign-in, events, guests and import, RSVP and email, seating, check-in, team, billing, accessibility, the film, catering, installability, MCP, approvals, expiry, archive, the offline run sheet, RSVP questions, the studio, the entry seal, error pages, Connect AI, the seating workspace and the legal pages.",
      },
      { t: "h2", x: "Accessibility standard" },
      {
        t: "ul",
        x: [
          "axe with `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`: zero violations on `/events` at 1440 and 390 px.",
          "Targets at least 24×24 px (44 px for primary controls).",
          "An `aria-label` must start with the visible text.",
          "Visible focus rings; keyboard alternatives for any drag or hover behaviour; colour is never the only signal.",
          "Everything respects `prefers-reduced-motion`.",
        ],
      },
      { t: "h2", x: "Before you push" },
      {
        t: "code",
        lang: "bash",
        x: "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build",
      },
      {
        t: "p",
        x: "Husky runs lint-staged on commit and the type check and unit tests on push.",
      },
    ],
  },
  {
    slug: "conventions",
    title: "Contributing",
    group: "engineering",
    audience: "Developers",
    summary: "Branches, commits, review rules and what never to commit.",
    blocks: [
      { t: "h2", x: "Branches" },
      {
        t: "ul",
        x: [
          "`main` is production; Vercel deploys every push to it.",
          "Short-lived branches named `feat/…`, `fix/…`, `chore/…`, `docs/…`, `ci/…`.",
          "Everything reaches `main` through a pull request. CI must pass and the owner must approve. Nobody merges their own pull request.",
          "Delete a branch once merged.",
        ],
      },
      { t: "h2", x: "Commits" },
      {
        t: "p",
        x: "Conventional Commits, small and each building cleanly: `feat(guests): …`, `fix(rsvp): …`, `refactor: …`, `test: …`, `docs: …`, `build(deps): …`, `ci: …`.",
      },
      { t: "h2", x: "Review checklist" },
      {
        t: "ul",
        x: [
          "No hand-written wire types in `apps/web`: import generated types from `@ariya/studio` and `@ariya/design`; never re-declare them.",
          "Domain types the app owns (`Zone`, `Footprint`, `TableTop`, `FitResult`) are the opposite: TypeScript is the source of truth and the Rust is held to it by a parity corpus.",
          "A new table has Row Level Security in the same migration.",
          "A new function is added to the privilege audit.",
          "A new variable goes in `.env.example` (name only) and the Zod schema in `src/lib/env`. Public ones start with `NEXT_PUBLIC_`.",
        ],
      },
      { t: "h2", x: "Never commit" },
      {
        t: "p",
        x: "Secrets, keys or `.env` files. Do not add other copyrighted media to `public/`; the film's song is the one owner-provided exception.",
      },
    ],
  },
  {
    slug: "design-system",
    title: "Design system",
    group: "engineering",
    audience: "Designers and developers",
    summary:
      "Colour, type, surfaces, motifs, motion and the accessibility checklist.",
    blocks: [
      { t: "h2", x: "Principles" },
      {
        t: "ol",
        x: [
          "**Joyful, not administrative.** Warm and festive beats neutral SaaS.",
          "**One memorable thing per section.** Replace several small widgets with one considered visual.",
          "**Interactive by default.** Things tilt, dim, filter, reorder, tick off and celebrate.",
          "**Calm banners.** A seal, names, one detail line, a few actions and one big number.",
          "**Everyone can use it.** Reduced motion, keyboard access and WCAG 2.2 AA are requirements.",
        ],
      },
      { t: "h2", x: "Colour" },
      {
        t: "table",
        head: ["Role", "Value"],
        rows: [
          ["Page", "`#faf6ee` background, `#f7f2ea` ivory"],
          ["Text", "Night `#1c0f14`, secondary `#5a474e`"],
          ["Primary", "Burgundy `#6b1e2e`, wine `#4a111d`"],
          ["Dark stage", "`#1c070d` with burgundy and gold aurora"],
          [
            "Accent",
            "Gold `#b8864b`, champagne `#e9c98a`, gold ink `#7a5612` for text on light",
          ],
          [
            "Status",
            "Accepted `#1f6b4a`, declined `#9e2a2b`, awaiting `#b88728`",
          ],
          [
            "Rings",
            "Replies `#c1283d`, seating `#2e6a4f`, vendors `#8a6620`, deposits `#b4531f`, tasks `#3b5b8a`",
          ],
        ],
      },
      {
        t: "p",
        x: "Tokens live in `src/styles/globals.css`. Colour never carries meaning alone.",
      },
      { t: "h2", x: "Type" },
      {
        t: "p",
        x: "Display: Bodoni Moda. Body: Plus Jakarta Sans. Eyebrow labels are 11 px, semibold, uppercase, widely tracked, in gold ink. Changing numbers use tabular figures.",
      },
      { t: "h2", x: "Surfaces and motifs" },
      {
        t: "ul",
        x: [
          "**Bento card** (24 px radius), **velvet stage** for heroes, **stationery** for anything that stands for a real invitation, **glass** for floating bars.",
          "**Wax seal** with the couple's initials, **weave** stripe (aso ebi), **foil sheen**, **gold dust**, **date stamp**.",
        ],
      },
      { t: "h2", x: "Charts" },
      {
        t: "p",
        x: "Avoid default charts: use readiness rings, the guest constellation, the reply waffle, the budget weave and mini rings, always with numbers as text.",
      },
      { t: "h2", x: "Motion" },
      {
        t: "p",
        x: "Ease `cubic-bezier(0.22, 1, 0.36, 1)`, mostly 150–300 ms. Never animate money. Respect reduced motion everywhere.",
      },
      { t: "h2", x: "Voice" },
      {
        t: "p",
        x: "Warm, short, Nigerian-aware. Say what to do next ('Seat 44 confirmed guests'), not what the system did. Use ₦.",
      },
      {
        t: "p",
        x: "The full guide is `DESIGN.md`; the agent skill is `.codex/skills/ariya-celebration-ui/SKILL.md`.",
      },
    ],
  },
  {
    slug: "decisions",
    title: "Decisions and history",
    group: "engineering",
    audience: "Developers and reviewers",
    summary:
      "The six architecture decisions, the quality remediation and the audit, in brief.",
    blocks: [
      { t: "h2", x: "Architecture decision records" },
      {
        t: "table",
        head: ["ADR", "Decision"],
        rows: [
          [
            "0001 Stack",
            "Next.js 16 + React 19, Supabase (Postgres, Auth, RLS), Tailwind v4 + Radix, TanStack Table + dnd-kit, Paystack",
          ],
          [
            "0002 Film isolation",
            "Marketing and film live in `public/site/`, served by rewrites; `/assets/` is reserved; no WebGL in `src/`",
          ],
          [
            "0003 RLS and privileges",
            "RLS on every table; security-definer helpers with fixed search_path; role boundaries for owner, planner, couple, staff",
          ],
          [
            "0004 Payments",
            "Server-only initialisation with a generated reference; one idempotent `confirmPayment` used by the callback page and the webhook",
          ],
          [
            "0005 Rust studio core",
            "One Rust engine behind one JSON entry point; errors as data; wire format snapshotted; types generated; loader with TypeScript fallback",
          ],
          [
            "0006 Tasks table",
            "Unique `(event_id, source_key)`; tombstone deletes; frozen advice origin; RLS by role; session-client reads",
          ],
        ],
      },
      {
        t: "p",
        x: "The design engine (invitations) follows the same pattern as ADR 0005; it has no separate ADR yet.",
      },
      { t: "h2", x: "Quality remediation" },
      {
        t: "p",
        x: "Implemented without changing the design: correct prices and status wording, privacy headers on personal links (noindex, no-referrer, no-store), dependency upgrades, mobile accessibility labels, per-token rate limits inside the guest RPCs (40 per minute for reading an invitation, 10 for RSVP), canonical URLs and structured data, search debouncing and cancellation, real image-byte validation for cover uploads (up to 40 megapixels) and response-hardening headers.",
      },
      { t: "h2", x: "Security audit, 5 November 2026" },
      {
        t: "p",
        x: "Score 65/100, 17 findings (4 high, 11 medium, 2 low). The high findings are in [Security model](/documentation/security). Others include stored HTML in email, non-atomic send bookkeeping, a CSP that does not yet restrict scripts, uploads above 1 MB failing, team-invite redirect loss after sign-in, and silent CSV truncation beyond 500 rows. Baseline at audit: 539 unit tests, 332 database assertions and 51 Playwright tests passing.",
      },
      { t: "h2", x: "Venue studio research and plan" },
      {
        t: "p",
        x: "`docs/research/2026-11-05-venue-studio.md` (venue typologies, auto-layout, thermal, risk, catering, the checklist page, Rust architecture and data model) and `docs/plans/2026-11-05-venue-studio-build-checklist.md` (phases 0–7: foundations, venue model, auto-layout, thermal, catering, risk, checklist, polish) are the sources behind the studio.",
      },
    ],
  },
];

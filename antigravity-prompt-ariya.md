# Build brief: Àríyá app (dashboard, guest RSVP and supporting pages)

You are working in the GitHub repo `itseghosime/owambeplan`. Read this whole brief before writing code. Work on a new branch, push after each phase, and open a pull request into `main`. **Do not merge.** A reviewer will check and merge.

---

## 1. Context

**Àríyá** (by OwambePlan) is a wedding and event planner for Nigerian couples and planners. It replaces guest lists and RSVPs scattered across WhatsApp groups. Every guest gets a personal, unguessable RSVP link. Planners pay per event.

The repo today is a **static site** (no build step):

| File                                                                                                                 | What it is                                                                             | What happens to it                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html` (~310 KB) + `assets/scroll.js`, `assets/nav.*`, `assets/score.js`, `assets/*.exr`, `assets/poster*.jpg` | "The Yes", a scroll-driven three.js wedding film (home page)                           | **Keep, framework-free.** Move as-is (see §4)                                                                                                                                                                  |
| `about.html`, `product.html`, `pricing.html`, `story.html`, `film.html`                                              | Marketing pages                                                                        | **Keep as static pages**                                                                                                                                                                                       |
| `assets/ariya.css`, `assets/fine-card.js`, `assets/icon.svg`, `assets/og.jpg`                                        | Shared marketing styles, invitation and seal drawings, icons                           | **Keep** with the marketing pages                                                                                                                                                                              |
| `planner.html` + `assets/demo.js`                                                                                    | Demo planner on sample data in `sessionStorage` (guests, CSV import, seating, vendors) | **Replace** with the real app. Use `demo.js` as a reference for entity shapes and operations (`respond`, `assign`, `unassign`, `previewImport`, `commitImport`, `counts`, `seatsUsed`), then delete both files |
| `rsvp.html`                                                                                                          | Demo guest RSVP page                                                                   | **Replace** with the real guest route, then delete                                                                                                                                                             |
| `assets/music.mp3`                                                                                                   | A commercial song used for a private class demo                                        | Keep, but **never** bundle it into the app or deploy it publicly. Add a note in the README                                                                                                                     |

## 2. Source of truth for the UI

Use your Stitch MCP connection to read the project **"Àríyá Wedding Planner Suite"**.

- **Read only.** Do not create, edit, regenerate or trigger anything in Stitch.
- Stitch exports Tailwind via the CDN with an inline `tailwind.config`. **Do not copy that markup into the app.** Extract the design tokens once, then rebuild each screen from typed, reusable components. Treat the exported HTML as a visual spec only.
- Where screens overlap, **FINAL 01–06 and MOBILE 01–08 take precedence** over the V2 screens. The V2 screens and SUPPORT 01 cover everything the FINAL set doesn't.
- The screens titled "State Library", "State Sheet", "Action Library" and "System States" (V2 19, 21, 22, 23, 24) are **not pages**. They define component states (loading, empty, error, success, confirmation, destructive dialogs, toasts). Implement each state on the screen it belongs to.
- V2 24 contains an **architecture map** and a **global search** pattern. Use the map to check your route list against §5.

Screen inventory, as seen on the Stitch canvas:

- **FINAL 01** Event Overview
- **FINAL 02** My Events
- **FINAL 03** Guest Registry
- **FINAL 04** Seating Plan
- **FINAL 05** Invitation Studio
- **FINAL 06** Guest Invitation & RSVP
- **V2 10** Sign In
- **V2 11** Create Account
- **V2 12** Account Recovery & Email Verification flow
- **V2 13** Create/Edit Event, a 3-step wizard: details, registry setup, review and launch
- **V2 14** Event Page Editor, with a live guest-facing preview
- **V2 15** Invitations & Reminders Centre
- **V2 16** RSVP Emails & Concierge Dispatch: confirmation, decline, revision and reminder emails, plus a 390px mobile email view
- **V2 17** Team & Roles
- **V2 18** Per-event Checkout (Event Licensing & Handoff)
- **V2 19** Payment Lifecycle & Invoicing states
- **V2 20** Check-in Desk (QR scan, manual pass code, partial party, conflict states)
- **V2 21** Guest RSVP state library
- **V2 22** Guest Forms & CSV Ingestion states
- **V2 23** Vendor & Seating action library
- **V2 24** System States, feedback components & coverage map
- **SUPPORT 01** Vendor Coordination & Tasks
- **MOBILE 01–08**: phone layouts for the flows above
- **Two reference images** ("Studio product…", "Architecture…"): art direction only

Visual language, from the Stitch code:

- **Palette:** deep wine/burgundy primary (`#6e1426`), champagne gold (`#e9c98a`), warm ivory and paper backgrounds (`#f4efe6`, `#f3ebdc`), near-black night (`#1c070d`), success green (`#2e6a4f`)
- **Type:** Bodoni Moda for display, Plus Jakarta Sans for UI, Material Symbols icons
- **Layout:** dark burgundy sidebar app shell, with left nav: Overview, Guests, Invitations, Seating, Vendors, Team, Billing, Settings

Pull the exact token values from Stitch, not from this summary.

## 3. Stack (decided; don't substitute)

- **Next.js 16** (App Router, `src/` directory), **React 19**, **TypeScript** in `strict` mode, **pnpm**
- **Tailwind CSS v4**, with design tokens defined once as CSS variables and mapped into the Tailwind theme
- **shadcn/ui** (Radix primitives) as the component base, restyled to the Àríyá tokens. Icons: **one** library only. Use Material Symbols to match Stitch, or lucide-react if you map every icon; don't mix
- **Fonts:** `next/font/google` for Bodoni Moda and Plus Jakarta Sans. No runtime font CSS links
- **Supabase:**
  - Postgres, Auth and Storage
  - `@supabase/ssr` for cookies and sessions
  - **Row Level Security on every table**
  - SQL migrations in `supabase/migrations`
  - seed data in `supabase/seed.sql`
- **Data and forms:** Zod for validation (shared by client and server), React Hook Form for forms, TanStack Table for the guest registry
- **Seating drag and drop:** dnd-kit, touch-friendly
- **CSV:** Papa Parse in the browser for preview, with the same validation repeated on the server
- **Email:** Resend + React Email. Templates live in `src/emails`, matching V2 16
- **Payments:** Paystack in **test mode only**, with:
  - checkout initialisation from a Server Action
  - a webhook at `src/app/api/webhooks/paystack/route.ts` that verifies the `x-paystack-signature` HMAC-SHA512 with the secret key, is idempotent by reference, and is the **only** thing that marks an event as paid
- **Scheduling:** reminders run on Vercel Cron, calling a protected route handler
- **Tests:** Vitest + Testing Library for units, Playwright for end-to-end
- **Code quality:** ESLint (Next config + `@typescript-eslint`), Prettier, Husky + lint-staged
- **Hosting assumption:**
  - Vercel functions pinned to `lhr1` (London)
  - Supabase in `eu-west-2` (London), so requests from Lagos don't cross the Atlantic
  - Put the region in `vercel.json`

## 4. Repository layout

Restructure with `git mv` so history is preserved.

```
.
├─ public/
│  └─ site/                  # existing static marketing site, moved untouched
│     ├─ index.html          # the film
│     ├─ about.html  product.html  pricing.html  story.html
│     └─ assets/             # existing assets (except files no longer used)
├─ src/
│  ├─ app/
│  │  ├─ (auth)/             # sign-in, sign-up, forgot-password, reset-password, verify-email
│  │  ├─ (app)/              # authenticated shell (sidebar layout)
│  │  │  ├─ events/                      # My Events
│  │  │  ├─ events/new/                  # Create Event wizard
│  │  │  └─ events/[eventId]/
│  │  │     ├─ page.tsx                  # Event Overview
│  │  │     ├─ guests/  guests/import/
│  │  │     ├─ invitations/              # Invitation Studio + Reminders Centre
│  │  │     ├─ page-editor/              # Event Page Editor
│  │  │     ├─ seating/
│  │  │     ├─ vendors/
│  │  │     ├─ check-in/
│  │  │     ├─ team/
│  │  │     ├─ billing/                  # checkout, invoices, payment states
│  │  │     └─ settings/
│  │  ├─ (guest)/
│  │  │  ├─ e/[slug]/                    # public event page
│  │  │  └─ i/[token]/                   # personal invitation + RSVP
│  │  ├─ api/webhooks/paystack/route.ts
│  │  ├─ api/cron/reminders/route.ts
│  │  ├─ not-found.tsx  error.tsx  global-error.tsx
│  │  └─ layout.tsx
│  ├─ components/
│  │  ├─ ui/                 # restyled primitives (button, input, dialog, sheet, table, badge, toast…)
│  │  └─ layout/             # app shell, sidebar, top bar, page header, empty state, global search
│  ├─ features/              # one folder per domain
│  │  ├─ auth/  events/  guests/  invitations/  rsvp/  seating/
│  │  ├─ vendors/  check-in/  team/  billing/  notifications/
│  │  │   └─ each with: components/  actions.ts  queries.ts  schemas.ts  types.ts  *.test.ts
│  ├─ lib/
│  │  ├─ supabase/  (server.ts, client.ts, middleware.ts, database.types.ts generated)
│  │  ├─ paystack/  email/  env.ts (Zod-validated env)  format.ts (NGN, Africa/Lagos dates)  tokens.ts
│  ├─ emails/                # React Email templates
│  └─ styles/                # globals.css with tokens
├─ supabase/
│  ├─ migrations/  seed.sql  config.toml
├─ tests/e2e/
├─ docs/
│  ├─ architecture.md        # routes, data model, auth model, decisions
│  └─ adr/                   # short decision records (stack, film isolation, RLS model)
├─ .env.example              # every variable, no values
└─ README.md                 # setup, scripts, env, deploy, what's sample vs real
```

**Serving the existing site.** In `next.config.ts`, add rewrites so `/` → `/site/index.html`, plus `/about`, `/product`, `/pricing` and `/story`, each to its `.html` file. Fix relative asset paths inside the moved files only as far as needed for them to load. Don't refactor the film. The film and three.js must **never** be imported by anything under `src/`. Verify with `@next/bundle-analyzer`.

## 5. Data model (Postgres)

Translate `demo.js` and the screens into normalised tables with UUID keys, `created_at` and `updated_at`:

- **`profiles`**: one per auth user
- **`events`**: title, couple names, date and time (`timestamptz`, displayed in `Africa/Lagos`), venue, dress code / aso-ebi, slug, status (`draft | active | archived`), `paid_at`
- **`event_members`**: (`event_id`, `user_id`, `role`), where `role` is `owner | planner | couple | staff`
- **`guests`**:
  - basic fields: name, phone, email, side, group, VIP flag, notes
  - party: `party_size`, `plus_ones_allowed`
  - invitation: `rsvp_token` (unique, at least 128 bits of randomness, base62), `invited_at`
- **`rsvps`**: one per guest; status (`pending | accepted | declined`), attending count, plus-one name, dietary / meal, note, `responded_at`, `revision_count`
- **`tables`**: name, capacity, shape, x/y for the floor plan
- **`seat_assignments`**: guest to table, with a capacity check enforced by a constraint or trigger
- **`vendors`** and **`vendor_tasks`**: category, contact, cost (in kobo, as integers), deposit, due date, status
- **`reminders`** and **`email_log`**: what was sent, to whom, when, and the provider id
- **`payments`** and **`invoices`**: Paystack reference, amount in kobo, status lifecycle (see V2 19)
- **`check_ins`**: guest, time, staff, partial-party count

**RLS:** members can read and write only the events they belong to, with permissions by role (e.g. `staff` can only check in).

**Guest token lookups:** guests never query tables directly. Use a `security definer` RPC (e.g. `get_invitation(token)`, `submit_rsvp(token, payload)`) that returns only that guest's invitation. Add basic rate limiting on the guest routes.

## 6. Code standards (clean code matters most here)

- **Server first:**
  - Server Components by default; `"use client"` only for interactive leaves
  - Mutations go through Server Actions in each feature's `actions.ts`
  - Every action validates input with the feature's Zod schema, checks the session and role, and returns a typed result (`{ ok: true, data } | { ok: false, error }`). Actions never throw to the UI
  - Data reads go through `queries.ts` only. Components never call Supabase directly
- **Types and naming:**
  - no `any`, no non-null assertions without a comment
  - generate Supabase types and use them end to end
  - names are descriptive; no abbreviations
- **Size:** keep components small and single-purpose. Split anything over ~200 lines
- **One source for each thing:**
  - one source for every colour, radius, font and spacing value (the tokens); no hard-coded hex values in components
  - money as integer kobo, formatted only in `lib/format.ts` with `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })`
- **States:** every screen has designed loading (`loading.tsx` / skeletons), empty, error and success states, taken from the Stitch state libraries
- **Accessibility:**
  - WCAG 2.2 AA
  - visible focus everywhere
  - 44px minimum touch targets
  - labels on every input
  - status shown as text plus colour
  - keyboard-operable seating (not drag-only)
  - `prefers-reduced-motion` respected
- **Performance budgets:**
  - guest routes (`/i/[token]`, `/e/[slug]`) render on the server, work without JavaScript for the basic RSVP, and ship under **70 KB** of first-load JS (gzipped)
  - app routes stay under **200 KB**
  - images go through `next/image`
- **Security:**
  - secrets are read only in server code via `lib/env.ts`
  - the Supabase service-role key is never imported into a client module
  - no secrets committed
  - Paystack and Resend use test keys
- **Commits:**
  - Conventional Commits (`feat(guests): …`, `refactor:`, `test:`), each commit small and building cleanly
  - commit messages must not include the music file or any keys

## 7. Phases (push after each one)

Branch: **`feat/ariya-app`**. After each phase, run `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Push only when everything is green.

1. **Foundation**
   - scaffold Next.js in place; move the static site to `public/site` and wire the rewrites
   - tokens and fonts; restyled UI primitives; app shell and sidebar from FINAL 01
   - env validation, ESLint/Prettier/Husky, `.env.example`, README skeleton
2. **Auth and events**
   - Supabase migrations and RLS, generated types
   - auth flow (V2 10–12)
   - My Events (FINAL 02); Create/Edit Event wizard (V2 13); Event Overview (FINAL 01) with real counts
3. **Guests**
   - Guest Registry (FINAL 03) with search, filters, side panel, edit and delete states
   - CSV import with column mapping, duplicate detection and summary (V2 22)
   - token generation, copy link, share-to-WhatsApp link
4. **Guest experience and email**
   - public event page and Event Page Editor (V2 14)
   - personal invitation and RSVP (FINAL 06), with every state from V2 21: closed, invalid/expired link, already replied, revise
   - Resend templates (V2 16), sent from the RSVP action and logged
5. **Seating, vendors and check-in**
   - Seating Plan (FINAL 04, V2 23): drag and drop plus a keyboard alternative, capacity rules, unseated list
   - Vendors (SUPPORT 01)
   - Check-in Desk (V2 20), with QR via the camera and manual code
6. **Invitations, reminders, team and billing**
   - Invitation Studio (FINAL 05) and Reminders Centre (V2 15) with cron
   - Team & Roles (V2 17)
   - Checkout and payment states (V2 18–19), Paystack webhook
7. **Hardening**
   - responsive pass against MOBILE 01–08
   - global search (V2 24); 404 and error pages
   - Playwright e2e for: sign up → create event → import guests → open a guest link → RSVP → see the count update → seat the guest → pay (test)
   - fill in `docs/architecture.md` and the ADRs; finish the README

## 8. When you're done

Open a PR from `feat/ariya-app` into `main`, titled **"Àríyá app: dashboard, guest RSVP and supporting pages"**. The description should include:

1. what was built, phase by phase
2. a route list mapped to Stitch screen names
3. any place you deviated from Stitch and why
4. anything stubbed or left as a TODO (with file paths)
5. the steps to run locally with Supabase (`supabase start`, `pnpm db:reset`, `pnpm dev`)
6. bundle-analyzer results showing three.js is absent from app routes
7. the test results

If something in Stitch is ambiguous or contradicts this brief, follow this brief, note it in the PR, and keep going. Don't stop to ask unless a decision can't be reversed later (for example the database schema for payments).

# Architecture

Repository layout, route groups, request flow and the rules that keep it tidy.

Audience: Developers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Two domains in one repository

1. **Marketing site and film** (`public/site/`): framework-free, served through Next.js rewrites at `/`, `/about`, `/product`, `/pricing`, `/story` and `/film`. Its assets live under `public/site/assets/`.
2. **Application** (`src/`): Next.js 16 App Router, React 19, strict TypeScript and Tailwind v4, organised by feature under `src/features/` with its own actions, queries, schemas and components.

> The /assets rule: `/assets/*` is reserved for the legacy site rewrite. Code under `src/` must never serve from or link to `/assets/`, and `three` or `gsap` must never be imported into `src/`. CI enforces the second with `pnpm check:bundle`.

## Route groups

| Group             | Contains                                                        |
| ----------------- | --------------------------------------------------------------- |
| `(shell)/(app)`   | Signed-in app: events, approvals, connect-ai, profile, settings |
| `(shell)/(auth)`  | Sign-in, sign-up, forgot and reset password, OAuth callback     |
| `(shell)/(guest)` | Guest pages `/e/[slug]` and `/i/[token]`                        |
| `(shell)/(legal)` | `/privacy` and `/terms`                                         |
| `(shell)/(docs)`  | This manual at `/documentation`                                 |
| `(shell)/(print)` | Print layouts such as the seating chart                         |
| `(marketing)`     | Product, pricing, about, story and film                         |

Full-screen workspaces (seating, the invitation designer) hide the app chrome through `isWorkspaceRoute` in `components/layout/nav-items.ts`.

## Request flow

1. `proxy.ts` lets public pages and static files through, refreshes the Supabase session for everything else, and redirects signed-out visitors.
2. Server components read through the caller's Supabase client, so Row Level Security applies.
3. Mutations are Server Actions that validate with Zod, check the caller's role, then write.
4. Privileged work (rate limits, billing, webhooks, digests) uses the service-role client in trusted server code only.

## Technology

| Layer           | Choice                                                          |
| --------------- | --------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict |
| Styling         | Tailwind CSS v4 with CSS-variable tokens, Radix primitives      |
| Data and auth   | Supabase Postgres, Auth, Storage with RLS on every table        |
| Forms           | React Hook Form with Zod                                        |
| Tables and drag | TanStack Table, dnd-kit                                         |
| Email           | Resend with React Email templates                               |
| Payments        | Paystack                                                        |
| Engines         | Rust to WebAssembly (studio and design)                         |

## Legacy URLs

| Request                                                  | Behaviour                                 |
| -------------------------------------------------------- | ----------------------------------------- |
| `/`, `/about`, `/product`, `/pricing`, `/story`, `/film` | Rewrite to the matching `/site/*.html`    |
| `/about.html` and the other `.html` forms                | Rewrite (and canonical redirects for SEO) |
| `/assets/:path*`                                         | Rewrite to `/site/assets/:path*`          |
| `/planner.html`                                          | 307 redirect to `/events`                 |
| `/rsvp.html?token=…` or `?g=…`                           | Redirect to `/i/[token]`                  |
| `/login`, `/signup`                                      | Redirect to `/sign-in`, `/sign-up`        |

## Performance budgets

Framework baseline: 489.7 KB uncompressed (147.7 KB gzipped). Guest routes must add no more than 20 KB gzipped of page-specific code.

| Route                 | First-load gzip | Page delta |
| --------------------- | --------------- | ---------- |
| `/i/[token]`          | 159.8 KB        | +12.0 KB   |
| `/e/[slug]`           | 148.9 KB        | +1.2 KB    |
| `/events`             | 177.8 KB        | +30.1 KB   |
| `/events/[id]/guests` | 245.7 KB        | +98.0 KB   |

Heavy libraries (tables, QR scanners, charts, the designer) are loaded only on signed-in routes.

## Global search

`⌘K` calls the `global_search` function, scoped to the caller's celebrations, with escaped wildcards and a 250 ms debounce that cancels stale requests.

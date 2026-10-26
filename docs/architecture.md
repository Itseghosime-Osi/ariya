# Àríyá Architecture Documentation

## 1. System Overview

Àríyá (by OwambePlan) is an event and wedding planner for Nigerian couples and planners. It replaces guest lists and RSVPs scattered across WhatsApp groups. Every guest receives a personal, unguessable RSVP link. Planners pay per celebration.

## 2. Repository Layout & Asset Isolation

The repository is partitioned into two distinct domains:

1. **Legacy Marketing Site & Wedding Film (`public/site/`)**
   - Served framework-free via Next.js rewrites at `/`, `/about`, `/product`, `/pricing`, `/story`, and `/film`.
   - Static assets for the marketing site and film reside strictly under `public/site/assets/`.
   - **Crucial Routing Rule**: The path prefix `/assets/*` is strictly reserved for the legacy static site rewrite (mapping `/assets/:path*` to `/site/assets/:path*`). **Application code under `src/` must NEVER serve files from or reference `/assets/`**. Application static assets must be placed in `src/assets/` or stored in Supabase Storage.
   - The wedding film and three.js are completely isolated and must never be imported into any application bundle under `src/`.

2. **Application Platform (`src/`)**
   - Built on Next.js 16 (App Router), React 19, TypeScript strict mode, and Tailwind CSS v4.
   - Follows a feature-sliced architecture under `src/features/` with isolated actions, queries, schemas, and components.
   - Authenticated shell layout (FINAL 01) with responsive mobile views (MOBILE 01–08).

3. **Private Media (`private-media/`)**
   - Contains `private-media/music.mp3`, a commercial audio track used exclusively for private offline class demonstration.
   - It is kept completely outside `public/` so it is never bundled, served, or deployed publicly.

## 3. Technology Stack & Decision Records

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Runtime**: React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 with design tokens defined as CSS variables
- **UI Primitives**: Radix UI (shadcn/ui style), customized to Àríyá tokens
- **Data & Auth**: Supabase (Postgres, Auth, Storage) with Row Level Security on every table
- **Form Management**: React Hook Form with Zod schemas
- **Tables & DND**: TanStack Table for registry, dnd-kit for seating chart
- **Emails**: Resend + React Email templates
- **Payments**: Paystack in test mode, with server action initialization and idempotent webhook verification

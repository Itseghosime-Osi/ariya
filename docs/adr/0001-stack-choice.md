# ADR 0001: Technology Stack Choice

## Status

Accepted

## Context

Àríyá is a high-society Nigerian wedding and owambe coordination suite. The platform replaces fragmented guest lists, physical RSVP notebooks, and WhatsApp chaos with a unified, elegant platform. Nigerian wedding planners and couples operate under high stakes, on diverse mobile and desktop devices, and across varying connectivity conditions in Lagos, London, Abuja, and Atlanta.

The platform requires:

1. Fast, responsive mobile-first UI for guests receiving digital invitations via WhatsApp.
2. Robust, auditable database access controls for celebration owners, planners, couples, and day-of reception staff.
3. Nigerian payment rail support (Paystack in NGN).
4. Reliable email dispatch with strict anti-spam rate limiting.

## Decision

We chose the following core stack:

1. **Next.js 16 (App Router) & React 19**: Server Components for instant initial loads, Server Actions for secure data mutations without boilerplate API endpoints, and route grouping for clear separation between marketing/film (`public/site/`), authenticated planner workspace (`src/app/(app)`), and guest experience (`src/app/(guest)`).
2. **Supabase (PostgreSQL 15, Auth, RLS)**: Provides enterprise-grade relational modeling with Row Level Security (RLS) policies enforced in the database kernel, preventing unauthorized multi-tenant data leaks regardless of application-level bugs.
3. **Tailwind CSS v4 & Radix UI**: Design token-driven styling implementing the Imperial Burgundy, Champagne Gold, and Ivory aesthetic specified in the design language, with accessible, unstyled headless primitives.
4. **TanStack Table & dnd-kit**: Performant client-side table virtualization and accessible drag-and-drop banquet seating with keyboard alternatives.
5. **Paystack Integration**: Standard Nigerian payment gateway support using server-side checkout initialization and HMAC-SHA512 verified webhooks.
6. **Zod Validation**: Strict runtime schema validation for environment variables, server action inputs, and CSV ingestion.

## Consequences

- **Positive**: High development velocity, end-to-end type safety, atomic database operations, and sub-second page loads on mobile.
- **Negative**: Database privilege management requires rigorous pgTAP testing; Next.js 16 breaking changes require adherence to updated App Router patterns.

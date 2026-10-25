# Àríyá by OwambePlan

In-house experiment for Tech4Youth Edo, Module 06, Project 36: a wedding and event planner for Nigerian couples and planners, replacing guest lists and RSVPs scattered across WhatsApp groups. **OwambePlan** is the product; **Àríyá** (ah-ree-YAH, Yoruba for merriment) is its consumer-facing name.

## Pages

| Path | What it is | Status |
|---|---|---|
| `/` (`index.html`) | Landing page: product promise, WhatsApp-to-guest-list demo, the guest experience (invitation → RSVP → place card → table), guest and seating preview, vendor checklist, how it works, pricing | Working, static |
| `planner.html` | Demo planner: event page header, guest list (search, filters, status counts, personal links with copy), CSV import (preview, row validation, duplicate detection), seating (2D floor plan, click-to-assign, drag-and-drop, list view, full-table feedback, table details sheet), vendor checklist (add, edit, complete, overdue) | Working on sample data |
| `rsvp.html?g=<token>` | Guest RSVP page: invitation, accept/decline, plus-one only when allowed, note to the couple, confirmation | Working on sample data |
| `film.html` | "The Yes", the optional cinematic WebGL film (three.js, ray-traced diamond, generated soundtrack) | Optional extra |

## What is real and what is sample

Everything in the planner and RSVP pages runs on **sample data** in `assets/demo.js`, kept in `sessionStorage` for the current tab only. Nothing is sent: no invitations, SMS, WhatsApp messages, emails or payments. Every demo surface says so. Pricing is labelled as placeholder.

`assets/demo.js` models the project's entities, **events, guests, RSVPs, tables and vendors**, and exposes the operations the UI needs (`respond`, `assign`, `unassign`, `previewImport`, `commitImport`, `counts`, `seatsUsed`). Replacing it with API calls is the integration point.

### Still needed for a live product

- Accounts and authentication for couples and planners
- A database and API for events, guests, RSVPs, tables and vendors (the shapes in `demo.js`)
- Unguessable per-guest tokens issued by the server, so RSVP links can't be enumerated
- Sending: confirmation emails (e.g. Resend), SMS/WhatsApp delivery of links
- Payments per event (e.g. Paystack or Flutterwave)
- Server-side CSV parsing and validation mirroring `previewImport`

## Design system

`assets/ariya.css`: deep emerald and warm ivory alternate by section, champagne gold is an accent. Bodoni Moda for emotional headlines, Figtree for everything people read or operate, Pinyon Script only for names on paper. Status always pairs colour with a word. Buttons are at least 44px tall, focus is always visible, and `prefers-reduced-motion` removes transitions.

The hero still life and the guest-experience sequence are 2.5D (layered HTML and CSS), not WebGL, so they load instantly, stay sharp, and work everywhere. The RSVP form never depends on animation.

## Run it

Static files, no build step. Serve the folder (the film fetches its HDRI):

```
npx serve .
```

## Credits

`assets/hall.exr`: Poly Haven "hall" HDRI (CC0), via `@pmndrs/assets`. three.js 0.169 from jsDelivr (film only).

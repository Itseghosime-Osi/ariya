# What Àríyá is

One place for every yes, every seat and every vendor of a Nigerian wedding or owambe.

Audience: Everyone

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

Àríyá runs the logistics of a celebration: who is invited, who replied, where they sit, which vendors still owe you something, and who has walked through the door. Hosts and planners see the same live headcount; guests only ever see their own invitation.

## What you can do

| Area                 | What it does                                                                      | Read more                          |
| -------------------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| Guests               | Add, import (spreadsheet or phone contacts), search and group your list           | [Guests](guests.md)                |
| Invitations          | Design a card, then send personal links by email; copy links for WhatsApp and SMS | [Send invitations](invitations.md) |
| Designer             | A full-screen design tool with Simple and Pro modes                               | [Invitation designer](designer.md) |
| RSVP                 | Guests reply in one tap, with your own questions                                  | [RSVP](rsvp.md)                    |
| Seating              | A 3D hall, tables, auto-seat and a printable plan                                 | [Seating](seating.md)              |
| Venue studio         | Layouts, cooling, catering quantities and risk advice                             | [Venue studio](venue-studio.md)    |
| Check-in             | A reception desk: scan or type a code, then tap Admit                             | [Check-in](check-in.md)            |
| Checklist            | A dated plan, reminders, calendar export and an offline day-of sheet              | [Checklist](checklist.md)          |
| Vendors and budget   | Vendor tasks counted back from the day                                            | [Vendors](vendors.md)              |
| Public page and film | A shareable event page and an animated film                                       | [Public page](public-page.md)      |
| Connect your AI      | Let Claude or ChatGPT help, with you approving every change                       | [Connect your AI](connect-ai.md)   |

## Who uses it

- **Owner**: the host who created the celebration.
- **Planner**: a hired coordinator who runs the day on the owner's behalf.
- **Couple**: the celebrants, with a look-but-mostly-don't-touch view.
- **Staff**: the reception team on the day. They can scan and admit, nothing else.
- **Guests**: never need an account or an app. They open their personal link in any phone browser.

## How it is built, in one paragraph

A Next.js 16 web app (App Router, React 19, Tailwind v4) on Vercel, a Supabase Postgres database with Row Level Security on every table, Resend for email, Paystack for payment, and two small Rust engines compiled to WebAssembly (the venue studio and the invitation designer). See [Architecture](architecture.md) for the full picture.

> Where it is today: Email invitations work end to end. Automatic text and WhatsApp sending, reminders to non-repliers and per-guest delivery status are not built yet; see [Roadmap and known limits](roadmap.md).

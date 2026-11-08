import type { DocPage } from "../types";

export const startPages: DocPage[] = [
  {
    slug: "overview",
    title: "What Àríyá is",
    group: "start",
    audience: "Everyone",
    summary:
      "One place for every yes, every seat and every vendor of a Nigerian wedding or owambe.",
    blocks: [
      {
        t: "p",
        x: "Àríyá runs the logistics of a celebration: who is invited, who replied, where they sit, which vendors still owe you something, and who has walked through the door. Hosts and planners see the same live headcount; guests only ever see their own invitation.",
      },
      { t: "h2", x: "What you can do" },
      {
        t: "table",
        head: ["Area", "What it does", "Read more"],
        rows: [
          [
            "Guests",
            "Add, import (spreadsheet or phone contacts), search and group your list",
            "[Guests](/documentation/guests)",
          ],
          [
            "Invitations",
            "Design a card, then send personal links by email; copy links for WhatsApp and SMS",
            "[Send invitations](/documentation/invitations)",
          ],
          [
            "Designer",
            "A full-screen design tool with Simple and Pro modes",
            "[Invitation designer](/documentation/designer)",
          ],
          [
            "RSVP",
            "Guests reply in one tap, with your own questions",
            "[RSVP](/documentation/rsvp)",
          ],
          [
            "Seating",
            "A 3D hall, tables, auto-seat and a printable plan",
            "[Seating](/documentation/seating)",
          ],
          [
            "Venue studio",
            "Layouts, cooling, catering quantities and risk advice",
            "[Venue studio](/documentation/venue-studio)",
          ],
          [
            "Check-in",
            "A reception desk: scan or type a code, then tap Admit",
            "[Check-in](/documentation/check-in)",
          ],
          [
            "Checklist",
            "A dated plan, reminders, calendar export and an offline day-of sheet",
            "[Checklist](/documentation/checklist)",
          ],
          [
            "Vendors and budget",
            "Vendor tasks counted back from the day",
            "[Vendors](/documentation/vendors)",
          ],
          [
            "Public page and film",
            "A shareable event page and an animated film",
            "[Public page](/documentation/public-page)",
          ],
          [
            "Connect your AI",
            "Let Claude or ChatGPT help, with you approving every change",
            "[Connect your AI](/documentation/connect-ai)",
          ],
        ],
      },
      { t: "h2", x: "Who uses it" },
      {
        t: "ul",
        x: [
          "**Owner**: the host who created the celebration.",
          "**Planner**: a hired coordinator who runs the day on the owner's behalf.",
          "**Couple**: the celebrants, with a look-but-mostly-don't-touch view.",
          "**Staff**: the reception team on the day. They can scan and admit, nothing else.",
          "**Guests**: never need an account or an app. They open their personal link in any phone browser.",
        ],
      },
      { t: "h2", x: "How it is built, in one paragraph" },
      {
        t: "p",
        x: "A Next.js 16 web app (App Router, React 19, Tailwind v4) on Vercel, a Supabase Postgres database with Row Level Security on every table, Resend for email, Paystack for payment, and two small Rust engines compiled to WebAssembly (the venue studio and the invitation designer). See [Architecture](/documentation/architecture) for the full picture.",
      },
      {
        t: "note",
        tone: "info",
        title: "Where it is today",
        x: "Email invitations work end to end. Automatic text and WhatsApp sending, reminders to non-repliers and per-guest delivery status are not built yet; see [Roadmap and known limits](/documentation/roadmap).",
      },
    ],
  },
  {
    slug: "quick-start",
    title: "Ten-minute tour",
    group: "start",
    audience: "New hosts",
    summary:
      "From a blank account to a guest holding their personal invitation.",
    blocks: [
      {
        t: "ol",
        x: [
          "**Create an account** at `/sign-up`, with email and password or **Continue with Google**. Tick the Terms and Privacy box.",
          "**Create a celebration** from `/events` → New. Give it a title, the couple's names, date, venue and area.",
          "**Add guests**: type them in, import a spreadsheet (CSV), or pick people from your phone's contacts or a `.vcf` file. See [Guests](/documentation/guests).",
          "**Design the invitation** (Invitations → Open the designer). Start in Simple mode, or import your own card. See [Designer](/documentation/designer).",
          "**Send**: tick the guests, choose Email and send. For WhatsApp and SMS, copy the personal link and paste it into the chat. See [Send invitations](/documentation/invitations).",
          "**Watch replies arrive** on the event overview. Seat the people who said yes in [Seating](/documentation/seating).",
          "**On the day**, open the [check-in desk](/documentation/check-in), scan or type each guest's code, and tap Admit.",
        ],
      },
      {
        t: "note",
        tone: "tip",
        title: "Free up to 20 guests",
        x: "Small gatherings (up to 20 invited guests) are free. Bigger ones need one Celebration Pass (₦50,000 per event). See [Billing](/documentation/billing).",
      },
      { t: "h2", x: "Try it with demo data" },
      {
        t: "p",
        x: "On a local install, `pnpm db:seed` creates a demo host (`demo@owambe.ng`) and a celebration with 60 guests, 7 banquet tables and 6 vendors. See [Local setup](/documentation/setup).",
      },
    ],
  },
  {
    slug: "concepts",
    title: "Concepts and glossary",
    group: "start",
    audience: "Everyone",
    summary: "The few ideas and words that the rest of the manual relies on.",
    blocks: [
      { t: "h2", x: "Core ideas" },
      {
        t: "ul",
        x: [
          "**Celebration (event)**: the container for everything else. Guests, tables, vendors, tasks and the invitation all belong to one.",
          "**Guest party**: one row on the guest list. It may be a single person or a household with a party size, so the headcount is always people, not names.",
          "**Personal link**: `/i/<token>`. Unique to each guest; it shows their invitation and RSVP form. Anyone holding it can reply as that guest, so share it only with them.",
          "**Entry code**: the guest's own `check_in_code`, drawn into the card as the entry seal and typed or scanned at the door.",
          "**Design document**: the saved JSON of an invitation (layers, canvas, palette). One renderer draws it everywhere.",
          "**Proposal**: something an AI app asks to do (send invitations, apply a layout). It waits for the host on the approvals desk. Nothing happens until the host approves.",
        ],
      },
      { t: "h2", x: "Glossary" },
      {
        t: "table",
        head: ["Term", "Meaning"],
        rows: [
          ["Owambe", "A large, lively Nigerian celebration"],
          [
            "Aso ebi",
            "Matching cloth worn by a family or group; the woven-stripe motif in the design nods to it",
          ],
          ["Gele", "Head tie; shown as a vendor category in examples"],
          [
            "Celebration Pass",
            "The ₦50,000 one-off payment that unlocks a large event",
          ],
          [
            "Entry seal",
            "The crest on the card whose pattern encodes the guest's entry code",
          ],
          [
            "Admit",
            "The explicit button at the desk. Verifying a pass never lets anyone in by itself",
          ],
          [
            "RLS",
            "Row Level Security, the database rule layer that decides which rows each person may see",
          ],
          [
            "MCP",
            "Model Context Protocol, how AI apps connect to Àríyá at `/mcp`",
          ],
          [
            "Design engine",
            "The Rust/WebAssembly code that edits invitation designs",
          ],
          [
            "Studio engine",
            "The Rust/WebAssembly code that does hall layout, thermal, catering and risk",
          ],
          [
            "Kobo",
            "One hundredth of a naira. ₦50,000 is stored as 5,000,000 kobo",
          ],
        ],
      },
      { t: "h2", x: "Voice and language" },
      {
        t: "p",
        x: "The product is warm, short and Nigerian-aware ('Every yes, together', 'Owambe mode'). Money is shown in naira with the ₦ sign and times are in Lagos time. See [Design system](/documentation/design-system).",
      },
    ],
  },
];

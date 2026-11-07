import type { DocPage } from "../types";

export const hostPages: DocPage[] = [
  {
    slug: "events",
    title: "Celebrations",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "Create, run, archive and share a celebration, and what the overview shows.",
    blocks: [
      { t: "h2", x: "Creating one" },
      {
        t: "p",
        x: "Go to `/events` and choose **New**. A celebration has a title, the couple's names, a date, a venue and area, a dress code, a description, a status, a visibility setting and an RSVP deadline. Every one of these can be changed later in Settings or the Page editor.",
      },
      { t: "h2", x: "The overview" },
      {
        t: "p",
        x: "`/events/[eventId]` is the home of a celebration. A banner holds the wax seal (the couple's initials), names, one detail line and one big number. Below it:",
      },
      {
        t: "ul",
        x: [
          "**Readiness rings**: one ring each for replies, seating, vendors, deposits and tasks. Hover or focus a ring to see its number.",
          "**Guest constellation**: stars grouped by side, with filters and an expected-on-the-day stepper.",
          "**Reply waffle**: 100 dots, one per percent of replies (accepted, awaiting, declined).",
          "**Budget weave**: a strip of bands sized by cost, solid when paid, hatched when not.",
          "**Road to the day** and **Guestbook**, plus a preview of the saved invitation (the same renderer the guest sees).",
        ],
      },
      {
        t: "p",
        x: "Every graphic has its numbers as text too, so nothing depends on colour alone.",
      },
      { t: "h2", x: "Your celebrations list" },
      {
        t: "p",
        x: "`/events` shows an interactive stage of upcoming celebrations, guest replies, this week's items, recent replies, a draggable to-do board and an All events ledger. Cards open into the detail page with a shared-element transition.",
      },
      { t: "h2", x: "Settings, archive and expiry" },
      {
        t: "ul",
        x: [
          "**Settings** (`/events/[id]/settings`) edits the core details.",
          "**Archive** makes a celebration read-only. An archived celebration's hall and seating cannot be changed, even by an AI proposal.",
          "**Expiry** is calculated from the event date by `event-expiry`; old events are treated as finished.",
        ],
      },
      {
        t: "note",
        tone: "info",
        x: "Team members, billing and the page editor are covered in [Roles and team](/documentation/team), [Billing](/documentation/billing) and [Public page and film](/documentation/public-page).",
      },
    ],
  },
  {
    slug: "guests",
    title: "Guests",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "Add, import, search and organise the guest list.",
    blocks: [
      { t: "h2", x: "The registry" },
      {
        t: "p",
        x: "`/events/[id]/guests` is a table of guest parties with name, party size, side, group, RSVP status, table and a personal-link tool. Open a guest to edit details, copy their link, or see what they answered. Status is always a word as well as a colour: confirmed, pending or declined.",
      },
      { t: "h2", x: "Ways to add guests" },
      {
        t: "table",
        head: ["Method", "How", "Notes"],
        rows: [
          [
            "Type them in",
            "Add guest",
            "Name, optional phone and email, party size, side, group, notes",
          ],
          [
            "Spreadsheet",
            "Import → upload a CSV",
            "Rows are checked before anything is saved; missing details and duplicates are flagged. Up to 500 rows per file",
          ],
          [
            "Phonebook",
            "Import → Pick from contacts",
            "Uses the browser's contact picker where available (Chrome on Android). Otherwise use the file option",
          ],
          [
            "Contacts file",
            "Import → upload a `.vcf`",
            "Works on any device: export contacts from your phone and upload",
          ],
          [
            "AI app",
            "`add_guest` / `import_guests`",
            "Up to 200 rows per import. See [Connect your AI](/documentation/connect-ai)",
          ],
        ],
      },
      {
        t: "p",
        x: "Phone numbers are normalised to the Nigerian international format where possible (see `lib/phone`).",
      },
      {
        t: "note",
        tone: "warn",
        title: "Free limit",
        x: "A free celebration can invite up to 20 guests. Beyond that the database refuses with `PAYMENT_REQUIRED` until the [Celebration Pass](/documentation/billing) is paid.",
      },
      { t: "h2", x: "RSVP questions" },
      {
        t: "p",
        x: "Under Invitations you can add your own questions (for example food choice or aso ebi size). Guests answer them when they accept, and the answers appear on the guest's row. They are stored in `rsvp_answers`.",
      },
      { t: "h2", x: "Search" },
      {
        t: "p",
        x: "Use the search box on the registry, or press `⌘K` (Ctrl K) anywhere for global search across celebrations, guests and vendors you are allowed to see.",
      },
    ],
  },
  {
    slug: "invitations",
    title: "Send invitations",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "Tick guests, send by email, or copy personal links for WhatsApp and SMS.",
    blocks: [
      { t: "h2", x: "The invitations page" },
      {
        t: "p",
        x: "`/events/[id]/invitations` shows the saved card, the guest tracker and the send tools. Tick guests (or select all who are not yet invited), then choose how to send.",
      },
      {
        t: "table",
        head: ["Channel", "Status", "How it works"],
        rows: [
          [
            "Email",
            "**Works**",
            "Sent through Resend from `invitations@ariyaday.com`. A branded message with the guest's personal link and a reply button",
          ],
          [
            "WhatsApp",
            "Manual",
            "Copy the personal link (or a ready message) and paste it into the chat. Automatic sending is not built",
          ],
          [
            "Text (SMS)",
            "Manual",
            "Same: copy the link or message. Automatic sending is not built",
          ],
        ],
      },
      { t: "h2", x: "How bulk email behaves" },
      {
        t: "ul",
        x: [
          "A bulk send covers **at most 10 guests per click**. Inside it, emails go out with a short pause (600 ms) between batches to stay under the provider's rate limit. For more guests, send again.",
          "Each send is written to `email_log`. A guest is marked **invited** only after a successful send.",
          "Free celebrations are limited to 20 invited guests; an owner-or-planner role is required to send.",
          "The free Resend plan allows roughly 100 emails a day. A larger wedding needs a paid Resend plan or several days.",
        ],
      },
      { t: "h2", x: "What the guest receives" },
      {
        t: "p",
        x: "A branded email with the couple's names, the date and venue, and one button to their personal link. When they open it, they see the designed card and the RSVP form (see [RSVP](/documentation/rsvp)).",
      },
      {
        t: "note",
        tone: "info",
        title: "Known limit",
        x: "The email does not embed the designed card as a picture; the card is shown on the personal link page. There is also no PNG or PDF export of the card for hosts yet.",
      },
      {
        t: "note",
        tone: "warn",
        title: "If emails do not arrive",
        x: "The Resend domain must be verified. A `validation_error` in `email_log` means the sender domain is not verified. See [Email and notifications](/documentation/email) and [Troubleshooting](/documentation/troubleshooting).",
      },
    ],
  },
  {
    slug: "designer",
    title: "Invitation designer",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "A full-screen design tool with Simple and Pro modes, shapes, pictures and your own card.",
    blocks: [
      {
        t: "p",
        x: "Open it from Invitations → **Open the designer** (`/events/[id]/invitations/design`). It is a full-screen workspace, like the seating studio, so the normal app chrome is hidden.",
      },
      { t: "h2", x: "Two modes" },
      {
        t: "table",
        head: ["Mode", "For", "What you get"],
        rows: [
          [
            "Simple",
            "Anyone",
            "A guided panel: choose a look, edit the words, change colours, add a picture, import your card",
          ],
          [
            "Pro",
            "Designers",
            "A free canvas with a tool rail, layers dock, inspector and on-canvas handles",
          ],
        ],
      },
      { t: "h2", x: "Layer kinds" },
      {
        t: "table",
        head: ["Kind", "What it is"],
        rows: [
          [
            "Text (headline, subheadline, kicker, footer, body)",
            "Words with font, size, weight, italic, tracking, alignment and colour role. Kicker and footer are upper-case",
          ],
          ["Divider", "A hairline with a small star"],
          [
            "Shape",
            "Rectangle, ellipse or line, with fill, stroke, stroke width and corner radius",
          ],
          ["Image", "A picture, fitted cover or contain, with rounded corners"],
          ["Seal", "The couple's wax monogram seal"],
          [
            "Entry seal (code)",
            "A crest whose pattern encodes the guest's entry code. See below",
          ],
        ],
      },
      { t: "h2", x: "Pro tools" },
      {
        t: "ul",
        x: [
          "Drag to move, drag the handles to resize and rotate (rotation snaps to common angles).",
          "Layer panel: show or hide, lock, reorder, rename. Stacking: forward, backward, to front, to back.",
          "Align and distribute, duplicate, delete, opacity, rotation.",
          "Canvas ratio and the 'chrome' (the ribbon and foil frame) can be turned off for a full-bleed look.",
          "Undo and redo, and automatic saving.",
          "Colour roles (title, body, accent, foil, custom) follow the palette, so changing the palette recolours the card.",
        ],
      },
      { t: "h2", x: "Import your own card" },
      {
        t: "p",
        x: "Upload an image of an invitation you already have. It becomes the full-canvas background (with an optional overlay), and you can keep layering text, shapes and the entry seal on top. Remove it any time from the Simple panel.",
      },
      { t: "h2", x: "The entry seal and the access pass" },
      {
        t: "p",
        x: "If the card has an entry seal, each guest's copy shows their own code inside it. The seal is added automatically (`ensureEntrySeal`) when you send passes, so a guest always has a way in. A guest who has not accepted yet sees the card without the seal. If the design has no seal, the guest page falls back to a plain code line, and the desk can also find them by name. See [Check-in](/documentation/check-in).",
      },
      { t: "h2", x: "One renderer everywhere" },
      {
        t: "p",
        x: "The overview preview, the designer, the guest's personal page and the film finale all draw the card with the same `InvitationCard` component from the same saved design, so a host never sees two different cards for one wedding.",
      },
      { t: "h2", x: "Limits" },
      {
        t: "ul",
        x: [
          "Pictures are capped at **5 MB**.",
          "A layer's width cannot go below 5% (the server refuses smaller).",
          "Not built yet: multi-select and groups, guides, gradients, more fonts, on-canvas text editing, PDF import, PNG/PDF export. See [Roadmap](/documentation/roadmap).",
        ],
      },
      {
        t: "p",
        x: "The editing maths runs in a small Rust engine compiled to WebAssembly, with a TypeScript fallback if it cannot load. See [Design engine](/documentation/design-engine).",
      },
    ],
  },
  {
    slug: "rsvp",
    title: "RSVP and the guest pass",
    group: "hosts",
    audience: "Hosts, and anyone curious about the guest side",
    summary:
      "What a guest sees from one link: the card, the reply form and their pass.",
    blocks: [
      { t: "h2", x: "One link, no app" },
      {
        t: "p",
        x: "A guest opens `/i/<token>` in any phone browser. They see the invitation card (drawn from your saved design), then the reply form. No account is needed.",
      },
      { t: "h2", x: "The reply form" },
      {
        t: "ul",
        x: [
          "Accept or decline in one tap.",
          "If you allow it, a plus-one (with a name) and party size.",
          "Dietary needs, a note to the couple, and your own RSVP questions.",
          "After replying, the guest gets a confirmation email with their reply, date, venue and table.",
        ],
      },
      { t: "h2", x: "Accepted guests: the pass" },
      {
        t: "p",
        x: "Once a guest accepts, their card shows the entry seal with their own code, and they can save the invitation. This is what the usher checks at the door. The code is also available as text, so a guest never has to rely on a scan alone.",
      },
      { t: "h2", x: "Finding a pass later" },
      {
        t: "p",
        x: "On the public event page (`/e/[slug]`) a guest can enter their invitation code to find their pass again without the original message.",
      },
      {
        t: "note",
        tone: "info",
        title: "Weight",
        x: "Guest routes are held to a small budget: `/i/[token]` adds about 12 KB gzipped on top of the shared baseline, and the rule is no more than 20 KB. See [Quality and testing](/documentation/testing).",
      },
    ],
  },
];

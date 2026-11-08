import type { DocPage } from "../types";

export const hostPages2: DocPage[] = [
  {
    slug: "seating",
    title: "Seating",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "A full-screen 3D hall: place tables, seat the confirmed, print the plan.",
    blocks: [
      {
        t: "p",
        x: "`/events/[id]/seating` is a full-screen workspace (the normal app chrome hides). A 3D hall sits beside a set of panels: a tool rail, a layers panel, a table dock and an inspector.",
      },
      { t: "h2", x: "Rules that always hold" },
      {
        t: "ul",
        x: [
          "Only guests who said **yes** can take a seat; pending guests wait.",
          "A table never takes more people than it has chairs, counting **party size**. Full tables show as full before you assign anyone.",
          "Seating is blocked on archived celebrations.",
        ],
      },
      { t: "h2", x: "Workspace tools" },
      {
        t: "ul",
        x: [
          "Add tables (round, rectangular and more) and drag them in the hall; positions are stored in centimetres.",
          "Layers panel: show or hide, lock and reorder items; a dark theme for the studio.",
          "Duplicate with `⌘/Ctrl D` or Ctrl-click, place rows of tables or chairs, group items so a click selects the whole group and moving it is one undo step.",
          "Auto-seat fills unseated confirmed guests by group and side without moving anyone already seated.",
          "Table list view for people who prefer rows to a picture.",
          "**Print** at `/events/[id]/seating/print` gives a clean seating chart.",
        ],
      },
      { t: "h2", x: "Two modes, one document" },
      {
        t: "p",
        x: "**Simple** asks six questions and writes a layout. **Studio** lets you edit every detail. Both write the same document, `events.hall_layout` (JSON, at most 64 KB), so you can switch freely.",
      },
      {
        t: "p",
        x: "The 3D view is `public/hall3d/hall3d.js` running in an iframe, handed the same JSON; it is deliberately kept out of the app bundle. See [Venue studio](/documentation/venue-studio).",
      },
    ],
  },
  {
    slug: "venue-studio",
    title: "Venue studio",
    group: "hosts",
    audience: "Hosts, planners, engineers",
    summary:
      "Auto-layout, cooling, catering quantities, risk advice and a generated checklist.",
    blocks: [
      {
        t: "p",
        x: "The studio's decks sit beside the hall. They all run on one Rust engine (`crates/studio-core`, loaded as WebAssembly), so a browser, an AI call and a test produce identical numbers. If the engine cannot load, the hall falls back to simple TypeScript geometry and the engine decks are hidden with a quiet note.",
      },
      { t: "h2", x: "What it calculates" },
      {
        t: "table",
        head: ["Deck", "What you get"],
        rows: [
          [
            "Layout",
            "Archetypes (rows, banquet, cabaret and more) × scoring × a seeded search that returns the same three options on every device. Scores consider sightlines, circulation and service",
          ],
          [
            "Thermal",
            "Heat load from guests, lighting, kitchen and sun, then split-AC sizing and placement with a heat map. Marquees and outdoor venues are treated separately",
          ],
          [
            "Catering",
            "Food and drink per guest for a Nigerian menu, with overage that scales inversely with headcount and the multipliers most calculators miss",
          ],
          [
            "Risk",
            "A register of hazards (fire, weather, crowding and more) with a mitigation and a source for each rating",
          ],
          [
            "Checklist",
            "A dated task list generated from the plan. See [Checklist](/documentation/checklist)",
          ],
        ],
      },
      { t: "h2", x: "Venue types and space" },
      {
        t: "p",
        x: "The questions asked depend on the venue type (hall, marquee, outdoor and so on). Space per guest, clearances, table conventions, fire and life-safety rules, weather and West African practice are in the research document, `docs/research/2026-11-05-venue-studio.md`.",
      },
      {
        t: "note",
        tone: "info",
        title: "Honest framing",
        x: "Catering and cooling figures are planning estimates, not a quote or an engineer's design. Where the engine deliberately differs from the research text, a test records why (for example `the_research_table_is_lower_than_its_own_formula`).",
      },
      { t: "h2", x: "For engineers" },
      {
        t: "p",
        x: "See [Design engine and studio engine](/documentation/design-engine) and ADR 0005 in [Decisions](/documentation/decisions). A parity corpus of 693 cases keeps the TypeScript geometry and the Rust engine in step.",
      },
    ],
  },
  {
    slug: "check-in",
    title: "Check-in desk",
    group: "hosts",
    audience: "Reception staff, hosts and planners",
    summary: "Scan or type a code, confirm who it is, then tap Admit.",
    blocks: [
      {
        t: "p",
        x: "`/events/[id]/check-in` is the reception desk. The rule it enforces: **nobody is let in until you tap Admit**. Verifying a pass only shows who it belongs to.",
      },
      { t: "h2", x: "Three ways to find a guest" },
      {
        t: "ol",
        x: [
          "**Scan** the entry seal with the camera.",
          "**Type the personal entry code** (for example `ARY-7K2M-99NP`). Capitals are applied for you.",
          "**Search by name** if the guest cannot find their code. Results show the party, table and status, and you can verify from there.",
        ],
      },
      { t: "h2", x: "Verify, then Admit" },
      {
        t: "ul",
        x: [
          "A result card shows the guest, party size, table and any problem (already admitted, did not accept).",
          "**Admit** records the arrival and its time and updates the counts live.",
          "The **Admissions Activity Log** lists the latest arrivals with party size, table and Lagos time.",
        ],
      },
      { t: "h2", x: "The numbers" },
      {
        t: "p",
        x: "The header shows admitted of expected, the attendance rate and a progress bar, plus Awaiting Arrival and Confirmed RSVPs. A 'Live updates on' chip shows the realtime link is active.",
      },
      { t: "h2", x: "Who can use it" },
      {
        t: "p",
        x: "Owner, Planner, Couple (view) and Staff (scan and admit). Staff cannot see billing. See [Roles and team](/documentation/team).",
      },
      {
        t: "note",
        tone: "info",
        title: "Under the hood",
        x: "Name search is the database function `search_check_in_guests`, limited to staff-and-up of that celebration. Admission uses `check_ins` rows and `check_in_code`.",
      },
    ],
  },
  {
    slug: "checklist",
    title: "Checklist and day-of",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "A dated plan, weekly digest, calendar export and an offline run sheet.",
    blocks: [
      { t: "h2", x: "The checklist" },
      {
        t: "p",
        x: "`/events/[id]/checklist` is generated from your plan and seeds itself the first time you visit, so it is never empty. Tasks are reconciled by a stable `source_key`; a task you delete stays deleted (a tombstone), and re-generating never duplicates.",
      },
      {
        t: "ul",
        x: [
          "Phases and a 'next best action' keep progress calm rather than nagging.",
          "Risk advice can be added to the checklist; asking twice is a no-op.",
          "Collaboration follows team roles; changes are undoable.",
        ],
      },
      { t: "h2", x: "Reminders and calendar" },
      {
        t: "ul",
        x: [
          "**Weekly digest** email from `/api/cron/digest` (a GitHub Actions workflow). One send per person per week (`digest_log`); quiet hours hold a send rather than drop it.",
          "**Calendar export**: `/api/events/[id]/checklist.ics`, scoped by the caller's permissions.",
          "**Reminders page** (`/events/[id]/reminders`) and a daily reminders cron on Vercel at 09:00.",
        ],
      },
      { t: "h2", x: "Day-of mode" },
      {
        t: "p",
        x: "`/events/[id]/day-of` is a separate, offline-first run sheet. A service worker (`public/sw.js`) caches it so it still opens in a hall with no signal.",
      },
    ],
  },
  {
    slug: "vendors",
    title: "Vendors and budget",
    group: "hosts",
    audience: "Hosts and planners",
    summary:
      "One roster of vendors, their tasks counted back from the day, and a budget strip.",
    blocks: [
      {
        t: "p",
        x: "`/events/[id]/vendors` holds each vendor with contact details, a status and tasks. Tasks have due dates counted back from the event date, so overdue ones rise to the top and ticking one off is one tap.",
      },
      { t: "h2", x: "Categories" },
      {
        t: "ul",
        x: [
          "Catering & Drinks; Photography & Videography; Decor & Floral",
          "DJ, Live Band & Sound; Master of Ceremonies (MC); Security & Bouncers",
          "Traditional Attire & Aso-Ebi; Cake & Desserts; Hair & Makeup",
          "Stationery & Calligraphy; Logistics & Coordination; Other",
        ],
      },
      { t: "h2", x: "Status" },
      {
        t: "p",
        x: "A vendor moves through **draft → contracted → confirmed → completed**. Costs and deposits feed the budget weave and the deposits ring on the overview.",
      },
      {
        t: "note",
        tone: "info",
        x: "Vendors are searchable from `⌘K`. The vendor page uses the same desk look as the rest of the app.",
      },
    ],
  },
  {
    slug: "public-page",
    title: "Public page and film",
    group: "hosts",
    audience: "Hosts and planners",
    summary: "The shareable event page, the page editor and the animated film.",
    blocks: [
      { t: "h2", x: "The public event page" },
      {
        t: "p",
        x: "Each celebration can have a public page at `/e/[slug]` with the couple, date, venue, schedule and dress code. It is deliberately light for guests on slow connections (about 1 KB above the baseline). Visibility is a setting: if it is private, the page is not shown.",
      },
      { t: "h2", x: "The page editor" },
      {
        t: "p",
        x: "`/events/[id]/page-editor` edits the words, cover image and details of that page, with a date and time picker placed on the design itself. It has tabs, and on a phone a Back header. Cover pictures are uploaded to a public bucket, so do not upload anything private.",
      },
      { t: "h2", x: "The film" },
      {
        t: "p",
        x: "The marketing site's film ('The Yes') and the per-event film play on a dark velvet stage and finish on the invitation card. The film takes about 2 minutes 41 seconds at normal speed; in Watch mode a speed control sets any pace from 1× to 2×, and the song follows. Its song is **'With You I Say Yes'**, generated by the owner with ElevenLabs. It plays softly under the picture and swells for the dance, and it stops when you leave the tab and carries on when you return. The three files (`music.mp3`, `.m4a`, `.ogg`) live under `public/site/assets/`. If they are missing, a generated Web Audio groove plays instead.",
      },
      {
        t: "note",
        tone: "warn",
        title: "Music licence",
        x: "The licence for generated music depends on the ElevenLabs plan in use. Confirm it before using the track commercially.",
      },
      {
        t: "p",
        x: "The film and three.js are isolated from the app bundle; a CI guard fails the build if three or gsap appear in client chunks (see [Quality and testing](/documentation/testing)).",
      },
    ],
  },
  {
    slug: "connect-ai",
    title: "Connect your AI",
    group: "hosts",
    audience: "Hosts",
    summary:
      "Let Claude or ChatGPT read your celebration and propose changes you approve.",
    blocks: [
      {
        t: "p",
        x: "Open `/connect-ai` for a guided wizard with one-click buttons. Àríyá exposes an MCP server at `/mcp`, secured with OAuth 2.1 through Supabase. An AI app can read, make small edits, and **propose** bigger actions. It can never send, apply or delete on its own.",
      },
      { t: "h2", x: "Steps" },
      {
        t: "ol",
        x: [
          "Open Connect your AI and pick your app (Claude, ChatGPT or another).",
          "Add the server address shown. The app opens a consent screen in Àríyá.",
          "Read the app's trust badge, then Approve.",
          "Ask the app for help. Anything that needs your decision lands on the approvals desk.",
        ],
      },
      { t: "h2", x: "How the consent screen judges an app" },
      {
        t: "table",
        head: ["Tier", "Rule", "What you see"],
        rows: [
          [
            "Known",
            "The redirect address exactly matches a documented vendor callback",
            "A Known app badge and the vendor's name",
          ],
          [
            "Local",
            "`localhost`, `127.0.0.1` or `[::1]`",
            "'An app on your own computer'",
          ],
          [
            "Unknown",
            "Anything else",
            "A red warning and a checkbox you must tick before Approve is enabled",
          ],
        ],
      },
      { t: "h2", x: "What an app can do" },
      {
        t: "table",
        head: ["Kind", "Tools"],
        rows: [
          [
            "Read",
            "`whoami`, `list_events`, `get_event_overview`, `list_guests`, `get_rsvp_summary`, `list_tables_and_seating`, `get_hall_layout`, `get_hall_rules`",
          ],
          [
            "Write (owner or planner)",
            "`create_event`, `update_event`, `add_guest`, `update_guest`, `import_guests`, `update_invitation_design`",
          ],
          [
            "Propose",
            "`propose_send_invitations`, `propose_send_reminders`, `propose_hall_layout`, `propose_seating_plan`, `list_my_proposals`",
          ],
        ],
      },
      { t: "h2", x: "The approvals desk" },
      {
        t: "p",
        x: "`/approvals` lists proposals with a plain-language summary written by the server from counts. You approve or decline each. Approved changes can be **undone for 7 days**. A proposal stays decidable for 7 days.",
      },
      { t: "h2", x: "Limits" },
      {
        t: "table",
        head: ["Limit", "Value"],
        rows: [
          ["Requests per host per minute", "60"],
          ["Celebrations created per day", "10"],
          ["Guests an app token may add per day", "500"],
          ["Proposals raised per day / waiting at once", "50 / 20"],
          ["Rows in one guest import", "200"],
          ["Guests in one send proposal", "25"],
          ["Assignments in one seating proposal", "300"],
          ["Hall layout payload", "64 KB"],
        ],
      },
      {
        t: "note",
        tone: "warn",
        title: "Deliberately not available to AI",
        x: "Sending email, writing the hall or seating directly, applying its own proposal, deleting anything, writing an RSVP, billing, and team or sign-in changes. The database refuses these for an app token even if a tool were added by mistake.",
      },
      {
        t: "p",
        x: "Revoke any app from Connect your AI. Full technical detail is in [AI connections (MCP)](/documentation/mcp).",
      },
    ],
  },
];

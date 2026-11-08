import type { DocPage } from "../types";

export const referencePages: DocPage[] = [
  {
    slug: "routes",
    title: "Routes",
    group: "reference",
    audience: "Everyone",
    summary: "Every page and endpoint, and who can open it.",
    blocks: [
      { t: "h2", x: "Public" },
      {
        t: "table",
        head: ["Route", "What it is"],
        rows: [
          ["`/`, `/film`, `/story`", "The wedding film and story"],
          ["`/about`, `/product`, `/pricing`", "Marketing pages"],
          ["`/documentation`", "This manual"],
          ["`/privacy`, `/terms`", "Legal pages"],
          ["`/e/[slug]`", "A celebration's public page and pass lookup"],
          ["`/i/[token]`", "A guest's personal invitation and RSVP"],
          ["`/invite/[token]`", "Accept a team invitation (sign in first)"],
        ],
      },
      { t: "h2", x: "Account" },
      {
        t: "table",
        head: ["Route", "What it is"],
        rows: [
          [
            "`/sign-in`, `/sign-up`",
            "Email and password, or Continue with Google",
          ],
          ["`/forgot-password`, `/reset-password`", "Password recovery"],
          ["`/auth/callback`", "Finishes OAuth and email-link sign-in"],
          ["`/profile`, `/settings`", "Your details and preferences"],
          [
            "`/connect-ai`, `/approvals`, `/oauth/consent`",
            "AI connection wizard, approvals desk and consent screen",
          ],
        ],
      },
      { t: "h2", x: "A celebration" },
      {
        t: "table",
        head: ["Route", "What it is"],
        rows: [
          ["`/events`, `/events/new`", "Your celebrations, create one"],
          ["`/events/[id]`", "Overview"],
          [
            "`/events/[id]/guests`, `/guests/import`",
            "Guest registry and import",
          ],
          ["`/events/[id]/invitations`", "Send and track invitations"],
          ["`/events/[id]/invitations/design`", "Full-screen designer"],
          [
            "`/events/[id]/seating`, `/seating/print`",
            "Seating studio, printable chart",
          ],
          ["`/events/[id]/check-in`", "Reception desk"],
          [
            "`/events/[id]/checklist`, `/day-of`, `/reminders`",
            "Plan, offline run sheet, reminders",
          ],
          ["`/events/[id]/vendors`", "Vendors"],
          ["`/events/[id]/page-editor`", "Public page editor"],
          [
            "`/events/[id]/team`, `/settings`, `/billing`",
            "Team, settings, payment",
          ],
        ],
      },
      { t: "h2", x: "Endpoints" },
      {
        t: "table",
        head: ["Route", "Used by"],
        rows: [
          ["`/api/webhooks/paystack`", "Paystack (`charge.success`)"],
          ["`/api/cron/reminders`", "Vercel Cron, daily"],
          ["`/api/cron/digest`", "GitHub Actions, weekly"],
          ["`/api/events/[id]/checklist.ics`", "Calendar export"],
          ["`/mcp`, `/.well-known/*`", "AI apps (OAuth 2.1, MCP)"],
        ],
      },
    ],
  },
  {
    slug: "environment",
    title: "Environment variables",
    group: "reference",
    audience: "Developers and operators",
    summary: "Every variable, whether it is required, and the production rule.",
    blocks: [
      {
        t: "p",
        x: "All variables are validated at start-up by Zod (`src/lib/env/server.ts` and `client.ts`). In production the app refuses to boot if a required one is missing or invalid.",
      },
      {
        t: "table",
        head: ["Variable", "Required", "Notes"],
        rows: [
          [
            "`NEXT_PUBLIC_APP_URL`",
            "Yes",
            "Canonical public URL; used in personal links and OAuth metadata",
          ],
          [
            "`NEXT_PUBLIC_SUPABASE_URL`",
            "Yes",
            "`https://<project-ref>.supabase.co`",
          ],
          ["`NEXT_PUBLIC_SUPABASE_ANON_KEY`", "Yes", "Public anon key"],
          [
            "`SUPABASE_SERVICE_ROLE_KEY`",
            "Yes",
            "Server only: rate limits, billing, webhooks, digests",
          ],
          [
            "`PAYSTACK_SECRET_KEY`",
            "Yes",
            "`sk_live_…` (or `sk_test_…` in test mode)",
          ],
          [
            "`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`",
            "Yes",
            "`pk_live_…` (or `pk_test_…`)",
          ],
          [
            "`PAYSTACK_API_BASE`",
            "No",
            "Defaults to `https://api.paystack.co`; must equal it in production",
          ],
          [
            "`EMAIL_TRANSPORT`",
            "Yes",
            "`resend` in production; `mailpit` locally",
          ],
          ["`RESEND_API_KEY`", "Yes", "Starts with `re_`"],
          [
            "`RESEND_FROM_EMAIL`",
            "Yes",
            "A sender your Resend account allows (we use `invitations@ariyaday.com`); no default",
          ],
          [
            "`RATE_LIMIT_SECRET`",
            "Yes",
            "At least 32 characters (`openssl rand -hex 32`)",
          ],
          [
            "`CRON_SECRET`",
            "Yes",
            "Bearer token for `/api/cron/reminders` and `/api/cron/digest`; also a GitHub repository secret",
          ],
          [
            "`MAILPIT_URL`",
            "Local",
            "Ignored in production (default `http://127.0.0.1:57324`)",
          ],
          [
            "`NEXT_PUBLIC_VAPID_PUBLIC_KEY`",
            "Optional",
            "With the private key, switches on web push",
          ],
          ["`VAPID_PRIVATE_KEY`", "Optional", "Server only"],
          [
            "`NEXT_PUBLIC_GOOGLE_SIGN_IN`",
            "Optional",
            "`true` shows Continue with Google; set it only after the provider is enabled in Supabase",
          ],
        ],
      },
      {
        t: "note",
        tone: "warn",
        x: "Never put a secret in a `NEXT_PUBLIC_` variable. Add each new variable to `.env.example` (name only) and to the Zod schema.",
      },
    ],
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    group: "reference",
    audience: "Everyone",
    summary: "Symptoms, causes and fixes.",
    blocks: [
      {
        t: "table",
        head: ["Symptom", "Likely cause", "Fix"],
        rows: [
          [
            "Invitation emails never arrive",
            "Sender domain not verified in Resend (`validation_error` in `email_log`), wrong `RESEND_FROM_EMAIL`, or the daily free cap",
            "Verify the domain, check the variables, send again tomorrow or upgrade the plan",
          ],
          [
            "Only 10 guests were emailed",
            "Bulk send is capped at 10 per click",
            "Click send again for the rest",
          ],
          [
            "'Payment required' when inviting",
            "Over 20 guests on a free event",
            "Pay the Celebration Pass",
          ],
          [
            "No 'Continue with Google' button",
            "`NEXT_PUBLIC_GOOGLE_SIGN_IN` is not `true`",
            "Enable the provider in Supabase, then set the variable and redeploy",
          ],
          [
            "Google sign-in shows a privacy warning",
            "App not published or no privacy/terms links on the consent screen",
            "Publish the app and add `/privacy` and `/terms`",
          ],
          [
            "Guest cannot find their code",
            "Card has no entry seal or the guest has not accepted",
            "Use the code line on the guest page, or search by name at the desk",
          ],
          [
            "Picture upload fails",
            "Over 5 MB or unsupported format",
            "Use a smaller JPEG, PNG or WebP",
          ],
          [
            "Seating studio looks plain, no engine decks",
            "The WebAssembly engine failed to load",
            "Reload; the app falls back to simple geometry",
          ],
          [
            "AI app cannot connect",
            "OAuth server not enabled, dynamic registration off, or Site URL mismatch",
            "Follow the dashboard steps in [AI connections](/documentation/mcp)",
          ],
          [
            "Staff cannot see invoices",
            "By design",
            "Only Owner, Planner and Couple can",
          ],
          [
            "Team invitation link expired",
            "Tokens last 7 days",
            "Send a new one",
          ],
          [
            "App fails to start in production",
            "A required variable is missing or `EMAIL_TRANSPORT=mailpit`",
            "Read the start-up error and fix the variable",
          ],
          [
            "Payment succeeded but event still free",
            "Webhook not configured or not verified",
            "Check the Paystack webhook URL and `charge.success`; the callback page also confirms",
          ],
        ],
      },
      {
        t: "p",
        x: "Still stuck? Write to [help@ariyaday.com](mailto:help@ariyaday.com) with the page, what you did and what you saw.",
      },
    ],
  },
  {
    slug: "roadmap",
    title: "Roadmap and known limits",
    group: "reference",
    audience: "Everyone",
    summary: "What is not built yet, stated plainly.",
    blocks: [
      { t: "h2", x: "Not built yet" },
      {
        t: "table",
        head: ["Item", "State"],
        rows: [
          [
            "Automatic text-message sending (Termii or Africa's Talking)",
            "Planned. Today: copy the link",
          ],
          [
            "Automatic WhatsApp sending (WhatsApp Business API)",
            "Planned. Today: copy the link",
          ],
          [
            "Reminders to guests who have not replied, delivery and bounce status per guest, a different message per guest",
            "Planned",
          ],
          [
            "Design engine phases: picture pipeline, effects, print-ready export",
            "Planned",
          ],
        ],
      },
      { t: "h2", x: "Known limits" },
      {
        t: "ul",
        x: [
          "The invitation email does not embed the designed card; there is no PNG or PDF export for hosts.",
          "The designer lacks multi-select and groups, guides, gradients, more fonts, on-canvas text editing and PDF import. Pictures are capped at 5 MB.",
          "The free Resend plan allows about 100 emails a day.",
          "Cover pictures use a public bucket.",
          "The Content-Security-Policy does not yet restrict scripts or connections.",
          "Guest-facing RSVP and pass pages do not yet use the full desk look of the host screens.",
          "The Vendors, event overview, page editor and Connect AI screens have not had a full visual review since the last redesign.",
          "The film's song licence depends on the ElevenLabs plan used to generate it.",
        ],
      },
      {
        t: "note",
        tone: "info",
        x: "Anything on this list is a decision for the owner before it is built.",
      },
    ],
  },
  {
    slug: "faq",
    title: "FAQ",
    group: "reference",
    audience: "Everyone",
    summary: "Short answers to common questions.",
    blocks: [
      { t: "h2", x: "Guests" },
      {
        t: "ul",
        x: [
          "**Do guests need an app or an account?** No. They open their link in any phone browser.",
          "**What if a guest forwards their link?** Anyone with the link can reply as that guest. Treat it as private.",
        ],
      },
      { t: "h2", x: "Hosts" },
      {
        t: "ul",
        x: [
          "**How much does it cost?** Free up to 20 invited guests, then ₦50,000 per event. No subscription.",
          "**Can planners handle several clients?** Yes. Each client event takes its own pass.",
          "**Can I send on WhatsApp or SMS?** Copy each guest's personal link and paste it; automatic sending is planned.",
          "**What if a table is full?** Àríyá will not seat more people than it has chairs, counting party size.",
          "**Can I bring my own invitation design?** Yes. Import it in the designer and layer on top.",
          "**Can an AI app send invitations for me?** It can only propose; you approve on the approvals desk.",
        ],
      },
      { t: "h2", x: "Owners and engineers" },
      {
        t: "ul",
        x: [
          "**Where is data stored?** Supabase in London.",
          "**Is it ready to use today?** Yes. Check the payment mode shown at checkout before paying.",
          "**Where do I report a problem?** [help@ariyaday.com](mailto:help@ariyaday.com).",
        ],
      },
    ],
  },
];

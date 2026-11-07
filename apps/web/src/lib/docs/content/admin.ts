import type { DocPage } from "../types";

export const adminPages: DocPage[] = [
  {
    slug: "team",
    title: "Roles and team",
    group: "admin",
    audience: "Owners and planners",
    summary:
      "Who can do what, how to invite people, and the rules the database enforces.",
    blocks: [
      { t: "h2", x: "The four roles" },
      {
        t: "table",
        head: [
          "Role",
          "Who",
          "Manage roles",
          "Guests and seating",
          "Check-in",
          "Billing",
        ],
        rows: [
          [
            "Owner",
            "The host who created it",
            "All roles",
            "Yes",
            "Yes",
            "Yes",
          ],
          [
            "Planner",
            "A hired coordinator",
            "Couple and Staff only",
            "Yes",
            "Yes",
            "Yes",
          ],
          [
            "Couple",
            "The celebrants",
            "Read-only",
            "View and overview",
            "View",
            "Yes",
          ],
          [
            "Staff",
            "Reception on the day",
            "None",
            "Read-only registry",
            "Scan and admit",
            "Blocked",
          ],
        ],
      },
      { t: "h2", x: "Inviting a team member" },
      {
        t: "ol",
        x: [
          "Open `/events/[id]/team` and choose a role.",
          "Send the invitation link. It is a random Base62 token (22+ characters) valid for **7 days**.",
          "The person signs in (or signs up) and opens `/invite/<token>` to accept.",
        ],
      },
      { t: "h2", x: "Guarantees the database enforces" },
      {
        t: "ul",
        x: [
          "Nobody can change their own role.",
          "The last owner of a celebration cannot be removed or demoted.",
          "Staff cannot read invoices or payment records (Row Level Security, not just the UI).",
          "Sensitive side effects such as sending email check the caller's role immediately before acting. Being able to read guests is not enough.",
        ],
      },
      {
        t: "note",
        tone: "info",
        x: "Roles control what people can do inside a celebration. Guests are never team members.",
      },
    ],
  },
  {
    slug: "billing",
    title: "Billing and the Celebration Pass",
    group: "admin",
    audience: "Owners and planners",
    summary:
      "Free up to 20 guests; one ₦50,000 pass per larger event, paid through Paystack.",
    blocks: [
      { t: "h2", x: "What is free and what is paid" },
      {
        t: "table",
        head: ["Plan", "Price", "Includes"],
        rows: [
          ["Free", "₦0", "Invite and send to up to 20 guests"],
          [
            "Celebration Pass",
            "₦50,000 per event (5,000,000 kobo)",
            "Unlimited invitations, batch delivery, automated reminders and seating allocations",
          ],
        ],
      },
      {
        t: "p",
        x: "No subscription. Planners pay the same pass per client event. Going over 20 on a free event raises an explicit error (`PAYMENT_REQUIRED`) rather than failing silently.",
      },
      { t: "h2", x: "How a payment works" },
      {
        t: "ol",
        x: [
          "From `/events/[id]/billing` choose to pay. A server action creates a Paystack transaction.",
          "Paystack redirects back to `/events/[id]/billing/callback`.",
          "Paystack also calls `/api/webhooks/paystack` with `charge.success`.",
          "The server checks the signature, asks Paystack again to verify, and records the payment.",
        ],
      },
      { t: "h2", x: "Webhook safeguards" },
      {
        t: "ul",
        x: [
          "Signature: HMAC-SHA512 of the raw body with `PAYSTACK_SECRET_KEY`, compared in constant time (`timingSafeEqual`).",
          "Re-verification: the server calls Paystack's verify endpoint to confirm currency (NGN), exact amount and settlement before trusting the event.",
          "Idempotent: `record_successful_payment` returns early for a reference it has already processed, so retries never double-charge or double-record.",
          "A trigger (`tr_event_protection`) stops a user from marking an event paid themselves.",
          "Staff cannot see any of this.",
        ],
      },
      {
        t: "note",
        tone: "tip",
        title: "Test mode",
        x: "Use `sk_test_` and `pk_test_` keys while testing. Always check the mode shown at checkout before paying. In production the API base must be `https://api.paystack.co`.",
      },
      { t: "h2", x: "Setting up the webhook" },
      {
        t: "p",
        x: "In the Paystack dashboard set the webhook URL to `https://ariya-two.vercel.app/api/webhooks/paystack` (or your own domain) and select `charge.success`.",
      },
    ],
  },
  {
    slug: "security",
    title: "Security model",
    group: "admin",
    audience: "Owners, engineers, reviewers",
    summary:
      "Row Level Security, rate limits, validated uploads, headers and what the audit found.",
    blocks: [
      { t: "h2", x: "Defence in layers" },
      {
        t: "ul",
        x: [
          "**Row Level Security on every table.** New tables get RLS in the same migration. A privilege-audit test (pgTAP `07_privilege_audit`) lists every function an app role may execute, so a new function must be consciously allow-listed.",
          "**Route protection** in `proxy.ts`: public pages bypass the session check; everything else needs a session.",
          "**Server-side role checks** before every privileged action (send, bill, change team).",
          "**Rate limiting** with an atomic database counter, IPs hashed with HMAC-SHA256 (`RATE_LIMIT_SECRET`), service-role execution only, and **fail closed**: if the counter cannot be read, the request is refused.",
          "**Signed webhooks** and re-verification (see [Billing](/documentation/billing)).",
          "**Validated uploads**: type and size are checked server-side; pictures are capped at 5 MB.",
          "**Escaped email**: guest names and event text are escaped or rendered through React Email, never pasted into HTML.",
          "**AI containment**: app tokens are restricted in the database and can only propose (see [Connect your AI](/documentation/connect-ai)).",
        ],
      },
      { t: "h2", x: "The November 2026 audit" },
      {
        t: "p",
        x: "An engineering audit on 5 November 2026 scored the site 65/100 and listed 17 findings (4 high, 11 medium, 2 low). No account takeover, cross-account data access or injection was demonstrated. The high findings were:",
      },
      {
        t: "table",
        head: ["Id", "Finding", "Fix"],
        rows: [
          [
            "S1",
            "Signup could mark an unverified email as verified when mail failed",
            "Leave the account unconfirmed and report a retryable failure",
          ],
          [
            "S2",
            "Push subscriptions accepted any HTTPS URL (blind SSRF)",
            "Allow only supported push-service origins, quotas per user",
          ],
          [
            "S3",
            "Staff could trigger privileged email delivery",
            "Role check immediately before every send",
          ],
          [
            "S4",
            "Single-invitation sender had no resend or daily cap",
            "Reserve per-recipient and per-event allowances before sending",
          ],
        ],
      },
      {
        t: "p",
        x: "The remediation record is `docs/quality-remediation.md` and the full report is `docs/audits/2026-11-05/REPORT.md`. Both are summarised in [Decisions and history](/documentation/decisions).",
      },
      {
        t: "note",
        tone: "warn",
        title: "Known caveats",
        x: "Cover pictures live in a public storage bucket. The Content-Security-Policy currently restricts base, object and framing but does not yet restrict scripts or connections; a nonce-based policy is planned.",
      },
      { t: "h2", x: "Reporting a problem" },
      {
        t: "p",
        x: "Write to [help@ariyaday.com](mailto:help@ariyaday.com).",
      },
    ],
  },
  {
    slug: "privacy-and-data",
    title: "Privacy and your data",
    group: "admin",
    audience: "Hosts, guests",
    summary:
      "What is stored, who processes it, and where the full policies live.",
    blocks: [
      {
        t: "p",
        x: "The full texts are the [Privacy Policy](/privacy) and the [Terms of Service](/terms). This page is the short version.",
      },
      { t: "h2", x: "What we store" },
      {
        t: "ul",
        x: [
          "**Hosts and team**: name, email, a hashed password (or your Google name, email and picture), role, and the events you belong to.",
          "**Event details**: titles, dates, venue, schedule, cover images, invitation designs and uploaded pictures, checklists, vendors, budgets, seating and team.",
          "**Guests** (entered by the host): name, phone, email, party size, side, group, notes, seating and reply details. Arrival is recorded at the door.",
          "**Payments**: references and amounts. Card details go to Paystack, never to Àríyá.",
        ],
      },
      { t: "h2", x: "Who else touches it" },
      {
        t: "table",
        head: ["Service", "Used for"],
        rows: [
          ["Supabase", "Database, sign-in, file storage (London region)"],
          ["Vercel", "Hosting (London region)"],
          ["Resend", "Sending email"],
          ["Paystack", "Taking payment"],
          ["Google", "Optional sign-in"],
        ],
      },
      { t: "h2", x: "Guests' role" },
      {
        t: "p",
        x: "The host decides why guest details are used; Àríyá processes them for the host. A guest who wants their details removed should ask the host or write to [help@ariyaday.com](mailto:help@ariyaday.com).",
      },
    ],
  },
  {
    slug: "email",
    title: "Email and notifications",
    group: "admin",
    audience: "Owners, engineers",
    summary: "Resend setup, the sender address, caps, and push notifications.",
    blocks: [
      { t: "h2", x: "Setting up email" },
      {
        t: "ol",
        x: [
          "Create a Resend account and **verify your domain** (we use `ariyaday.com`). Add the DNS records Resend gives you.",
          "Create an API key (starts with `re_`).",
          "Set `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY` and `RESEND_FROM_EMAIL=invitations@ariyaday.com` in Vercel. There is no default sender.",
          "Redeploy, then send an invitation to yourself to confirm.",
        ],
      },
      {
        t: "note",
        tone: "warn",
        title: "Unverified domain",
        x: "If the domain is not verified Resend rejects the message and `email_log` shows `validation_error`. Using a subdomain such as `mail.ariyaday.com` would need that subdomain verified instead; we start with `ariyaday.com` and will change when more domains are bought.",
      },
      { t: "h2", x: "What gets emailed" },
      {
        t: "table",
        head: ["Message", "When"],
        rows: [
          ["Invitation", "A host sends it (single or bulk)"],
          ["RSVP confirmation", "A guest replies"],
          ["Reminder", "A host sends one, or the daily cron"],
          ["Weekly digest", "Weekly, to each team member, outside quiet hours"],
        ],
      },
      { t: "h2", x: "Caps and safety" },
      {
        t: "ul",
        x: [
          "Bulk invitations: 10 guests per click, 600 ms pause between batches.",
          "Free Resend plan: about 100 emails per day.",
          "Rate limits and per-recipient caps apply to invitations, reminders and confirmations.",
          "Every send is logged in `email_log` with its outcome.",
          "Local development uses Mailpit instead of Resend; production refuses to start with `EMAIL_TRANSPORT=mailpit`.",
        ],
      },
      { t: "h2", x: "Push notifications" },
      {
        t: "p",
        x: "Optional. A signed-in person can switch on web push in Settings or Profile (for example 'a guest replied'). It needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Subscriptions are limited per user and only genuine push-service addresses are accepted.",
      },
      { t: "h2", x: "Settings" },
      {
        t: "p",
        x: "`/settings` holds personal preferences, keyboard shortcuts and notification toggles. `/profile` edits your name and photo.",
      },
    ],
  },
  {
    slug: "mcp",
    title: "AI connections (MCP)",
    group: "admin",
    audience: "Engineers and curious owners",
    summary:
      "The technical reference for the /mcp server, tokens, logging and revoking.",
    blocks: [
      { t: "h2", x: "How it works" },
      {
        t: "p",
        x: "`/mcp` speaks the Model Context Protocol over HTTP. Sign-in uses the Supabase **OAuth 2.1 server**: an app registers, sends the host to `/oauth/consent`, and receives a token that Supabase signs with a `client_id` claim. The database treats any token with that claim as an **app token** and applies stricter policies and daily ceilings.",
      },
      { t: "h2", x: "Request path" },
      {
        t: "ol",
        x: [
          "The proxy lets `/mcp` and `/.well-known/*` through without a cookie round trip (the endpoint uses a bearer token).",
          "The route checks the Origin header, then the token, then a per-host rate limit (60 per minute, fails closed).",
          "A tool runs through the app's own server code with the host's identity, so Row Level Security still applies.",
          "Proposals are written as `ai_proposals`; the host decides in the app.",
        ],
      },
      { t: "h2", x: "Database ceilings for app tokens" },
      {
        t: "p",
        x: "Charged in the database so they hold even for a token pointed straight at the API: 10 celebrations a day, 500 guests a day, 50 proposals a day and 20 waiting at once. A first-party session (no `client_id`) is never charged and cannot insert a proposal at all.",
      },
      { t: "h2", x: "Logging and diagnostics" },
      {
        t: "p",
        x: "Activity is written to `ai_activity_log`. Diagnostic codes explain refusals (for example not an owner or planner, archived event, over a limit). Settings per connection live in `ai_connection_settings`; usage in `ai_quota_usage`.",
      },
      { t: "h2", x: "Supabase dashboard steps" },
      {
        t: "ol",
        x: [
          "Authentication → OAuth Server: enable the OAuth server.",
          "Set the Authorization Path to `/oauth/consent`.",
          "Allow dynamic client registration (Claude.ai and ChatGPT register themselves; without it they cannot connect).",
          "Confirm the Site URL matches `NEXT_PUBLIC_APP_URL`, which the protected-resource metadata is derived from.",
          "Check `curl -s <app>/.well-known/oauth-protected-resource` returns the metadata and `curl -i <app>/mcp` returns 401 with a Bearer challenge.",
        ],
      },
      { t: "h2", x: "Revoking" },
      {
        t: "p",
        x: "A host disconnects an app from Connect your AI. This invalidates its tokens and stops new proposals. Undo of an already-applied proposal is available for 7 days from the approvals desk.",
      },
      {
        t: "note",
        tone: "info",
        x: "The complete, line-by-line reference (trust list, limits table, tool schemas, diagnostics, testing with Claude Code) is `docs/mcp.md` in the repository.",
      },
    ],
  },
];

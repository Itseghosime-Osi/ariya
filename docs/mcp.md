# AI connections (MCP)

Àríyá exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/mcp`. A host
connects Claude Code, Claude.ai, ChatGPT or Codex to it, approves the connection once, and the
assistant can then read their celebrations and make changes — running as that host, under the same
row-level security as the app. There is no second permission model to keep in sync.

An assistant cannot email anyone, write a hall or a seating plan, or get its own work applied. It can
only **propose**, and the host approves or rejects each proposal at `/approvals`. See
[The approvals desk](#the-approvals-desk).

## How it works

1. The app advertises itself as an OAuth 2.1 **protected resource** at
   `/.well-known/oauth-protected-resource` (and the RFC 9728 path-suffixed variant,
   `/.well-known/oauth-protected-resource/mcp`). The document names the endpoint and points at the
   project's Supabase Auth instance as the authorization server.
2. A connector that finds `POST /mcp` returns `401` reads the `WWW-Authenticate` header, discovers
   Supabase Auth, and runs a normal authorization-code + PKCE flow.
3. Supabase sends the host to `/oauth/consent?authorization_id=…`, which shows what the app is
   asking for. Approving returns the app to its own redirect URL with a token.
4. Every call to `/mcp` carries that token as `Authorization: Bearer …`. The route verifies it with
   Supabase Auth, installs a request-scoped database client built around the token, and runs one
   stateless MCP server for that single request.

Nothing about the host's session is cached between requests. A token is not restricted by which
connector issued it: Claude Code, ChatGPT and the host's own password grant all work, provided
Supabase Auth still considers the token valid.

### Request path

| Step                             | Where                                                |
| -------------------------------- | ---------------------------------------------------- |
| Read and verify the bearer token | `src/app/mcp/route.ts`, `src/lib/supabase/bearer.ts` |
| Rate limit the host              | `src/app/mcp/route.ts` via `src/lib/rate-limit.ts`   |
| Bind the client to this request  | `src/lib/supabase/request-context.ts`                |
| Register the tools               | `src/features/mcp/server.ts`                         |
| Gate each call on event role     | `src/features/mcp/guard.ts`                          |
| Wrap results and log the call    | `src/features/mcp/result.ts`                         |

### Origin check

`GET` and `POST /mcp` implement the MCP spec's DNS-rebinding protection. A browser can be pointed at
a name that resolves to an internal address, but it cannot forge the `Origin` header it sends, so an
Origin we do not recognise is refused before the bearer token is even read.

| Request                                                | Answer                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| No `Origin` header                                     | Allowed. Not a browser: CLI clients and server-to-server connectors send none. |
| The app's own origin (`NEXT_PUBLIC_APP_URL`)           | Allowed.                                                                       |
| `https://claude.ai` or `https://chatgpt.com`           | Allowed. Browser-hosted clients.                                               |
| `localhost`, `127.0.0.1` or `[::1]`, any port, http(s) | Allowed. Local clients choose their own port.                                  |
| Anything else, including an empty or malformed header  | `403` — "That Origin is not allowed to call this endpoint."                    |

The request's own origin is deliberately not trusted. Under a rebinding attack the `Host` header
carries the attacker's name, so "same origin as the request" would permit exactly what this check
exists to refuse; the allowlist is the configured `NEXT_PUBLIC_APP_URL`, not the incoming host. The
OAuth discovery endpoints are separate routes, are not subject to this check, and keep working for
connectors that probe them. The implementation is `src/features/mcp/origin.ts`; each row above is a
case in `src/features/mcp/origin.test.ts`.

## Which apps the consent screen trusts

Every authorization request is classified on the server, from the **redirect URI only**. The client
name, logo and homepage are supplied by whoever registered the OAuth client, so an attacker picks
them; the redirect URI is where the host's token actually goes.

| Tier        | Rule                                                                 | What the host sees                                                                                                              |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Known**   | Exact match against the vendors' documented callbacks, below.        | A "Known app" badge, the vendor's name and monogram — never the name or logo the client supplied — and a normal Approve button. |
| **Local**   | `localhost`, `127.0.0.1` or `[::1]` on any port, over http or https. | "An app on your own computer", never the client's own name, and never the word verified.                                        |
| **Unknown** | Everything else, including anything that only looks like a vendor.   | A red warning, no logo, the app's own name cleaned and truncated, the return address, and an approval checkbox.                 |

An unknown app is **warned about, not blocked**. It can still connect, but only after the host ticks
"I understand this app has not been verified by Àríyá…". The browser disables Approve until then, and
`decideConsentAction` classifies again from `getAuthorizationDetails` before approving, so the posted
flag cannot talk it into approving something the server considers unknown.

When a host has already granted these scopes, Supabase hands back a finished redirect instead of an
authorization to decide on, and the host would be sent straight to it. That shortcut is judged the
same way: the code and state are stripped from the redirect, what remains is classified, and only a
**known** or **local** address is followed. An app that was approved before and now points somewhere
unverified stops there — the host is told the address changed and to disconnect it from Connect your
AI and connect again — and approve is never called.

The exact allowlist lives in `src/features/mcp/app-trust.ts`:

| Redirect URI                                            | Vendor  | Source                                                                                                                                   |
| ------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `https://claude.ai/api/mcp/auth_callback`               | Claude  | Claude Docs, _Authentication for connectors_ → Callback URLs                                                                             |
| `https://chatgpt.com/connector_platform_oauth_redirect` | ChatGPT | OpenAI Apps SDK, _Authentication_ → stable redirect URI                                                                                  |
| `https://chatgpt.com/connector/oauth/<callback_id>`     | ChatGPT | Same page: per-connection callbacks. The id is issued per connection, so this one is matched on host and path shape rather than exactly. |

There is no documented `claude.com` OAuth callback, so `claude.com` is not allowlisted. Comparison is
against the normalised URL, so look-alikes all land in **unknown**: `claude.ai.evil.com`,
`evil.com/claude.ai`, `claude.ai@evil.com`, `http://` instead of `https://`, an unexpected port, an
extra path segment, a query or fragment, a trailing dot, and punycode or homoglyph hosts. Each of
those is a case in `src/features/mcp/app-trust.test.ts`.

## Limits

| Limit                                       | Value                            | Where                                 |
| ------------------------------------------- | -------------------------------- | ------------------------------------- |
| Requests per host per minute                | 60 (`MCP_RATE_LIMIT_PER_MINUTE`) | `src/app/mcp/route.ts`                |
| Retry hint on refusal                       | `429` with `Retry-After`         | `src/app/mcp/route.ts`                |
| Celebrations a host may own within 24 hours | 10 (`MAX_EVENTS_PER_DAY`)        | `src/features/mcp/tools/write.ts`     |
| Celebrations one app token may create a day | 10                               | `public.create_event`                 |
| Guests one app token may add a day          | 500                              | trigger `tr_guests_app_token_quota`   |
| Proposals one app token may raise a day     | 50                               | trigger `tr_ai_proposals_quota`       |
| Proposals waiting for approval at once      | 20                               | trigger `tr_ai_proposals_quota`       |
| How long a proposal stays decidable         | 7 days                           | `ai_proposals.expires_at` default     |
| Rows in one guest import                    | 200 (`MAX_IMPORT_ROWS`)          | `src/features/mcp/schemas.ts`         |
| Party size on one invitation                | 20                               | `src/features/mcp/schemas.ts`         |
| Page size on list tools                     | 50 (`MAX_PAGE_SIZE`)             | `src/features/mcp/schemas.ts`         |
| Assignments in one seating proposal         | 300 (`MAX_SEATING_ASSIGNMENTS`)  | `src/features/seating/plan-checks.ts` |
| Size of one hall layout payload             | 64 KB (`MAX_HALL_LAYOUT_BYTES`)  | `src/features/seating/schemas.ts`     |

The per-day ceilings for app tokens are charged by the database, not by the tools, so they hold for
a token pointed straight at PostgREST. They apply only to app tokens: a session without a
`client_id` claim — the app's own forms — is never charged. A first-party session cannot insert a
proposal at all, so the pending ceiling never applies to one.

The rate-limit key is per host (`mcp:<user id>`), shared by every app they have connected. Rate
limiting fails closed: if the counter cannot be read, the request is refused rather than allowed.

## Tools

Read tools need any role the team page can grant (owner, planner, couple, staff). Write tools need
owner or planner.

### Read

| Tool                      | Returns                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `whoami`                  | The `clientId` behind the token and whether the database treats it as an app token.                                                                                                                                                                    |
| `list_events`             | The host's celebrations with guest and RSVP counts. Start here to find an `eventId`.                                                                                                                                                                   |
| `get_event_overview`      | One celebration's details, counts and what needs attention next.                                                                                                                                                                                       |
| `list_guests`             | One page of a guest list, filterable by search, side, group, RSVP status, seating and VIP.                                                                                                                                                             |
| `get_rsvp_summary`        | Headline reply counts only — no guest text.                                                                                                                                                                                                            |
| `list_tables_and_seating` | Every table with its seated guests, the guests still unseated, capacity, party sizes, groups, sides and readiness. No email addresses or phone numbers.                                                                                                |
| `get_hall_layout`         | The current hall — dimensions, spacing, zones, decor, table styles, rotations and chair settings — plus each table's id, name, capacity, shape and position.                                                                                           |
| `get_hall_rules`          | The limits a proposal must respect, practical design guidance (aisles, exits, dance floor, spacing, accessibility) and named starting points — classic, garden, modern, intimate — generated from the same constants the hall designer validates with. |

### Write

| Tool                       | Effect                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `create_event`             | Creates a celebration owned by the host. Subject to the 10-per-24-hours ceiling.                        |
| `update_event`             | Changes title, couple, date, venue, area, dress code, description, status, visibility or RSVP deadline. |
| `add_guest`                | Adds one guest party.                                                                                   |
| `update_guest`             | Changes one guest party; omitted fields keep their stored value.                                        |
| `import_guests`            | Adds up to 200 parties at once. Rows are validated together — one bad row rejects the whole import.     |
| `update_invitation_design` | Sets the invitation theme, headline, subheadline, attire note and personal message.                     |

### Propose

These ask the host a question. None of them sends, and none of them can approve its own request.

| Tool                       | Effect                                                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `propose_send_invitations` | Records a pending proposal to email invitations to up to 25 guests who have no invitation yet and have an email address.                                                                |
| `propose_send_reminders`   | Records a pending proposal to email a reminder to up to 25 guests who have an email address.                                                                                            |
| `propose_hall_layout`      | Records a pending proposal holding a complete room — dimensions, spacing, zones, decor, table styles, and every table's position and rotation — within 64 KB. Kind `apply_hall_layout`. |
| `propose_seating_plan`     | Records a pending proposal seating up to 300 guests. `mode` is `fill_unseated` (the default, which never moves anyone already seated) or `rearrange`. Kind `apply_seating_plan`.        |
| `list_my_proposals`        | Lists what was proposed through this connection, newest first, with its status. Read-only: deciding happens only in Àríyá.                                                              |

Both sending tools answer with the proposal's id, the guest count, `approvalsUrl` (`/approvals`)
and `awaitingApproval` — "Awaiting your approval in Àríyá. Nothing has been sent." A proposal that
would reach nobody (everyone already invited, or no email address) is refused instead of being
recorded, so an empty request never appears on the host's desk.

The two layout tools validate the whole document before inserting, and the desk validates it again
when applying, so a stored payload that no longer fits is skipped rather than trusted. A layout is
refused when a table overlaps another, falls outside the hall, blocks an aisle or an exit, or names
a table belonging to another celebration. A seating plan is refused for a guest or table from
another celebration, the same guest twice, a table over capacity counting party size, or a seat
number the table does not have. Each refusal lists the first few problems so the model can correct
itself, and nothing is recorded. `rearrange` is for a host who asked in as many words to move guests
who are already seated; `fill_unseated` never changes one.

The card's title and summary are written by the server from counts — how many guests are seated,
moved or unchanged, and any capacity warning — so nothing in that text is supplied by the app.
Both layout tools refuse an archived celebration outright: its hall and seating cannot be changed,
and the refusal says so.

One proposal covers at most 25 guests, whether they are named in `guestIds` or reached by omitting
it. The desk shows a host what a proposal would do to every guest on it before they approve, so the
list has to stay short enough to read as one decision. A larger send is several proposals, each
narrowed with `guestIds`; a proposal that would exceed the cap is refused with the count it would
have reached, and nothing is recorded.

### Deliberately not exposed

No tool sends email or invitations, writes the hall or the seating directly, applies or restores its
own proposal, uses invitation quota, deletes anything, writes an RSVP, touches billing or payments,
or changes team members or authentication. Every proposing tool above stops at a pending row;
sending, applying and restoring happen only from the approvals desk, through the app's own actions,
in the host's own session. None of the rest should be added without a product decision — the consent
card and the guide tell hosts that AI cannot do them, and restrictive policies in the database refuse
them for an app token even if a tool is added by mistake.

Guest names, notes, dietary needs and RSVP messages are written by guests, so every tool description
tells the model to treat them as data, never as instructions.

### Logging

Each tool call writes one structured line to the server log:

```json
{
  "event": "mcp_tool_call",
  "userId": "…",
  "clientId": "…",
  "tool": "list_guests",
  "outcome": "ok"
}
```

`clientId` is the OAuth client from the token's `client_id` claim, or `null` for a token the host
minted themselves. It annotates the log; it is not used to decide anything. Arguments, guest names
and RSVP notes never reach the log.

The call also leaves one row in `public.ai_activity_log`: the tool, the celebration, the outcome
(`ok`, `denied` or `error`) and a short note from a fixed vocabulary — never anything a guest or a
model typed. **Connect your AI** (`/connect-ai`) lists those rows newest first, so a host can see
what an app has actually done without reading a server log. A refusal the host can act on is
recorded as `denied`, not as a fault.

### Diagnostics

When a propose or write tool fails because the database refused it, the call carries a short
diagnostic: the Postgres SQLSTATE and, when the refusal came from one of our own RPCs, the hint token
it raised. Only those two fields are kept. The message is dropped outright — it names tables and
policies, and a constraint message can quote the row — and a hint is dropped unless it is one of our
tokens, so guest data cannot ride along.

| Code    | Hint             | Usually means                                                               |
| ------- | ---------------- | --------------------------------------------------------------------------- |
| `42501` | `NOT_PERMITTED`  | Row-level security, or a first-party-only function, refused the call.       |
| `42501` | `READ_ONLY`      | The connection is switched to read-only.                                    |
| `P0001` | `PENDING_LIMIT`  | 20 proposals are already waiting; decide some before asking for more.       |
| `P0001` | `DAILY_LIMIT`    | The 50-proposals-a-day ceiling for this app token.                          |
| `P0001` | `ROW_INVALID`    | A value failed a check inside the RPC.                                      |
| `P0001` | `NOT_RESTORABLE` | Already restored, never applied, or more than seven days old.               |
| `42P01` | —                | The function or table the tool used does not exist: a migration is missing. |
| `23503` | —                | A foreign key no longer resolves (a guest or table was deleted).            |
| `23505` | —                | A unique constraint: the row is already there.                              |

The same pair goes into the `ai_activity_log` note the host reads on Connect your AI, appended to
the fixed phrase — `Proposed a hall layout (42501 NOT_PERMITTED)` — so a missing migration and a
refused policy no longer look identical. `src/features/mcp/diagnostics.ts` does the reduction;
`src/features/mcp/diagnostics.test.ts` covers what it keeps and what it drops.

## The approvals desk

A proposal is a row saying what an app would like to send, in its own words, with the guests it
named. It waits at `/approvals` — reachable from the top bar, which counts only pending proposals
that have not expired — until the host decides. Creating one sends nothing; deciding one is the
only path to the email dispatcher.

| Step    | What happens                                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Propose | A tool inserts a `pending` row with an expiry seven days out. The database refuses the insert unless the token is an app token, the app is in scope for that celebration and the connection is not read-only. |
| Approve | `decide_ai_proposal(uuid, 'approve')` moves `pending → approved`.                                                                                                                                             |
| Apply   | The approvals action re-reads the payload, then sends through the same actions the Invitations and Reminders pages use. `record_ai_proposal_result` moves `approved → applied` or `failed`.                   |
| Reject  | `decide_ai_proposal(uuid, 'reject')` moves `pending → rejected`. Nothing is read back and nothing is sent.                                                                                                    |

Approving is one-shot. The status change is a single `UPDATE` whose `WHERE` clause carries the old
status, so two tabs, a double click and a retry all resolve to exactly one winner; the loser finds
no row and is told the proposal was already decided. `record_ai_proposal_result` accepts only an
`approved` row, so a proposal cannot be applied twice even if the button is somehow pressed twice.

Applying adds no second sending path. Invitations are re-checked against the guest list at apply
time — still exists, still has an email, not invited yet — so a retry skips anyone already emailed.
Reminders go through the batch action, which keeps quota and the 24-hour cap exactly where they
already were. Both can therefore finish as `applied` with nothing sent, and the card says so in
those words rather than "sent to 0 of 8".

A hall layout and a seating plan are applied through the same actions the designer and the seating
page use — `saveHallLayoutAction`, `saveTablePositionsAction` and `bulkAssignSeatsAction` — so there
is no second write path. Applying re-reads the stored payload and re-validates all of it: a table
that has since been deleted, a guest who has left the list, or a room that no longer fits is
dropped, and the card reports what was applied and what was skipped, with the reasons, instead of
claiming everything landed. A `rearrange` plan moves guests who are already seated, so its card says
how many at the top, lists every move and requires a second confirmation before Approve runs.

Applying fails safely. A proposal that cannot finish is recorded as `failed` with a readable reason
and the counts it reached, exactly as a send is.

### Undo

Before a layout or seating proposal is applied, the action writes a snapshot of what is about to
change into the proposal's result: the previous layout and table positions, or the previous seat
assignments of the guests the plan touches. The snapshot is capped at 96 KB; one too large to keep
says so, and that card offers no restore.

For seven days after the decision, the card offers **Restore previous**. It re-applies the snapshot
through the same actions and the same validation, then records `restoredAt` in the result.
`restore_ai_proposal_result(uuid, jsonb)` is the only way to record that: first-party only (an app
token is refused with `42501`), `applied` only, inside the seven-day window, and only once. Every
condition sits in one `UPDATE`'s `WHERE` clause, so a double click and a retry resolve to exactly
one winner; the loser is told the change can no longer be restored.

The app is never named as something it is not. A proposal outlives the redirect URI that could
verify the client, so the card says only what it can prove: **A connected app**, **An app that is no
longer connected**, or — when the grant list itself cannot be read — **An app acting as you**. The
name the app registered is quoted beside that label, cleaned and cut short, and never merged into
it.

## Supabase dashboard steps

These are manual and cannot be checked by CI. Do them once per project, in **Authentication →
OAuth Server**:

1. **Enable the OAuth server.**
2. **Authorization Path:** `/oauth/consent`. This is the page hosts approve an app on.
3. **Allow dynamic client registration.** Claude.ai and ChatGPT register themselves; without this
   they cannot connect.
4. **Confirm the Site URL** matches `NEXT_PUBLIC_APP_URL` for the environment, and that the redirect
   URLs the connectors use are allowed.

Then set `NEXT_PUBLIC_APP_URL` to the deployment's public origin. The protected-resource metadata and
the `WWW-Authenticate` challenge are both derived from it, so a wrong value sends connectors to the
wrong place.

Check the metadata document is reachable before connecting anything:

```bash
curl -s https://your-app.example/.well-known/oauth-protected-resource | jq
curl -i https://your-app.example/mcp   # 401 with a Bearer resource_metadata="…" challenge
```

## Testing with Claude Code

```bash
claude mcp add --transport http ariya https://your-app.example/mcp
```

Then run `/mcp` in Claude Code, choose Àríyá, and approve the connection in the browser window that
opens. Useful first prompts:

- "List my celebrations and tell me which one needs attention."
- "Add a guest called The Adeyemi family, party of four, to my June celebration."
- "How many guests have replied yes so far?"

On a local stack, point it at `http://localhost:3000/mcp` and make sure `supabase start` is running.

### Confirming the database treats the token as an app token

The restrictions above are keyed off the token's `client_id` claim, so they are only in force when
the token was minted by the OAuth server and the database functions in
`20261101000000_mcp_token_lockdown` are applied. `whoami` reports both at once.

After applying that migration, **reconnect Claude Code** so the connection carries a fresh token,
then ask it to call `whoami`. The answer must be:

```json
{
  "clientId": "…",
  "databaseTreatsThisTokenAsApp": true
}
```

If `databaseTreatsThisTokenAsApp` is `false`, the token in use has no `client_id` claim — the
connector is being handed a password-grant or service token rather than one approved on
`/oauth/consent` — and none of the app-token restrictions are being enforced. Disconnect and
reconnect from `/connect-ai`.

## Revoking access

A host revokes from **Connect your AI** (`/connect-ai`), reachable from the account menu. The page
lists every approved app with the date it connected and what it was granted; **Disconnect** confirms
first, then revokes the grant in Supabase Auth. The app's next call is refused.

Revoking in the Supabase dashboard (**Authentication → OAuth Server → grants**) has the same effect.
Disconnecting an app does not delete data it created while connected, and any proposal it left
waiting stays on the desk — the host may still approve it, and the card then says the app is no
longer connected.

## Tests

- Unit: `src/app/mcp/route.test.ts`, `src/features/mcp/{guard,schemas,metadata,result,origin,diagnostics}.test.ts`,
  `src/features/mcp/tools/{read,hall-read,write,proposals,hall-proposals}.test.ts`,
  `src/lib/supabase/request-context.test.ts`, and the consent safety suite:
  `src/features/mcp/app-trust.test.ts` (the classifier and every look-alike),
  `src/features/mcp/consent.test.ts` (the action refuses an unacknowledged unknown app) and
  `src/features/mcp/components/ConsentCard.test.tsx` (all three tiers). `origin.test.ts` covers the
  allowed, blocked and absent `Origin`; `diagnostics.test.ts` covers what a refusal keeps.
- Proposals: `src/features/mcp/tools/proposals.test.ts` mocks every sending path and fails if a
  proposing tool ever reaches one. `src/features/mcp/tools/hall-proposals.test.ts` covers the two
  layout tools — archived, out-of-scope and read-only refusals, guests and tables from another
  celebration, a duplicate guest, an over-capacity table, an oversized payload, overlapping tables,
  tables outside the hall and a blocked aisle. `src/features/approvals/actions.test.ts` covers both
  decisions, the apply-and-record step, the restore and its refusals (double restore included), and
  each failure; `src/features/approvals/previews.test.ts` covers what the card draws, and
  `src/features/approvals/queries.test.ts` covers the feed, the expiry rule, the app labels, the
  badge count, the restore window and the activity list.
- End to end: `e2e/14-mcp.spec.ts` — real password-grant tokens, JSON-RPC over `/mcp`, `whoami`
  reporting such a token as an ordinary session, a second host refused, an oversized import
  rejected, both metadata paths, and the consent screen's signed-out and incomplete-link states.
  `e2e/15-approvals.spec.ts` seeds proposals with the service role and drives the desk itself:
  rejecting without sending, approving once, an overdue proposal shown as expired and uncounted,
  previewing and applying a seating plan, previewing and applying a room and restoring it, a
  rearrange demanding its extra confirmation, and a second restore being refused. It seeds no OAuth
  grant, so the card has to describe the app honestly.

The real OAuth approval step — a connector redirecting the host to `/oauth/consent` and getting a
token back — needs a live Supabase Auth server and a real connector. It is not covered by the suite.

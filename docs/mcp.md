# AI connections (MCP)

Àríyá exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/mcp`. A host
connects Claude Code, Claude.ai, ChatGPT or Codex to it, approves the connection once, and the
assistant can then read their celebrations and make changes — running as that host, under the same
row-level security as the app. There is no second permission model to keep in sync.

The one thing an assistant cannot do is email anyone. It can only **propose** sending, and the host
approves or rejects that proposal at `/approvals`. See [The approvals desk](#the-approvals-desk).

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

| Limit                                       | Value                            | Where                               |
| ------------------------------------------- | -------------------------------- | ----------------------------------- |
| Requests per host per minute                | 60 (`MCP_RATE_LIMIT_PER_MINUTE`) | `src/app/mcp/route.ts`              |
| Retry hint on refusal                       | `429` with `Retry-After`         | `src/app/mcp/route.ts`              |
| Celebrations a host may own within 24 hours | 10 (`MAX_EVENTS_PER_DAY`)        | `src/features/mcp/tools/write.ts`   |
| Celebrations one app token may create a day | 10                               | `public.create_event`               |
| Guests one app token may add a day          | 500                              | trigger `tr_guests_app_token_quota` |
| Proposals one app token may raise a day     | 50                               | trigger `tr_ai_proposals_quota`     |
| Proposals waiting for approval at once      | 20                               | trigger `tr_ai_proposals_quota`     |
| How long a proposal stays decidable         | 7 days                           | `ai_proposals.expires_at` default   |
| Rows in one guest import                    | 200 (`MAX_IMPORT_ROWS`)          | `src/features/mcp/schemas.ts`       |
| Party size on one invitation                | 20                               | `src/features/mcp/schemas.ts`       |
| Page size on list tools                     | 50 (`MAX_PAGE_SIZE`)             | `src/features/mcp/schemas.ts`       |

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

| Tool                      | Returns                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `whoami`                  | The `clientId` behind the token and whether the database treats it as an app token.        |
| `list_events`             | The host's celebrations with guest and RSVP counts. Start here to find an `eventId`.       |
| `get_event_overview`      | One celebration's details, counts and what needs attention next.                           |
| `list_guests`             | One page of a guest list, filterable by search, side, group, RSVP status, seating and VIP. |
| `get_rsvp_summary`        | Headline reply counts only — no guest text.                                                |
| `list_tables_and_seating` | Tables with seated guests, guests still unseated, capacity and readiness.                  |

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

| Tool                       | Effect                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `propose_send_invitations` | Records a pending proposal to email invitations to the guests who have no invitation yet and have an email address.        |
| `propose_send_reminders`   | Records a pending proposal to email a reminder to the guests who have an email address.                                    |
| `list_my_proposals`        | Lists what was proposed through this connection, newest first, with its status. Read-only: deciding happens only in Àríyá. |

Both proposing tools answer with the proposal's id, the guest count, `approvalsUrl` (`/approvals`)
and `awaitingApproval` — "Awaiting your approval in Àríyá. Nothing has been sent." A proposal that
would reach nobody (everyone already invited, or no email address) is refused instead of being
recorded, so an empty request never appears on the host's desk.

### Deliberately not exposed

No tool sends email or invitations, uses invitation quota, deletes anything, writes an RSVP, touches
billing or payments, or changes team members or authentication. The two proposing tools above stop
at a pending row; the send itself happens only from the approvals desk, through the app's own
actions, in the host's own session. None of the rest should be added without a product decision —
the consent card tells hosts that AI cannot do them, and restrictive policies in the database refuse
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

Two proposal kinds — `apply_hall_layout` and `apply_seating_plan` — can be raised but not carried
out yet. The card says Àríyá cannot do this, offers only a rejection, and the action refuses an
approval of either kind before anything is sent.

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

- Unit: `src/app/mcp/route.test.ts`, `src/features/mcp/{guard,schemas,metadata,result}.test.ts`,
  `src/features/mcp/tools/{read,write}.test.ts`, `src/lib/supabase/request-context.test.ts`, and the consent
  safety suite: `src/features/mcp/app-trust.test.ts` (the classifier and every look-alike),
  `src/features/mcp/consent.test.ts` (the action refuses an unacknowledged unknown app) and
  `src/features/mcp/components/ConsentCard.test.tsx` (all three tiers).
- Proposals: `src/features/mcp/tools/proposals.test.ts` mocks every sending path and fails if a
  proposing tool ever reaches one. `src/features/approvals/actions.test.ts` covers both decisions,
  the apply-and-record step, and each refusal; `src/features/approvals/queries.test.ts` covers the
  feed, the expiry rule, the app labels, the badge count and the activity list.
- End to end: `e2e/14-mcp.spec.ts` — real password-grant tokens, JSON-RPC over `/mcp`, `whoami`
  reporting such a token as an ordinary session, a second host refused, an oversized import
  rejected, both metadata paths, and the consent screen's signed-out and incomplete-link states.
  `e2e/15-approvals.spec.ts` seeds proposals with the service role and drives the desk itself:
  rejecting without sending, approving once, an overdue proposal shown as expired and uncounted,
  and a kind the app cannot carry out offering only a rejection. It seeds no OAuth grant, so the
  card has to describe the app honestly.

The real OAuth approval step — a connector redirecting the host to `/oauth/consent` and getting a
token back — needs a live Supabase Auth server and a real connector. It is not covered by the suite.

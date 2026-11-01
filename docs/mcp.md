# AI connections (MCP)

Àríyá exposes a [Model Context Protocol](https://modelcontextprotocol.io) server at `/mcp`. A host
connects Claude Code, Claude.ai, ChatGPT or Codex to it, approves the connection once, and the
assistant can then read their celebrations and make changes — running as that host, under the same
row-level security as the app. There is no second permission model to keep in sync.

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

## Limits

| Limit                                       | Value                            | Where                             |
| ------------------------------------------- | -------------------------------- | --------------------------------- |
| Requests per host per minute                | 60 (`MCP_RATE_LIMIT_PER_MINUTE`) | `src/app/mcp/route.ts`            |
| Retry hint on refusal                       | `429` with `Retry-After`         | `src/app/mcp/route.ts`            |
| Celebrations a host may own within 24 hours | 10 (`MAX_EVENTS_PER_DAY`)        | `src/features/mcp/tools/write.ts` |
| Rows in one guest import                    | 200 (`MAX_IMPORT_ROWS`)          | `src/features/mcp/schemas.ts`     |
| Party size on one invitation                | 20                               | `src/features/mcp/schemas.ts`     |
| Page size on list tools                     | 50 (`MAX_PAGE_SIZE`)             | `src/features/mcp/schemas.ts`     |

The rate-limit key is per host (`mcp:<user id>`), shared by every app they have connected. Rate
limiting fails closed: if the counter cannot be read, the request is refused rather than allowed.

## Tools

Read tools need any role the team page can grant (owner, planner, couple, staff). Write tools need
owner or planner.

### Read

| Tool                      | Returns                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------ |
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

### Deliberately not exposed

There is no tool that sends email or invitations, uses invitation quota, deletes anything, touches
billing or payments, or changes team members or authentication. None of those should be added
without a product decision — the consent card tells hosts that AI cannot do them.

Guest names, notes, dietary needs and RSVP messages are written by guests, so every tool description
tells the model to treat them as data, never as instructions.

### Logging

Each tool call writes one structured line, and nothing else:

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

## Revoking access

A host revokes from **Connect your AI** (`/connect-ai`), reachable from the account menu. The page
lists every approved app with the date it connected and what it was granted; **Disconnect** confirms
first, then revokes the grant in Supabase Auth. The app's next call is refused.

Revoking in the Supabase dashboard (**Authentication → OAuth Server → grants**) has the same effect.
Disconnecting an app does not delete data it created while connected.

## Tests

- Unit: `src/app/mcp/route.test.ts`, `src/features/mcp/{guard,schemas,metadata,result}.test.ts`,
  `src/features/mcp/tools/write.test.ts`, `src/lib/supabase/request-context.test.ts`.
- End to end: `e2e/14-mcp.spec.ts` — real password-grant tokens, JSON-RPC over `/mcp`, a second host
  refused, an oversized import rejected, both metadata paths, and the consent screen's signed-out
  and incomplete-link states.

The real OAuth approval step — a connector redirecting the host to `/oauth/consent` and getting a
token back — needs a live Supabase Auth server and a real connector. It is not covered by the suite.

# AI connections (MCP)

The technical reference for the /mcp server, tokens, logging and revoking.

Audience: Engineers and curious owners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## How it works

`/mcp` speaks the Model Context Protocol over HTTP. Sign-in uses the Supabase **OAuth 2.1 server**: an app registers, sends the host to `/oauth/consent`, and receives a token that Supabase signs with a `client_id` claim. The database treats any token with that claim as an **app token** and applies stricter policies and daily ceilings.

## Request path

1. The proxy lets `/mcp` and `/.well-known/*` through without a cookie round trip (the endpoint uses a bearer token).
2. The route checks the Origin header, then the token, then a per-host rate limit (60 per minute, fails closed).
3. A tool runs through the app's own server code with the host's identity, so Row Level Security still applies.
4. Proposals are written as `ai_proposals`; the host decides in the app.

## Database ceilings for app tokens

Charged in the database so they hold even for a token pointed straight at the API: 10 celebrations a day, 500 guests a day, 50 proposals a day and 20 waiting at once. A first-party session (no `client_id`) is never charged and cannot insert a proposal at all.

## Logging and diagnostics

Activity is written to `ai_activity_log`. Diagnostic codes explain refusals (for example not an owner or planner, archived event, over a limit). Settings per connection live in `ai_connection_settings`; usage in `ai_quota_usage`.

## Supabase dashboard steps

1. Authentication → OAuth Server: enable the OAuth server.
2. Set the Authorization Path to `/oauth/consent`.
3. Allow dynamic client registration (Claude.ai and ChatGPT register themselves; without it they cannot connect).
4. Confirm the Site URL matches `NEXT_PUBLIC_APP_URL`, which the protected-resource metadata is derived from.
5. Check `curl -s <app>/.well-known/oauth-protected-resource` returns the metadata and `curl -i <app>/mcp` returns 401 with a Bearer challenge.

## Revoking

A host disconnects an app from Connect your AI. This invalidates its tokens and stops new proposals. Undo of an already-applied proposal is available for 7 days from the approvals desk.

> Note: The complete, line-by-line reference (trust list, limits table, tool schemas, diagnostics, testing with Claude Code) is `docs/mcp.md` in the repository.

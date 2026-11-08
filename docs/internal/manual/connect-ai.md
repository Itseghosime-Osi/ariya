# Connect your AI

Let Claude or ChatGPT read your celebration and propose changes you approve.

Audience: Hosts

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

Open `/connect-ai` for a guided wizard with one-click buttons. Àríyá exposes an MCP server at `/mcp`, secured with OAuth 2.1 through Supabase. An AI app can read, make small edits, and **propose** bigger actions. It can never send, apply or delete on its own.

## Steps

1. Open Connect your AI and pick your app (Claude, ChatGPT or another).
2. Add the server address shown. The app opens a consent screen in Àríyá.
3. Read the app's trust badge, then Approve.
4. Ask the app for help. Anything that needs your decision lands on the approvals desk.

## How the consent screen judges an app

| Tier    | Rule                                                              | What you see                                                         |
| ------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| Known   | The redirect address exactly matches a documented vendor callback | A Known app badge and the vendor's name                              |
| Local   | `localhost`, `127.0.0.1` or `[::1]`                               | 'An app on your own computer'                                        |
| Unknown | Anything else                                                     | A red warning and a checkbox you must tick before Approve is enabled |

## What an app can do

| Kind                     | Tools                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Read                     | `whoami`, `list_events`, `get_event_overview`, `list_guests`, `get_rsvp_summary`, `list_tables_and_seating`, `get_hall_layout`, `get_hall_rules` |
| Write (owner or planner) | `create_event`, `update_event`, `add_guest`, `update_guest`, `import_guests`, `update_invitation_design`                                         |
| Propose                  | `propose_send_invitations`, `propose_send_reminders`, `propose_hall_layout`, `propose_seating_plan`, `list_my_proposals`                         |

## The approvals desk

`/approvals` lists proposals with a plain-language summary written by the server from counts. You approve or decline each. Approved changes can be **undone for 7 days**. A proposal stays decidable for 7 days.

## Limits

| Limit                                      | Value   |
| ------------------------------------------ | ------- |
| Requests per host per minute               | 60      |
| Celebrations created per day               | 10      |
| Guests an app token may add per day        | 500     |
| Proposals raised per day / waiting at once | 50 / 20 |
| Rows in one guest import                   | 200     |
| Guests in one send proposal                | 25      |
| Assignments in one seating proposal        | 300     |
| Hall layout payload                        | 64 KB   |

> Deliberately not available to AI: Sending email, writing the hall or seating directly, applying its own proposal, deleting anything, writing an RSVP, billing, and team or sign-in changes. The database refuses these for an app token even if a tool were added by mistake.

Revoke any app from Connect your AI. Full technical detail is in [AI connections (MCP)](mcp.md).

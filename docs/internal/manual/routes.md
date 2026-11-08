# Routes

Every page and endpoint, and who can open it.

Audience: Everyone

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Public

| Route                            | What it is                                  |
| -------------------------------- | ------------------------------------------- |
| `/`, `/film`, `/story`           | The wedding film and story                  |
| `/about`, `/product`, `/pricing` | Marketing pages                             |
| `/documentation`                 | This manual                                 |
| `/privacy`, `/terms`             | Legal pages                                 |
| `/e/[slug]`                      | A celebration's public page and pass lookup |
| `/i/[token]`                     | A guest's personal invitation and RSVP      |
| `/invite/[token]`                | Accept a team invitation (sign in first)    |

## Account

| Route                                         | What it is                                              |
| --------------------------------------------- | ------------------------------------------------------- |
| `/sign-in`, `/sign-up`                        | Email and password, or Continue with Google             |
| `/forgot-password`, `/reset-password`         | Password recovery                                       |
| `/auth/callback`                              | Finishes OAuth and email-link sign-in                   |
| `/profile`, `/settings`                       | Your details and preferences                            |
| `/connect-ai`, `/approvals`, `/oauth/consent` | AI connection wizard, approvals desk and consent screen |

## A celebration

| Route                                             | What it is                         |
| ------------------------------------------------- | ---------------------------------- |
| `/events`, `/events/new`                          | Your celebrations, create one      |
| `/events/[id]`                                    | Overview                           |
| `/events/[id]/guests`, `/guests/import`           | Guest registry and import          |
| `/events/[id]/invitations`                        | Send and track invitations         |
| `/events/[id]/invitations/design`                 | Full-screen designer               |
| `/events/[id]/seating`, `/seating/print`          | Seating studio, printable chart    |
| `/events/[id]/check-in`                           | Reception desk                     |
| `/events/[id]/checklist`, `/day-of`, `/reminders` | Plan, offline run sheet, reminders |
| `/events/[id]/vendors`                            | Vendors                            |
| `/events/[id]/page-editor`                        | Public page editor                 |
| `/events/[id]/team`, `/settings`, `/billing`      | Team, settings, payment            |

## Endpoints

| Route                            | Used by                     |
| -------------------------------- | --------------------------- |
| `/api/webhooks/paystack`         | Paystack (`charge.success`) |
| `/api/cron/reminders`            | Vercel Cron, daily          |
| `/api/cron/digest`               | GitHub Actions, weekly      |
| `/api/events/[id]/checklist.ics` | Calendar export             |
| `/mcp`, `/.well-known/*`         | AI apps (OAuth 2.1, MCP)    |

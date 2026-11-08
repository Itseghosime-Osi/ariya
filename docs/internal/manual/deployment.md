# Deploying

Vercel, Supabase, DNS, cron jobs and the one-time dashboard steps.

Audience: Developers and operators

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Where things run

| Part                    | Service                                                        | Region               |
| ----------------------- | -------------------------------------------------------------- | -------------------- |
| App                     | Vercel (project `ariya`, live at https://ariya-two.vercel.app) | London `lhr1`        |
| Database, auth, storage | Supabase                                                       | London (`eu-west-2`) |
| Email                   | Resend (sender domain `ariyaday.com`)                          |                      |
| Payments                | Paystack                                                       |                      |

Matching regions keeps database, sign-in and webhook round trips short.

## Release flow

1. Work on a short-lived branch, open a pull request.
2. CI must pass (see [Quality and testing](testing.md)) and the owner approves.
3. Merging to `main` deploys production on Vercel.
4. Database migrations are applied to the hosted project deliberately (never edit one that has shipped).

## Scheduled jobs

| Job                   | Where                              | When           |
| --------------------- | ---------------------------------- | -------------- |
| `/api/cron/reminders` | Vercel Cron (`vercel.json`)        | Daily at 09:00 |
| `/api/cron/digest`    | GitHub Actions (`cron-digest.yml`) | Weekly         |

Both authenticate with `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` in Vercel and as a GitHub repository secret.

## One-time dashboard steps

- **Supabase Auth**: Site URL and redirect URLs for your domain; Google provider with client ID and secret; the OAuth Server settings in [AI connections](mcp.md).
- **Google Cloud**: OAuth client with the Supabase callback URL; consent screen with `https://ariyaday.com/privacy` and `/terms`; publish the app so any user can sign in.
- **Vercel**: all variables in [Environment variables](environment.md), including `NEXT_PUBLIC_GOOGLE_SIGN_IN=true` once Google is enabled.
- **Resend**: verify the domain and add the API key.
- **Paystack**: webhook URL `https://<your-domain>/api/webhooks/paystack`, event `charge.success`.
- **Mailbox**: create `help@ariyaday.com`, the contact on the legal pages.

> Note: The app refuses to boot in production if a required variable is missing or invalid, for example `EMAIL_TRANSPORT=mailpit`. The check is `src/lib/env/server.ts` and `client.ts`.

# Environment variables

Every variable, whether it is required, and the production rule.

Audience: Developers and operators

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

All variables are validated at start-up by Zod (`src/lib/env/server.ts` and `client.ts`). In production the app refuses to boot if a required one is missing or invalid.

| Variable                          | Required | Notes                                                                                          |
| --------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`             | Yes      | Canonical public URL; used in personal links and OAuth metadata                                |
| `NEXT_PUBLIC_SUPABASE_URL`        | Yes      | `https://<project-ref>.supabase.co`                                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Yes      | Public anon key                                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`       | Yes      | Server only: rate limits, billing, webhooks, digests                                           |
| `PAYSTACK_SECRET_KEY`             | Yes      | `sk_live_…` (or `sk_test_…` in test mode)                                                      |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Yes      | `pk_live_…` (or `pk_test_…`)                                                                   |
| `PAYSTACK_API_BASE`               | No       | Defaults to `https://api.paystack.co`; must equal it in production                             |
| `EMAIL_TRANSPORT`                 | Yes      | `resend` in production; `mailpit` locally                                                      |
| `RESEND_API_KEY`                  | Yes      | Starts with `re_`                                                                              |
| `RESEND_FROM_EMAIL`               | Yes      | A sender your Resend account allows (we use `invitations@ariyaday.com`); no default            |
| `RATE_LIMIT_SECRET`               | Yes      | At least 32 characters (`openssl rand -hex 32`)                                                |
| `CRON_SECRET`                     | Yes      | Bearer token for `/api/cron/reminders` and `/api/cron/digest`; also a GitHub repository secret |
| `MAILPIT_URL`                     | Local    | Ignored in production (default `http://127.0.0.1:57324`)                                       |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`    | Optional | With the private key, switches on web push                                                     |
| `VAPID_PRIVATE_KEY`               | Optional | Server only                                                                                    |
| `NEXT_PUBLIC_GOOGLE_SIGN_IN`      | Optional | `true` shows Continue with Google; set it only after the provider is enabled in Supabase       |

> Note: Never put a secret in a `NEXT_PUBLIC_` variable. Add each new variable to `.env.example` (name only) and to the Zod schema.

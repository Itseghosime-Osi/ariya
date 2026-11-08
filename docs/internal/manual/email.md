# Email and notifications

Resend setup, the sender address, caps, and push notifications.

Audience: Owners, engineers

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## Setting up email

1. Create a Resend account and **verify your domain** (we use `ariyaday.com`). Add the DNS records Resend gives you.
2. Create an API key (starts with `re_`).
3. Set `EMAIL_TRANSPORT=resend`, `RESEND_API_KEY` and `RESEND_FROM_EMAIL=invitations@ariyaday.com` in Vercel. There is no default sender.
4. Redeploy, then send an invitation to yourself to confirm.

> Unverified domain: If the domain is not verified Resend rejects the message and `email_log` shows `validation_error`. Using a subdomain such as `mail.ariyaday.com` would need that subdomain verified instead; we start with `ariyaday.com` and will change when more domains are bought.

## What gets emailed

| Message           | When                                             |
| ----------------- | ------------------------------------------------ |
| Invitation        | A host sends it (single or bulk)                 |
| RSVP confirmation | A guest replies                                  |
| Reminder          | A host sends one, or the daily cron              |
| Weekly digest     | Weekly, to each team member, outside quiet hours |

## Caps and safety

- Bulk invitations: 10 guests per click, 600 ms pause between batches.
- Free Resend plan: about 100 emails per day.
- Rate limits and per-recipient caps apply to invitations, reminders and confirmations.
- Every send is logged in `email_log` with its outcome.
- Local development uses Mailpit instead of Resend; production refuses to start with `EMAIL_TRANSPORT=mailpit`.

## Push notifications

Optional. A signed-in person can switch on web push in Settings or Profile (for example 'a guest replied'). It needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Subscriptions are limited per user and only genuine push-service addresses are accepted.

## Settings

`/settings` holds personal preferences, keyboard shortcuts and notification toggles. `/profile` edits your name and photo.

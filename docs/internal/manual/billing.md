# Billing and the Celebration Pass

Free up to 20 guests; one ₦50,000 pass per larger event, paid through Paystack.

Audience: Owners and planners

> Archived from the former public manual. Internal reference only; content reflects the product at the time it was archived.

## What is free and what is paid

| Plan             | Price                              | Includes                                                                           |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| Free             | ₦0                                 | Invite and send to up to 20 guests                                                 |
| Celebration Pass | ₦50,000 per event (5,000,000 kobo) | Unlimited invitations, batch delivery, automated reminders and seating allocations |

No subscription. Planners pay the same pass per client event. Going over 20 on a free event raises an explicit error (`PAYMENT_REQUIRED`) rather than failing silently.

## How a payment works

1. From `/events/[id]/billing` choose to pay. A server action creates a Paystack transaction.
2. Paystack redirects back to `/events/[id]/billing/callback`.
3. Paystack also calls `/api/webhooks/paystack` with `charge.success`.
4. The server checks the signature, asks Paystack again to verify, and records the payment.

## Webhook safeguards

- Signature: HMAC-SHA512 of the raw body with `PAYSTACK_SECRET_KEY`, compared in constant time (`timingSafeEqual`).
- Re-verification: the server calls Paystack's verify endpoint to confirm currency (NGN), exact amount and settlement before trusting the event.
- Idempotent: `record_successful_payment` returns early for a reference it has already processed, so retries never double-charge or double-record.
- A trigger (`tr_event_protection`) stops a user from marking an event paid themselves.
- Staff cannot see any of this.

> Test mode: Use `sk_test_` and `pk_test_` keys while testing. Always check the mode shown at checkout before paying. In production the API base must be `https://api.paystack.co`.

## Setting up the webhook

In the Paystack dashboard set the webhook URL to `https://ariya-two.vercel.app/api/webhooks/paystack` (or your own domain) and select `charge.success`.

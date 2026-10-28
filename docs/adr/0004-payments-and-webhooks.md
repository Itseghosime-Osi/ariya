# ADR 0004: Payment Architecture & Webhook Verification

## Status

Accepted

## Context

Àríyá charges a flat fee of ₦50,000 (5,000,000 kobo) for the Royal Celebration Pass, which unlocks unlimited guest invitations, automated reminders, and multi-table banquet seating. Because payment status unlocks critical database quotas, the payment flow must be impervious to client-side manipulation, network replay, and webhook spoofing.

## Decision

1. **Server-Side Initialization Only**:
   - `initializePaymentAction` creates a pending record in `public.payments` with a cryptographically secure reference (`ary_ref_${UUID}`).
   - The transaction is initialized directly with Paystack API (`POST /transaction/initialize`) from the server.
   - Payer email, amount (₦50,000), and callback URL are strictly enforced from server configuration, never accepted from client input.
2. **Idempotent Dual-Channel Confirmation (`confirmPayment`)**:
   - A single unified server function `confirmPayment(reference, verifyResult)` handles payment finalization.
   - Used by both the callback page (`/events/[id]/billing/callback`) and the webhook handler (`/api/webhooks/paystack`).
   - Re-verifies payment status with Paystack (`GET /transaction/verify/:reference`), validating currency (`NGN`), exact amount (5,000,000 kobo), and success status.
3. **Constant-Time Webhook Authentication**:
   - Webhook payloads must include `x-paystack-signature`.
   - The signature is calculated as `HMAC-SHA512(rawPayload, PAYSTACK_SECRET_KEY)`.
   - Compared using `crypto.timingSafeEqual` to eliminate timing attack vectors.
4. **Service-Role Database Unlock**:
   - `record_successful_payment` RPC is granted strictly to `service_role`.
   - Database trigger `tr_event_protection` rejects any modification to `events.paid_at` unless the caller is `service_role`.
   - Replay webhooks return `{ status: 'already_processed' }` idempotently without side effects.

## Consequences

- **Positive**: Zero risk of fraudulent payment bypass; full transaction idempotency and auditing.
- **Negative**: Requires secure server secret management for `PAYSTACK_SECRET_KEY` and reachable webhook endpoints.

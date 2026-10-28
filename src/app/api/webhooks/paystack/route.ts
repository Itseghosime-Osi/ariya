import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env/server";
import {
  verifyPaystackWebhookSignature,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import { confirmPayment } from "@/features/billing/confirm-payment";

export async function POST(request: Request) {
  const signature = request.headers.get("x-paystack-signature");
  const rawBody = await request.text();

  // 1. Verify webhook signature with constant-time HMAC-SHA512
  const isValid = verifyPaystackWebhookSignature(
    rawBody,
    signature,
    serverEnv.PAYSTACK_SECRET_KEY
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let eventPayload: {
    event?: string;
    data?: {
      reference?: string;
    };
  };

  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  if (eventPayload.event !== "charge.success") {
    return NextResponse.json(
      { received: true, ignored: true },
      { status: 200 }
    );
  }

  const reference = eventPayload.data?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // 2. Re-verify transaction with Paystack verify endpoint
  const verifyResult = await verifyPaystackTransaction(
    reference,
    serverEnv.PAYSTACK_SECRET_KEY,
    serverEnv.PAYSTACK_API_BASE
  );

  // 3. Confirm payment record and idempotently unlock celebration pass
  const confirmation = await confirmPayment(reference, verifyResult);

  if (!confirmation.success) {
    if (confirmation.ignored) {
      return NextResponse.json(
        { received: true, ignored: true },
        { status: 200 }
      );
    }
    return NextResponse.json(
      { error: confirmation.error },
      { status: confirmation.status }
    );
  }

  return NextResponse.json({
    received: true,
    result: confirmation.result,
  });
}

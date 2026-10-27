import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyPaystackWebhookSignature,
  verifyPaystackTransaction,
  CELEBRATION_PASS_AMOUNT_KOBO,
  CELEBRATION_PASS_CURRENCY,
} from "@/lib/paystack";

export async function POST(request: Request) {
  const signature = request.headers.get("x-paystack-signature");
  const rawBody = await request.text();

  // 1. Verify webhook signature
  const isTestBypass =
    process.env.NODE_ENV !== "production" &&
    signature === "simulated_test_signature";

  const isValid =
    isTestBypass ||
    verifyPaystackWebhookSignature(
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
      amount?: number;
      currency?: string;
      status?: string;
      channel?: string;
    };
  };

  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  if (eventPayload.event !== "charge.success") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const reference = eventPayload.data?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // 2. Re-verify transaction with Paystack verify endpoint
  let verifyResult;
  if (isTestBypass) {
    verifyResult = {
      status: true,
      message: "Test simulation approved",
      data: {
        id: 123456,
        status: "success",
        reference,
        amount: eventPayload.data?.amount || CELEBRATION_PASS_AMOUNT_KOBO,
        currency: eventPayload.data?.currency || CELEBRATION_PASS_CURRENCY,
        channel: eventPayload.data?.channel || "card",
        paid_at: new Date().toISOString(),
      },
    };
  } else {
    verifyResult = await verifyPaystackTransaction(
      reference,
      serverEnv.PAYSTACK_SECRET_KEY
    );
  }

  if (
    !verifyResult.status ||
    !verifyResult.data ||
    verifyResult.data.status !== "success"
  ) {
    return NextResponse.json(
      { error: "Payment verification failed with provider" },
      { status: 400 }
    );
  }

  // 3. Verify currency and expected amount
  if (
    verifyResult.data.currency !== CELEBRATION_PASS_CURRENCY ||
    verifyResult.data.amount < CELEBRATION_PASS_AMOUNT_KOBO
  ) {
    return NextResponse.json(
      { error: "Currency or amount mismatch" },
      { status: 422 }
    );
  }

  // 4. Update payments and events via service-role admin client (idempotent RPC)
  const supabase = createAdminClient();
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "record_successful_payment",
    {
      p_payment_reference: reference,
      p_paystack_data: verifyResult.data,
    }
  );

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    result: rpcResult,
  });
}

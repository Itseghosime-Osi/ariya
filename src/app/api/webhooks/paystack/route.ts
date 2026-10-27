import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyPaystackWebhookSignature,
  verifyPaystackTransaction,
  CELEBRATION_PASS_CURRENCY,
} from "@/lib/paystack";

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
    return NextResponse.json(
      { received: true, ignored: true },
      { status: 200 }
    );
  }

  const reference = eventPayload.data?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  // 2. Fetch our payments row for this reference
  const supabase = createAdminClient();
  const { data: payment, error: fetchErr } = await supabase
    .from("payments")
    .select("id, event_id, amount_kobo, status")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (fetchErr) {
    console.error("[Paystack Webhook] DB error querying payment:", fetchErr);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  if (!payment) {
    console.warn(`[Paystack Webhook] Ignored unknown reference: ${reference}`);
    return NextResponse.json(
      { received: true, ignored: true },
      { status: 200 }
    );
  }

  // 3. Re-verify transaction with Paystack verify endpoint
  const verifyResult = await verifyPaystackTransaction(
    reference,
    serverEnv.PAYSTACK_SECRET_KEY,
    serverEnv.PAYSTACK_API_BASE
  );

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

  // 4. Exact match checks on provider verification data
  if (
    verifyResult.data.reference !== reference ||
    verifyResult.data.currency !== CELEBRATION_PASS_CURRENCY ||
    verifyResult.data.amount !== payment.amount_kobo
  ) {
    return NextResponse.json(
      { error: "Payment verification attributes mismatch" },
      { status: 422 }
    );
  }

  // 5. Update payments and events via service-role admin client
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "record_successful_payment",
    {
      p_payment_reference: reference,
      p_paystack_data: verifyResult.data,
    }
  );

  if (rpcError) {
    console.error("[Paystack Webhook] DB error recording payment:", rpcError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    received: true,
    result: rpcResult,
  });
}

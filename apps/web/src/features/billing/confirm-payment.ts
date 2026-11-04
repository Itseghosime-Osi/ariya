import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type PaystackVerifyResult,
  CELEBRATION_PASS_CURRENCY,
} from "@/lib/paystack";

export interface ConfirmPaymentResult {
  success: boolean;
  status: 200 | 400 | 404 | 422 | 500;
  error?: string;
  ignored?: boolean;
  notFound?: boolean;
  eventId?: string;
  result?: unknown;
}

/**
 * Validates provider transaction details against the stored payment record
 * and idempotently records the successful payment via service_role RPC.
 */
export async function confirmPayment(
  reference: string,
  verifyResult: PaystackVerifyResult
): Promise<ConfirmPaymentResult> {
  const supabase = createAdminClient();

  // 1. Fetch our payment record for this reference
  const { data: payment, error: fetchErr } = await supabase
    .from("payments")
    .select("id, event_id, amount_kobo, status")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (fetchErr) {
    console.error("[confirmPayment] DB error querying payment:", fetchErr);
    return {
      success: false,
      status: 500,
      error: "Internal server error",
    };
  }

  if (!payment) {
    console.warn(`[confirmPayment] Unknown payment reference: ${reference}`);
    return {
      success: false,
      status: 200,
      ignored: true,
      notFound: true,
      error: "Unknown reference",
    };
  }

  // 2. Provider verification validation
  if (
    !verifyResult.status ||
    !verifyResult.data ||
    verifyResult.data.status !== "success"
  ) {
    return {
      success: false,
      status: 400,
      error: "Payment verification failed with provider",
    };
  }

  // 3. Exact match checks on provider verification data
  if (
    verifyResult.data.reference !== reference ||
    verifyResult.data.currency !== CELEBRATION_PASS_CURRENCY ||
    verifyResult.data.amount !== payment.amount_kobo
  ) {
    return {
      success: false,
      status: 422,
      error: "Payment verification attributes mismatch",
    };
  }

  // 4. Update payments and events via service-role admin client
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "record_successful_payment",
    {
      p_payment_reference: reference,
      p_paystack_data: verifyResult.data,
    }
  );

  if (rpcError) {
    console.error("[confirmPayment] DB error recording payment:", rpcError);
    return {
      success: false,
      status: 500,
      error: "Internal server error",
    };
  }

  return {
    success: true,
    status: 200,
    eventId: payment.event_id,
    result: rpcResult,
  };
}

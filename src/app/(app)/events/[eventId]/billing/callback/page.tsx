import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import {
  verifyPaystackTransaction,
  CELEBRATION_PASS_CURRENCY,
} from "@/lib/paystack";
import { Icon } from "@/components/ui/icon";

interface BillingCallbackPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}

export default async function BillingCallbackPage({
  params,
  searchParams,
}: BillingCallbackPageProps) {
  const { eventId } = await params;
  const sp = await searchParams;
  const reference = sp.reference || sp.trxref;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?redirectTo=/events/${eventId}/billing`);
  }

  // Verify membership
  const { data: member } = await supabase
    .from("event_members")
    .select("role")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || (member.role !== "owner" && member.role !== "planner")) {
    notFound();
  }

  let paymentStatus: "success" | "pending" | "failed" = "pending";

  if (reference) {
    const adminClient = createAdminClient();
    const { data: payment } = await adminClient
      .from("payments")
      .select("id, status, amount_kobo, paid_at")
      .eq("paystack_reference", reference)
      .eq("event_id", eventId)
      .maybeSingle();

    if (payment) {
      paymentStatus = payment.status as "success" | "pending" | "failed";

      // If pending, trigger a server-side verify fallback
      if (paymentStatus === "pending") {
        try {
          const verifyResult = await verifyPaystackTransaction(
            reference,
            serverEnv.PAYSTACK_SECRET_KEY,
            serverEnv.PAYSTACK_API_BASE
          );

          if (
            verifyResult.status &&
            verifyResult.data &&
            verifyResult.data.status === "success" &&
            verifyResult.data.reference === reference &&
            verifyResult.data.currency === CELEBRATION_PASS_CURRENCY &&
            verifyResult.data.amount === payment.amount_kobo
          ) {
            await adminClient.rpc("record_successful_payment", {
              p_payment_reference: reference,
              p_paystack_data: verifyResult.data,
            });
            paymentStatus = "success";
          }
        } catch (err) {
          console.warn("[Billing Callback] Provider verify error:", err);
        }
      }
    } else {
      paymentStatus = "failed";
    }
  } else {
    paymentStatus = "failed";
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-8 text-center space-y-6 shadow-sm">
        {paymentStatus === "success" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <Icon name="check_circle" className="text-3xl" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-night">
                Payment Confirmed!
              </h1>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                Your celebration pass is now active. You have unlocked unlimited
                guest invitations, automated reminders, and complete seating
                orchestration.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/events/${eventId}`}
                className="py-3 px-6 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all shadow-sm"
              >
                Go to Celebration Desk
              </Link>
              <Link
                href={`/events/${eventId}/billing`}
                className="py-3 px-6 rounded-xl border border-outline-variant/60 text-xs font-medium text-stone-700 hover:text-night hover:border-outline"
              >
                View Payment & Receipt
              </Link>
            </div>
          </>
        ) : paymentStatus === "pending" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <Icon name="schedule" className="text-3xl" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-night">
                Payment Awaiting Confirmation
              </h1>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                We are awaiting final settlement notification from your payment
                provider. Your pass will unlock automatically once confirmed.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/events/${eventId}/billing/callback?reference=${reference}`}
                className="py-3 px-6 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all"
              >
                Refresh Payment Status
              </Link>
              <Link
                href={`/events/${eventId}/billing`}
                className="py-3 px-6 rounded-xl border border-outline-variant/60 text-xs font-medium text-stone-700 hover:text-night"
              >
                Return to Billing Desk
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
              <Icon name="error" className="text-3xl" />
            </div>
            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-bold text-night">
                Payment Incomplete
              </h1>
              <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                The transaction could not be verified or was cancelled. No
                charges were confirmed.
              </p>
            </div>
            <div className="pt-4 flex justify-center">
              <Link
                href={`/events/${eventId}/billing`}
                className="py-3 px-6 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all"
              >
                Try Again from Billing Desk
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

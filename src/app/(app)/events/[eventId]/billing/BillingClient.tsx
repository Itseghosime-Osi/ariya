"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { BillingTierCard } from "@/features/billing/components/BillingTierCard";
import { PaymentHistoryTable } from "@/features/billing/components/PaymentHistoryTable";
import { InvoiceList } from "@/features/billing/components/InvoiceList";
import type { BillingDeskData } from "@/features/billing/types";

interface BillingClientProps {
  eventId: string;
  data: BillingDeskData;
}

export function BillingClient({ eventId, data }: BillingClientProps) {
  const router = useRouter();
  const [activeReference, setActiveReference] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const handleSimulatePayment = async () => {
    if (!activeReference) return;
    setIsProcessing(true);
    setPayError(null);

    try {
      const res = await fetch("/api/webhooks/paystack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // In test mode or edge mock, header verification is matched
          "x-paystack-signature": "simulated_test_signature",
        },
        body: JSON.stringify({
          event: "charge.success",
          data: {
            reference: activeReference,
            amount: 5000000,
            currency: "NGN",
            status: "success",
            channel: "card",
          },
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setPayError(json.error || "Payment verification failed");
      } else {
        setActiveReference(null);
        router.refresh();
      }
    } catch {
      setPayError("Network error during payment verification");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Mode Checkout Modal */}
      {activeReference && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-night/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-outline-variant/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <Icon name="payment" className="text-xl text-wine" />
                <h3 className="font-serif text-lg font-bold text-night">
                  Paystack Test Gateway
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReference(null)}
                aria-label="Close"
                className="p-1 rounded-lg text-mist hover:text-night"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="bg-surface-container p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Payment Ref:</span>
                <span className="font-mono font-bold text-night">
                  {activeReference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Total Amount:</span>
                <span className="font-bold text-wine">₦50,000.00</span>
              </div>
            </div>

            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2">
                <Icon
                  name="error"
                  className="text-base text-red-600 shrink-0"
                />
                <span>{payError}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSimulatePayment}
                className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <Icon
                      name="progress_activity"
                      className="animate-spin text-sm"
                    />
                    <span>Processing Authorization...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check_circle" className="text-base" />
                    <span>Authorize Successful Test Payment (₦50,000)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveReference(null)}
                className="w-full py-2.5 rounded-xl border border-outline-variant/60 text-xs font-medium text-on-surface-variant hover:text-night"
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      <BillingTierCard
        eventId={eventId}
        isPaid={data.isPaid}
        paidAt={data.paidAt}
        canManageBilling={data.canManageBilling}
        onPaymentInitiated={(ref) => setActiveReference(ref)}
      />

      <PaymentHistoryTable payments={data.payments} />
      <InvoiceList invoices={data.invoices} />
    </div>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { initializePaymentAction } from "../actions";

interface BillingTierCardProps {
  eventId: string;
  isPaid: boolean;
  paidAt: string | null;
  canManageBilling: boolean;
}

export function BillingTierCard({
  eventId,
  isPaid,
  paidAt,
  canManageBilling,
}: BillingTierCardProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePaystackCheckout = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await initializePaymentAction(eventId);
      if (res?.error) {
        setErrorMsg(res.error);
      }
    });
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/40">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-wine">
            Celebration Tier
          </span>
          <h3 className="font-serif text-2xl font-bold text-night">
            {isPaid ? "Celebration Pass (Unlocked)" : "Free Tier (Trial)"}
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            {isPaid
              ? `Fully unlocked on ${new Date(paidAt!).toLocaleDateString()}. Unlimited invitations, reminders, and seating arrangements.`
              : "Limited to 20 guest invitations and reminders. Upgrade for unlimited guest invitations, reminders, and full seating."}
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-wine">
            {isPaid ? "Active" : "₦50,000"}
          </div>
          <div className="text-[11px] text-mist">
            {isPaid ? "Perpetual event access" : "One-time celebration fee"}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <Icon name="error" className="text-base text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-stone-700">
          <Icon name="check_circle" className="text-emerald-600 text-sm" />
          <span>Unlimited Guest Invitations & Delivery</span>
        </div>
        <div className="flex items-center gap-2 text-stone-700">
          <Icon name="check_circle" className="text-emerald-600 text-sm" />
          <span>Automated WhatsApp & Email Reminders</span>
        </div>
        <div className="flex items-center gap-2 text-stone-700">
          <Icon name="check_circle" className="text-emerald-600 text-sm" />
          <span>Unlimited Tables & Seating Re-allocations</span>
        </div>
        <div className="flex items-center gap-2 text-stone-700">
          <Icon name="check_circle" className="text-emerald-600 text-sm" />
          <span>Team Collaboration & Reception Check-in</span>
        </div>
      </div>

      {!isPaid && canManageBilling && (
        <div className="pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handlePaystackCheckout}
            className="w-full py-3.5 px-6 rounded-2xl bg-wine text-ivory text-sm font-semibold hover:bg-wine/90 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Icon name="refresh" className="animate-spin text-base" />
                <span>Initializing Paystack Checkout...</span>
              </>
            ) : (
              <>
                <Icon name="credit_card" className="text-lg" />
                <span>Pay with Paystack (Test Mode • ₦50,000)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

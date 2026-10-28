import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBillingDeskData } from "@/features/billing/queries";
import { StaffBlockedBanner } from "@/features/billing/components/StaffBlockedBanner";
import { BillingClient } from "./BillingClient";

export const metadata: Metadata = {
  title: "Billing & Invoicing • Àríyá Celebration Suite",
  description: "Subscription tier, Paystack checkout, and receipts",
};

interface BillingPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { eventId } = await params;
  const data = await getBillingDeskData(eventId);

  if (!data) {
    notFound();
  }

  if (data.isStaffBlocked) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <StaffBlockedBanner eventId={eventId} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-wine font-semibold text-xs uppercase tracking-wider">
          <span>V2 18–19</span>
          <span>•</span>
          <span>Celebration Suite</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-night">
          Billing, Passes & Invoices
        </h1>
        <p className="text-sm text-on-surface-variant max-w-2xl">
          Manage celebration subscription tiers, process one-time Paystack
          payments, and download formal tax receipts.
        </p>
      </div>

      <BillingClient eventId={eventId} data={data} />
    </div>
  );
}

import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBillingDeskData } from "@/features/billing/queries";
import { ScreenHeader } from "@/components/layout/screen-header";
import { StaffBlockedBanner } from "@/features/billing/components/StaffBlockedBanner";
import { BillingDesk } from "@/features/billing/components/BillingDesk";
import { CELEBRATION_PASS_AMOUNT_KOBO } from "@/lib/paystack";

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
      <div className="mx-auto max-w-4xl py-2 sm:py-8">
        <ScreenHeader title="Billing" backHref={`/events/${eventId}`} />
        <StaffBlockedBanner eventId={eventId} />
      </div>
    );
  }

  return (
    <BillingDesk data={data} passAmountKobo={CELEBRATION_PASS_AMOUNT_KOBO} />
  );
}

"use client";

import React from "react";
import { BillingTierCard } from "@/features/billing/components/BillingTierCard";
import { PaymentHistoryTable } from "@/features/billing/components/PaymentHistoryTable";
import { InvoiceList } from "@/features/billing/components/InvoiceList";
import type { BillingDeskData } from "@/features/billing/types";

interface BillingClientProps {
  eventId: string;
  data: BillingDeskData;
}

export function BillingClient({ eventId, data }: BillingClientProps) {
  return (
    <div className="space-y-6">
      <BillingTierCard
        eventId={eventId}
        isPaid={data.isPaid}
        paidAt={data.paidAt}
        canManageBilling={data.canManageBilling}
      />

      <PaymentHistoryTable payments={data.payments} />
      <InvoiceList invoices={data.invoices} />
    </div>
  );
}

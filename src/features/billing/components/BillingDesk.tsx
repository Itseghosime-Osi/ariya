"use client";

import React from "react";
import { DeskPageHeader } from "@/components/ui/desk-page-header";
import { useDeskToast } from "@/components/ui/desk-toast";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import { CelebrationPass } from "./CelebrationPass";
import { PaymentTimeline } from "./PaymentTimeline";
import { InvoiceList } from "./InvoiceList";
import type { BillingDeskData } from "../types";

interface BillingDeskProps {
  data: BillingDeskData;
  passAmountKobo: number;
}

export function BillingDesk({ data, passAmountKobo }: BillingDeskProps) {
  const { showToast, toast } = useDeskToast();

  return (
    <div className="pb-16">
      {toast}

      <DeskMotion className="space-y-6 lg:space-y-8">
        <DeskItem>
          <DeskPageHeader
            eyebrow={`Billing · ${data.eventTitle}`}
            title="The pass and the paper trail"
            description="Unlock the celebration pass once, then keep every checkout attempt and tax invoice together in one place."
          />
        </DeskItem>

        <DeskItem>
          <CelebrationPass
            eventId={data.eventId}
            eventTitle={data.eventTitle}
            isPaid={data.isPaid}
            paidAt={data.paidAt}
            canManageBilling={data.canManageBilling}
            passAmountKobo={passAmountKobo}
          />
        </DeskItem>

        <DeskItem>
          <PaymentTimeline payments={data.payments} onCopied={showToast} />
        </DeskItem>

        {data.invoices.length > 0 && (
          <DeskItem>
            <InvoiceList invoices={data.invoices} />
          </DeskItem>
        )}
      </DeskMotion>
    </div>
  );
}

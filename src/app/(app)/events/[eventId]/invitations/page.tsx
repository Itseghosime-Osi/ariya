import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getInvitationDeskData } from "@/features/invitations/queries";
import { InvitationsClient } from "./InvitationsClient";

export const metadata: Metadata = {
  title: "Invitation Studio • Àríyá Celebration Suite",
  description: "Design digital wedding invitations and track guest responses",
};

interface InvitationsPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function InvitationsPage({
  params,
}: InvitationsPageProps) {
  const { eventId } = await params;
  const data = await getInvitationDeskData(eventId);

  if (!data) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-wine font-semibold text-xs uppercase tracking-wider">
          <span>Celebration Suite</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-night">
          Invitations &amp; Delivery
        </h1>
        <p className="text-sm text-on-surface-variant max-w-2xl">
          Design celebration cards, generate guest passes, and track invitation
          delivery across WhatsApp and email.
        </p>
      </div>

      <InvitationsClient eventId={eventId} data={data} />
    </div>
  );
}

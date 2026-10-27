"use client";

import React, { useState } from "react";
import { InvitationQuotaBanner } from "@/features/invitations/components/InvitationQuotaBanner";
import { InvitationCardPreview } from "@/features/invitations/components/InvitationCardPreview";
import { InvitationDesignControls } from "@/features/invitations/components/InvitationDesignControls";
import { InvitationGuestTracker } from "@/features/invitations/components/InvitationGuestTracker";
import type {
  InvitationDeskData,
  InvitationDesign,
} from "@/features/invitations/types";

interface InvitationsClientProps {
  eventId: string;
  data: InvitationDeskData;
}

export function InvitationsClient({ eventId, data }: InvitationsClientProps) {
  const [design, setDesign] = useState<InvitationDesign>(data.design);

  return (
    <div className="space-y-6">
      <InvitationQuotaBanner
        eventId={eventId}
        isPaid={data.isPaid}
        invitedCount={data.invitedGuestsCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Card Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-wine">
            Live Pass Preview
          </div>
          <InvitationCardPreview
            coupleName={data.coupleName}
            eventDate={data.eventDate}
            venueName={data.venueName}
            design={design}
          />
        </div>

        {/* Right Column: Controls & Delivery Tracker */}
        <div className="lg:col-span-7 space-y-6">
          <InvitationDesignControls
            eventId={eventId}
            design={design}
            onDesignChange={setDesign}
          />

          <InvitationGuestTracker
            eventId={eventId}
            guests={data.guests}
            eventTitle={data.eventTitle}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { InvitationQuotaBanner } from "@/features/invitations/components/InvitationQuotaBanner";
import { InvitationGuestTracker } from "@/features/invitations/components/InvitationGuestTracker";
import { InvitationStudio } from "@/features/invitations/components/studio/InvitationStudio";
import type {
  InvitationDeskData,
  InvitationEventContent,
} from "@/features/invitations/types";

interface InvitationsClientProps {
  eventId: string;
  data: InvitationDeskData;
}

export function InvitationsClient({ eventId, data }: InvitationsClientProps) {
  const content: InvitationEventContent = {
    title: data.eventTitle,
    couple: data.coupleName,
    date: data.eventDate,
    venue: data.venueName,
    area: data.area,
    dressCode: data.dressCode,
    rsvpBy: data.rsvpBy,
    theme: data.design.theme,
  };

  return (
    <div className="space-y-6">
      <InvitationQuotaBanner
        eventId={eventId}
        isPaid={data.isPaid}
        invitedCount={data.invitedGuestsCount}
      />

      <InvitationStudio
        eventId={eventId}
        content={content}
        initialDesign={data.design}
        coupleName={data.coupleName}
      />

      <InvitationGuestTracker
        eventId={eventId}
        guests={data.guests}
        eventTitle={data.eventTitle}
      />
    </div>
  );
}

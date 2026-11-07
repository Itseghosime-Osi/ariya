import { EndedLock } from "@/components/layout/ended-lock";
import { isEventExpired } from "@/lib/event-expiry";
import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/features/events/queries";
import { getInvitationDeskData } from "@/features/invitations/queries";
import { InvitationDesigner } from "@/features/invitations/components/designer/InvitationDesigner";
import type { InvitationEventContent } from "@/features/invitations/types";

export const metadata: Metadata = {
  title: "Invitation Designer • Àríyá",
  description: "Design your own invitation, or let the simple mode do it.",
};

interface DesignPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function InvitationDesignPage({
  params,
}: DesignPageProps) {
  const { eventId } = await params;
  const [data, eventData] = await Promise.all([
    getInvitationDeskData(eventId),
    getEventById(eventId),
  ]);
  if (!data) notFound();

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
    <EndedLock ended={isEventExpired(eventData?.event.date)}>
      <InvitationDesigner
        eventId={eventId}
        eventTitle={data.eventTitle}
        content={content}
        initialDesign={data.design}
        coupleName={data.coupleName}
        backHref={`/events/${eventId}/invitations`}
        requireAccessCard={eventData?.event.require_access_card !== false}
        settingsHref={`/events/${eventId}/page-editor`}
      />
    </EndedLock>
  );
}

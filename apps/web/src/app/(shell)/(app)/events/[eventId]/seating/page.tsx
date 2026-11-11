import { EndedLock } from "@/components/layout/ended-lock";
import { isEventExpired } from "@/lib/event-expiry";
import React from "react";
import { notFound } from "next/navigation";
import { getAddedRiskIds } from "@/features/checklist/queries";
import { getEventById } from "@/features/events/queries";
import { getEventSeatingData, getHallLayout } from "@/features/seating/queries";
import { SeatingDesk } from "@/features/seating/components/SeatingDesk";
import { countPendingHallProposals } from "@/features/approvals/queries";

interface SeatingPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: SeatingPageProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `Seating & Floor Plan • ${data?.event.title || "Celebration Desk"} • Àríyá`,
  };
}

export default async function SeatingPageRoute({ params }: SeatingPageProps) {
  const { eventId } = await params;
  const [eventData, seatingData, hall, addedRiskIds, pendingProposals] =
    await Promise.all([
      getEventById(eventId),
      getEventSeatingData(eventId),
      getHallLayout(eventId),
      getAddedRiskIds(eventId),
      countPendingHallProposals(eventId),
    ]);

  if (!eventData) {
    notFound();
  }

  return (
    <>
      <EndedLock ended={isEventExpired(eventData.event.date)}>
        <SeatingDesk
          eventId={eventId}
          eventTitle={eventData.event.title}
          pendingProposals={pendingProposals}
          initialData={seatingData}
          hallLayout={hall.layout}
          hallLayoutAvailable={hall.available}
          eventDate={eventData.event.date ?? null}
          addedRiskIds={addedRiskIds}
        />
      </EndedLock>
    </>
  );
}

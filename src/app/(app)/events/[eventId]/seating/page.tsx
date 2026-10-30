import React from "react";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/queries";
import { getEventSeatingData, getHallLayout } from "@/features/seating/queries";
import { SeatingDesk } from "@/features/seating/components/SeatingDesk";

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
  const [eventData, seatingData, hall] = await Promise.all([
    getEventById(eventId),
    getEventSeatingData(eventId),
    getHallLayout(eventId),
  ]);

  if (!eventData) {
    notFound();
  }

  return (
    <>
      <SeatingDesk
        eventId={eventId}
        initialData={seatingData}
        hallLayout={hall.layout}
        hallLayoutAvailable={hall.available}
      />
    </>
  );
}

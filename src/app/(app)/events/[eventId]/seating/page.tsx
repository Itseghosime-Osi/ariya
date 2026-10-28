import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getEventById } from "@/features/events/queries";
import { getCurrentUser } from "@/features/auth/queries";
import { getEventSeatingData } from "@/features/seating/queries";
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
  const [eventData, user, seatingData] = await Promise.all([
    getEventById(eventId),
    getCurrentUser(),
    getEventSeatingData(eventId),
  ]);

  if (!eventData) {
    notFound();
  }

  return (
    <AppShell
      eventId={eventData.event.id}
      eventTitle={eventData.event.title}
      eventDate={eventData.event.date}
      daysAway={eventData.metrics.daysAway}
      userEmail={user?.email}
    >
      <SeatingDesk eventId={eventId} initialData={seatingData} />
    </AppShell>
  );
}

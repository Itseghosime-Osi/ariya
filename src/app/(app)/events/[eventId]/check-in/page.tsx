import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getEventById } from "@/features/events/queries";
import { getCurrentUser } from "@/features/auth/queries";
import { getCheckInDeskData } from "@/features/check-in/queries";
import { CheckInDesk } from "@/features/check-in/components/CheckInDesk";

interface CheckInPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: CheckInPageProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `Check-In Desk & Telemetry • ${data?.event.title || "Celebration"} • Àríyá`,
  };
}

export default async function CheckInPageRoute({ params }: CheckInPageProps) {
  const { eventId } = await params;
  const [eventData, user, checkInData] = await Promise.all([
    getEventById(eventId),
    getCurrentUser(),
    getCheckInDeskData(eventId),
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
      <CheckInDesk eventId={eventId} initialData={checkInData} />
    </AppShell>
  );
}

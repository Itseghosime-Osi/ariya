import React from "react";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/queries";
import { getCheckInDeskData } from "@/features/check-in/queries";
import { CheckInDesk } from "@/features/check-in/components/CheckInDesk";

interface CheckInPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: CheckInPageProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `Check-In Desk & Arrival Concierge • ${data?.event.title || "Celebration"} • Àríyá`,
  };
}

export default async function CheckInPageRoute({ params }: CheckInPageProps) {
  const { eventId } = await params;
  const [eventData, checkInData] = await Promise.all([
    getEventById(eventId),
    getCheckInDeskData(eventId),
  ]);

  if (!eventData) {
    notFound();
  }

  return (
    <>
      <CheckInDesk eventId={eventId} initialData={checkInData} />
    </>
  );
}

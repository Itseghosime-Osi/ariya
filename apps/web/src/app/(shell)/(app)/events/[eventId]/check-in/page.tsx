import React from "react";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/queries";
import { getCheckInDeskData } from "@/features/check-in/queries";
import { CheckInDesk } from "@/features/check-in/components/CheckInDesk";
import { PassLock } from "@/components/layout/pass-lock";
import { PageHeader } from "@/components/layout/page-header";

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

  // The door desk comes with the Celebration Pass (the database refuses new check-ins without it).
  if (!eventData.event.paid_at) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Check-in desk"
          description="Welcome guests at the door with their pass."
        />
        <PassLock eventId={eventId} feature="check-in" />
      </div>
    );
  }

  return (
    <>
      <CheckInDesk eventId={eventId} initialData={checkInData} />
    </>
  );
}

import { getEventById } from "@/features/events/queries";
import { EndedLock } from "@/components/layout/ended-lock";
import { isEventExpired } from "@/lib/event-expiry";
import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReminderDeskData } from "@/features/reminders/queries";
import { RemindersClient } from "./RemindersClient";

export const metadata: Metadata = {
  title: "Reminders • Àríyá Celebration Suite",
  description: "Preview and send reminders to guests who have not replied",
};

interface RemindersPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function RemindersPage({ params }: RemindersPageProps) {
  const { eventId } = await params;
  const [data, eventData] = await Promise.all([
    getReminderDeskData(eventId),
    getEventById(eventId),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <EndedLock ended={isEventExpired(eventData?.event.date)}>
      <RemindersClient eventId={eventId} data={data} />
    </EndedLock>
  );
}

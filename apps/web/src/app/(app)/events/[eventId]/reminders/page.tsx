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
  const data = await getReminderDeskData(eventId);

  if (!data) {
    notFound();
  }

  return <RemindersClient eventId={eventId} data={data} />;
}

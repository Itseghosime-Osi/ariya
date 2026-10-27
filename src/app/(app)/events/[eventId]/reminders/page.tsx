import React from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getReminderDeskData } from "@/features/reminders/queries";
import { RemindersClient } from "./RemindersClient";

export const metadata: Metadata = {
  title: "Reminders Centre • Àríyá Celebration Suite",
  description: "Schedule, preview, and dispatch batch guest reminders",
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-wine font-semibold text-xs uppercase tracking-wider">
          <span>V2 15</span>
          <span>•</span>
          <span>Celebration Suite</span>
        </div>
        <h1 className="font-serif text-3xl font-bold text-night">
          Reminders Centre
        </h1>
        <p className="text-sm text-on-surface-variant max-w-2xl">
          Politely follow up with guests awaiting attendance confirmation
          through scheduled or manual batch emails.
        </p>
      </div>

      <RemindersClient eventId={eventId} data={data} />
    </div>
  );
}

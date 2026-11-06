import { EndedLock } from "@/components/layout/ended-lock";
import { getCurrentUser } from "@/features/auth/queries";
import { getChecklistData } from "@/features/checklist/queries";
import { isEventExpired } from "@/lib/event-expiry";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChecklistClient } from "./ChecklistClient";

export const metadata: Metadata = {
  title: "Checklist • Àríyá Celebration Suite",
  description:
    "Everything left to do for this celebration, generated from the plan",
};

interface ChecklistPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ChecklistPage({ params }: ChecklistPageProps) {
  const { eventId } = await params;
  const [data, user] = await Promise.all([
    getChecklistData(eventId),
    getCurrentUser(),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <EndedLock ended={isEventExpired(data.event.date)}>
      <ChecklistClient
        eventId={eventId}
        data={data}
        userId={user?.id ?? null}
      />
    </EndedLock>
  );
}

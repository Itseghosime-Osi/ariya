import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getEventById } from "@/features/events/queries";
import { getCurrentUser } from "@/features/auth/queries";
import { EventPageEditor } from "@/features/events/components/editor/EventPageEditor";

interface PageEditorProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: PageEditorProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `${data?.event.title || "Event Editor"} • Page Editor • Àríyá`,
  };
}

export default async function PageEditorRoute({ params }: PageEditorProps) {
  const { eventId } = await params;
  const [data, user] = await Promise.all([
    getEventById(eventId),
    getCurrentUser(),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <AppShell
      eventId={data.event.id}
      eventTitle={data.event.title}
      eventDate={data.event.date}
      daysAway={data.metrics.daysAway}
      userEmail={user?.email}
    >
      <EventPageEditor event={data.event} />
    </AppShell>
  );
}

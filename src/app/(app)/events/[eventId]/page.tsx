import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { EventOverviewDesk } from "@/features/events/components/EventOverviewDesk";
import {
  getEventById,
  getEventRecentResponses,
} from "@/features/events/queries";
import { getCurrentUser } from "@/features/auth/queries";

interface EventPageProps {
  params: Promise<{
    eventId: string;
  }>;
}

export async function generateMetadata({ params }: EventPageProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `${data?.event.title || "Event Overview"} • Celebration Desk • Àríyá`,
    description: "Manage your celebrations, seating, and guest lists",
  };
}

export default async function EventOverviewPage({ params }: EventPageProps) {
  const { eventId } = await params;
  const [data, user] = await Promise.all([
    getEventById(eventId),
    getCurrentUser(),
  ]);

  if (!data) {
    notFound();
  }

  const recentResponses = await getEventRecentResponses(eventId);

  return (
    <AppShell
      eventId={data.event.id}
      eventTitle={data.event.title}
      eventDate={data.event.date}
      daysAway={data.metrics.daysAway}
      userEmail={user?.email}
    >
      <EventOverviewDesk data={data} recentResponses={recentResponses} />
    </AppShell>
  );
}

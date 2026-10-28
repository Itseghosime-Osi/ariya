import React from "react";
import { notFound } from "next/navigation";
import { EventOverviewDesk } from "@/features/events/components/EventOverviewDesk";
import {
  getEventById,
  getEventRecentResponses,
} from "@/features/events/queries";

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
  const data = await getEventById(eventId);

  if (!data) {
    notFound();
  }

  const recentResponses = await getEventRecentResponses(eventId);

  return (
    <>
      <EventOverviewDesk data={data} recentResponses={recentResponses} />
    </>
  );
}

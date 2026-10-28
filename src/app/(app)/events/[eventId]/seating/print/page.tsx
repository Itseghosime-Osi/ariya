import React from "react";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/queries";
import { getEventSeatingData } from "@/features/seating/queries";
import { PrintableSeatingChart } from "@/features/seating/components/PrintableSeatingChart";
import { formatLagosDate } from "@/lib/format";

interface PrintSeatingPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: PrintSeatingPageProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `Print Seating & Place Cards • ${data?.event.title || "Celebration"} • Àríyá`,
  };
}

export default async function PrintSeatingPage({
  params,
}: PrintSeatingPageProps) {
  const { eventId } = await params;
  const [eventData, seatingData] = await Promise.all([
    getEventById(eventId),
    getEventSeatingData(eventId),
  ]);

  if (!eventData) {
    notFound();
  }

  return (
    <PrintableSeatingChart
      eventId={eventId}
      eventTitle={eventData.event.title}
      couple={eventData.event.couple}
      date={formatLagosDate(eventData.event.date)}
      tables={seatingData.tables}
    />
  );
}

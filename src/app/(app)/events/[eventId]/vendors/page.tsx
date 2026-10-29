import React from "react";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/queries";
import { getVendorsWithTasks } from "@/features/vendors/queries";
import { VendorRoster } from "@/features/vendors/components/VendorRoster";

interface VendorsPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({ params }: VendorsPageProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `Vendors & Deliverables • ${data?.event.title || "Celebration Desk"} • Àríyá`,
  };
}

export default async function VendorsPageRoute({ params }: VendorsPageProps) {
  const { eventId } = await params;
  const [eventData, vendorsData] = await Promise.all([
    getEventById(eventId),
    getVendorsWithTasks(eventId),
  ]);

  if (!eventData) {
    notFound();
  }

  return (
    <>
      <VendorRoster eventId={eventId} initialData={vendorsData} />
    </>
  );
}

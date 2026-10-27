import React from "react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getEventById } from "@/features/events/queries";
import { getCurrentUser } from "@/features/auth/queries";
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
  const [eventData, user, vendorsData] = await Promise.all([
    getEventById(eventId),
    getCurrentUser(),
    getVendorsWithTasks(eventId),
  ]);

  if (!eventData) {
    notFound();
  }

  return (
    <AppShell
      eventId={eventData.event.id}
      eventTitle={eventData.event.title}
      eventDate={eventData.event.date}
      daysAway={eventData.metrics.daysAway}
      userEmail={user?.email}
    >
      <VendorRoster eventId={eventId} initialData={vendorsData} />
    </AppShell>
  );
}

import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getEventById } from "@/features/events/queries";
import { EventSettingsForm } from "@/features/events/components/EventSettingsForm";

interface EventSettingsPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({
  params,
}: EventSettingsPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `${data?.event.title || "Settings"} • Event Settings • Àríyá`,
    description: "Manage event details, slug, visibility, and archive state.",
  };
}

export default async function EventSettingsPage({
  params,
}: EventSettingsPageProps) {
  const { eventId } = await params;
  const data = await getEventById(eventId);

  if (!data) {
    notFound();
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Celebration Settings"
          description="Configure core ceremonial parameters, URL routing, visibility, and lifecycle options."
        />
        <EventSettingsForm event={data.event} userRole={data.role} />
      </div>
    </>
  );
}

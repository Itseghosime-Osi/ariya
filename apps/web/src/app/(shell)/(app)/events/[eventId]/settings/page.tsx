import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { DeskPageHeader } from "@/components/ui/desk-page-header";
import { getEventById } from "@/features/events/queries";
import { isEventExpired } from "@/lib/event-expiry";
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

  const { event } = data;

  return (
    <div className="space-y-4 sm:space-y-6 sm:pb-16 lg:space-y-8">
      <ScreenHeader
        title="Event settings"
        subtitle={event.couple || event.title}
        backHref={`/events/${eventId}`}
      />
      <div className="standalone:max-md:hidden">
        <DeskPageHeader
          compact
          eyebrow={`Settings · ${event.couple || event.title}`}
          title="Celebration Settings"
          description="Names, date, venue, guest link and lifecycle. Changes reach your guests as soon as you save."
        />
      </div>
      <EventSettingsForm
        event={event}
        userRole={data.role}
        ended={isEventExpired(event.date)}
      />
    </div>
  );
}

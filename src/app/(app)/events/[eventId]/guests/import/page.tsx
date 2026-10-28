import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getEventById } from "@/features/events/queries";
import { getCurrentUser } from "@/features/auth/queries";
import { CsvImportPageFlow } from "@/features/guests/components/import/CsvImportPageFlow";

interface ImportGuestsPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateMetadata({
  params,
}: ImportGuestsPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const data = await getEventById(eventId);
  return {
    title: `${data?.event.title || "Import"} • Import Guests • Àríyá`,
    description: "Upload and map guest lists from CSV spreadsheets.",
  };
}

export default async function ImportGuestsPage({
  params,
}: ImportGuestsPageProps) {
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
      <div className="space-y-6">
        <PageHeader
          title="Import Guest Registry"
          description="Upload CSV spreadsheets, map columns, detect duplicates, and import guests."
        />
        <CsvImportPageFlow eventId={data.event.id} />
      </div>
    </AppShell>
  );
}

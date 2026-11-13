import { PageTips } from "@/features/onboarding/PageTips";
import { EndedLock } from "@/components/layout/ended-lock";
import { getRunSheetData } from "@/features/day-of/queries";
import { isEventExpired } from "@/lib/event-expiry";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RunSheetClient } from "./RunSheetClient";

export const metadata: Metadata = {
  title: "Run sheet • Àríyá Celebration Suite",
  description: "The order of the day, with the times that cannot move",
};

interface RunSheetPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function RunSheetPage({ params }: RunSheetPageProps) {
  const { eventId } = await params;
  const data = await getRunSheetData(eventId);
  if (!data) notFound();

  return (
    <EndedLock ended={isEventExpired(data.eventDate)}>
      <PageTips
        tipKey="run-sheet"
        items={[
          "This is the day from start to finish: a time, what happens, and whether it is done.",
          "It fills in from your checklist. To change a time, change it there.",
          "Call or email a vendor straight from their row. It still opens without signal.",
        ]}
      />
      <RunSheetClient data={data} />
    </EndedLock>
  );
}

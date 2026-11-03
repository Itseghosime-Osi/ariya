import React from "react";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/queries";
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
  const data = await getEventById(eventId);

  if (!data) {
    notFound();
  }

  return (
    <>
      <EventPageEditor event={data.event} />
    </>
  );
}

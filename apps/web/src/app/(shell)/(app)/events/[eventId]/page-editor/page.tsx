import { EndedLock } from "@/components/layout/ended-lock";
import { isEventExpired } from "@/lib/event-expiry";
import React from "react";
import { notFound } from "next/navigation";
import { getEventById } from "@/features/events/queries";
import { createClient } from "@/lib/supabase/server";
import { hasEntrySeal, normaliseDesign } from "@/features/invitations/design";
import { readAnswers } from "@/features/rsvp-questions/model";
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

  // What guests answered, newest first, with their names (readable by the celebration's team only).
  const supabase = await createClient();
  const { data: answerRows } = await supabase
    .from("rsvp_answers")
    .select("guest_id, answers, updated_at, guests(name)")
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false })
    .limit(200);
  const replies = (answerRows ?? [])
    .map((r) => ({
      guestId: r.guest_id,
      name: r.guests?.name ?? "Guest",
      answers: readAnswers(r.answers),
    }))
    .filter((r) => Object.keys(r.answers).length > 0);

  return (
    <>
      <EndedLock ended={isEventExpired(data.event.date)}>
        <EventPageEditor
          event={data.event}
          replies={replies}
          sealPlaced={hasEntrySeal(
            normaliseDesign(data.event.invitation_design)
          )}
        />
      </EndedLock>
    </>
  );
}

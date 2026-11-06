import React from "react";
import { InvitationCard } from "@/features/invitations/components/InvitationCard";
import { designFromEvent } from "@/features/invitations/design";

/** The invitation card the film ends on: the same document and component the guest will hold. */
export function FilmFinale({
  event,
  design: savedDesign = null,
  entryCode = null,
}: {
  /** The host's saved studio design; without it the house card is drawn from the words below. */
  design?: unknown;
  entryCode?: string | null;
  event: {
    title: string;
    couple: string;
    date: string;
    venue: string;
    area: string | null;
    dressCode: string | null;
    rsvpBy: string | null;
    theme?: string | null;
    headline?: string | null;
    subheadline?: string | null;
    message?: string | null;
  };
}) {
  const design = designFromEvent({
    title: event.title,
    couple: event.couple,
    date: event.date,
    venue: event.venue,
    area: event.area,
    dressCode: event.dressCode,
    rsvpBy: event.rsvpBy,
    theme: event.theme ?? null,
    headline: event.headline ?? null,
    subheadline: event.subheadline ?? null,
    message: event.message ?? null,
    design: savedDesign,
  });
  return (
    <InvitationCard
      design={design}
      coupleName={event.couple || event.title}
      entryCode={entryCode}
    />
  );
}

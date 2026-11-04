"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { InvitationCard } from "@/features/invitations/components/InvitationCard";
import { designFromEvent } from "@/features/invitations/design";
import type { Event } from "../../types";
import { TiltCard } from "./TiltCard";

/**
 * The invitation exactly as the studio saved it — same document, same component — so the overview
 * can never show a different card from the one the host is designing and the guests will hold.
 */
export function InvitationPreview({ event }: { event: Event }) {
  const design = designFromEvent({
    title: event.title,
    couple: event.couple,
    date: event.date,
    venue: event.venue,
    area: event.area,
    dressCode: event.dress_code,
    rsvpBy: event.rsvp_by,
    theme: event.invitation_theme,
    headline: event.invitation_headline,
    subheadline: event.invitation_subheadline,
    message: event.invitation_message,
    design: event.invitation_design,
  });

  return (
    <section
      aria-labelledby="invitation-title"
      className="bento-card flex h-full flex-col p-6 sm:p-7"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            Your invitation
          </div>
          <h2
            id="invitation-title"
            className="mt-1 font-display text-2xl font-bold text-night"
          >
            As your guests see it
          </h2>
        </div>
      </div>

      <div className="mt-5 flex flex-1 items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_30%,#3a0f1a,#1c070d_70%)] p-6 sm:p-8">
        <TiltCard max={9} className="w-full max-w-[340px]">
          <InvitationCard
            design={design}
            coupleName={event.couple || event.title}
          />
        </TiltCard>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-label-2">
          Each guest gets their own link and their own seat.
        </p>
        <Link
          href={`/events/${event.id}/invitations`}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-burgundy px-4 text-sm font-semibold text-white hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="stylus" size={16} />
          Design it
        </Link>
      </div>
    </section>
  );
}

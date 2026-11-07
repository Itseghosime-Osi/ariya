"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { InvitationCard } from "@/features/invitations/components/InvitationCard";
import { InvitationQuotaBanner } from "@/features/invitations/components/InvitationQuotaBanner";
import { InvitationGuestTracker } from "@/features/invitations/components/InvitationGuestTracker";
import type { InvitationDeskData } from "@/features/invitations/types";

interface InvitationsClientProps {
  eventId: string;
  data: InvitationDeskData;
}

export function InvitationsClient({ eventId, data }: InvitationsClientProps) {
  return (
    <div className="space-y-6">
      <InvitationQuotaBanner
        eventId={eventId}
        isPaid={data.isPaid}
        invitedCount={data.invitedGuestsCount}
      />

      <section
        aria-labelledby="your-invitation"
        className="bento-card grid items-center gap-6 p-5 sm:p-8 md:grid-cols-[minmax(0,260px)_1fr]"
      >
        <div className="mx-auto w-full max-w-[260px]">
          <InvitationCard
            design={data.design}
            coupleName={data.coupleName}
            sampleEntry
          />
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
              Your invitation
            </p>
            <h2
              id="your-invitation"
              className="mt-1 font-display text-2xl font-bold text-night sm:text-3xl"
            >
              Make it yours
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-label-2">
              Change the words and colours in a few taps, or open the full
              designer to place text, shapes and pictures anywhere. Already have
              a card? Import it and send that instead.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/events/${eventId}/invitations/design`}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-burgundy px-6 text-sm font-semibold text-ivory shadow-sm hover:bg-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <Icon name="stylus" size={17} />
              Open the designer
            </Link>
          </div>
        </div>
      </section>

      <InvitationGuestTracker
        eventId={eventId}
        guests={data.guests}
        eventTitle={data.eventTitle}
      />
    </div>
  );
}

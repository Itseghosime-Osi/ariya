import React from "react";
import { Icon } from "@/components/ui/icon";
import { formatLagosDate } from "@/lib/format";
import type { InvitationEvent, InvitationGuest } from "../types";

interface DeadlinePassedCardProps {
  event: InvitationEvent;
  guest: InvitationGuest;
}

export function DeadlinePassedCard({ event, guest }: DeadlinePassedCardProps) {
  const formattedDeadline = event.rsvp_by
    ? formatLagosDate(event.rsvp_by)
    : "the scheduled cutoff date";

  return (
    <article className="bg-[#fcfaf7] border border-[#e8dfcf] rounded-2xl p-8 sm:p-10 shadow-sm text-center space-y-6">
      <div className="w-14 h-14 rounded-full bg-wine/10 text-wine flex items-center justify-center mx-auto">
        <Icon name="schedule" className="text-2xl" />
      </div>

      <div className="space-y-2">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-wine/10 text-wine">
          RSVP Window Concluded
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl text-wine font-medium">
          Official Protocol Deadline Reached
        </h1>
        <p className="font-serif text-lg italic text-wine/80">
          Dearest {guest.display_name}
        </p>
        <p className="text-sm text-wine/80 max-w-md mx-auto pt-2 leading-relaxed">
          The ceremonial RSVP confirmation deadline for {event.title} was{" "}
          <strong>{formattedDeadline}</strong>. Catering rosters and seating
          charts have been finalized. If you require urgent assistance, please
          contact the couple directly.
        </p>
      </div>
    </article>
  );
}

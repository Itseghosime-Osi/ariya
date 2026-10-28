import React from "react";
import { Icon } from "@/components/ui/icon";
import type { InvitationEvent } from "../types";

interface ClosedEventCardProps {
  event: InvitationEvent;
}

export function ClosedEventCard({ event }: ClosedEventCardProps) {
  return (
    <article className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 sm:p-10 shadow-sm text-center space-y-6">
      <div className="w-14 h-14 rounded-full bg-wine/10 text-wine flex items-center justify-center mx-auto">
        <Icon name="event_busy" className="text-2xl" />
      </div>

      <div className="space-y-2">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-wine/10 text-wine">
          Celebration Concluded
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl text-wine font-medium">
          {event.title}
        </h1>
        <p className="font-serif text-base italic text-wine/80">
          The Celebration of {event.couple}
        </p>
        <p className="text-sm text-wine/80 max-w-md mx-auto pt-2">
          This celebration has concluded or has been officially archived. RSVP
          admissions are closed.
        </p>
      </div>
    </article>
  );
}

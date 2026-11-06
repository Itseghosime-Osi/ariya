import React from "react";
import { formatLagosDate } from "@/lib/format";
import { GuestNotice } from "@/components/errors/guest-notice";
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
    <GuestNotice
      icon="schedule"
      badge="RSVP window concluded"
      title="RSVP deadline has passed"
      subtitle={`Dearest ${guest.display_name}`}
    >
      <p>
        The RSVP deadline for {event.title} was{" "}
        <strong className="text-night">{formattedDeadline}</strong>. Catering
        and seating have been finalised. If you need urgent help, please contact
        the couple directly.
      </p>
    </GuestNotice>
  );
}

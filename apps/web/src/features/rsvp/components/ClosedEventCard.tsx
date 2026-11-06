import React from "react";
import { GuestNotice } from "@/components/errors/guest-notice";
import type { InvitationEvent } from "../types";

interface ClosedEventCardProps {
  event: InvitationEvent;
}

export function ClosedEventCard({ event }: ClosedEventCardProps) {
  return (
    <GuestNotice
      icon="calendar"
      badge="Celebration concluded"
      title={event.title}
      subtitle={`The Celebration of ${event.couple}`}
    >
      <p>
        This celebration has concluded or has been officially archived. RSVP
        admissions are closed.
      </p>
    </GuestNotice>
  );
}

import React from "react";
import { GuestNotice } from "@/components/errors/guest-notice";

/**
 * What anyone who opens the link of an ended celebration sees, on both the public page and a guest's
 * personal invitation. It names the celebration and nothing else: no venue, no schedule, no replies.
 */
export function ExpiredEventCard({
  title,
  couple,
}: {
  title?: string | null;
  couple?: string | null;
}) {
  return (
    <GuestNotice
      testId="event-expired"
      icon="schedule"
      badge="This celebration has ended"
      title={couple || title || "This celebration"}
    >
      <p>
        This link has expired and cannot be opened again. Thank you for
        celebrating with us.
      </p>
    </GuestNotice>
  );
}

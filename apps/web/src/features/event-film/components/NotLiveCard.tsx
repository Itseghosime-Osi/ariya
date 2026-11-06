import React from "react";
import { GuestNotice } from "@/components/errors/guest-notice";

/** What a guest sees if they open an invitation the host has not switched live yet. */
export function NotLiveCard({
  couple,
  title,
}: {
  couple?: string | null;
  title?: string | null;
}) {
  return (
    <GuestNotice
      testId="invitation-not-live"
      icon="schedule"
      badge="Not open yet"
      title={couple || title || "This celebration"}
    >
      <p>
        The hosts are still getting this invitation ready. Please check back
        soon.
      </p>
    </GuestNotice>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/** Shown across every screen of a celebration whose day has passed. */
export function EventEndedBanner() {
  return (
    <div
      role="status"
      data-testid="event-ended-banner"
      className="mb-4 flex items-start gap-2.5 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-night"
    >
      <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
      <p className="min-w-0">
        <b className="font-semibold">This celebration has ended.</b>{" "}
        <span className="text-label-2">
          It is now a read-only record: nothing can be changed and its public
          page is closed.
        </span>
      </p>
    </div>
  );
}

/** Shown on a celebration that has been filed away, with the way back to the archive. */
export function EventArchivedBanner() {
  return (
    <div
      role="status"
      data-testid="event-archived-banner"
      className="mb-4 flex items-start gap-2.5 rounded-2xl border border-hairline bg-white/45 px-4 py-3 text-sm text-night"
    >
      <Icon name="folder" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
      <p className="min-w-0">
        <b className="font-semibold">This celebration is archived.</b>{" "}
        <span className="text-label-2">
          It no longer appears in your celebrations.
        </span>{" "}
        <Link
          href="/profile/archive"
          className="font-semibold text-burgundy underline-offset-2 hover:underline"
        >
          Open the archive
        </Link>
      </p>
    </div>
  );
}

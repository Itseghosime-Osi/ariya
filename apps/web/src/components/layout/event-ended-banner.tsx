"use client";

import React from "react";
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

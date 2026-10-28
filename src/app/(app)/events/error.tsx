"use client";

import React, { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Icon } from "@/components/ui/icon";

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[EventsError] Failed to load events:", error);
  }, [error]);

  return (
    <AppShell showFloatingNewEvent>
      <div
        role="alert"
        data-testid="events-error-state"
        className="rounded-2xl bg-surface border border-hairline p-8 sm:p-12 text-center max-w-lg mx-auto my-8 space-y-4 shadow-xs"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rsvp-declined/10 text-rsvp-declined">
          <Icon name="error" size={24} />
        </div>

        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-semibold text-night">
            We couldn&apos;t load your events
          </h1>
          <p className="text-xs sm:text-sm text-label-2 leading-relaxed">
            A temporary connection issue interrupted loading your celebrations.
            Your guest lists and RSVPs are safe.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-burgundy px-5 py-2.5 text-xs sm:text-sm font-semibold text-ivory hover:bg-wine transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="refresh" size={16} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}

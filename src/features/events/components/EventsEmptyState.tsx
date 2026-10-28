import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function EventsEmptyState() {
  return (
    <section
      data-testid="events-empty-state"
      aria-labelledby="empty-events-heading"
      className="rounded-2xl bg-surface border border-hairline p-8 sm:p-12 text-center max-w-xl mx-auto my-6 space-y-5 shadow-[0_8px_24px_-12px_rgba(28,15,20,0.1)]"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-burgundy/10 text-burgundy">
        <Icon name="celebration" size={26} />
      </div>

      <div className="space-y-2">
        <h2
          id="empty-events-heading"
          className="font-display text-2xl sm:text-3xl font-semibold text-night"
        >
          Plan your first celebration
        </h2>
        <p className="text-sm text-label-2 max-w-md mx-auto leading-relaxed">
          Set up your event details, guest list, digital RSVP links, and table
          seating in one calm workspace.
        </p>
      </div>

      <div className="pt-1">
        <Link
          href="/events/new"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-burgundy px-6 py-3 text-sm font-semibold text-ivory shadow-[0_8px_20px_-6px_rgba(107,30,46,0.45)] transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="add_circle" size={18} />
          <span>Create your first event</span>
        </Link>
      </div>
    </section>
  );
}

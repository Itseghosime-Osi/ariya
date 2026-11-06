import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/** Shown to the celebration's own team while the invitation is in test mode. */
export function TestModeBanner({ eventId }: { eventId: string }) {
  return (
    <div
      role="status"
      data-testid="invitation-test-banner"
      className="mx-auto mb-4 flex max-w-2xl items-start gap-2.5 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-night"
    >
      <Icon name="lock" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
      <p className="min-w-0">
        <b className="font-semibold">Test mode.</b>{" "}
        <span className="text-label-2">
          Only your team can see this, and replies are switched off. Guests see
          &ldquo;not open yet&rdquo; until you{" "}
        </span>
        <Link
          href={`/events/${eventId}/page-editor`}
          className="font-semibold text-burgundy underline-offset-2 hover:underline"
        >
          switch the invitation live
        </Link>
        .
      </p>
    </div>
  );
}

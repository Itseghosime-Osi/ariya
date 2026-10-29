"use client";

import Link from "next/link";
import { GuestOverviewStats } from "../types";

interface GuestRegistryMetricsProps {
  eventId: string;
  stats: GuestOverviewStats;
}

const linkClass =
  "font-semibold text-wine underline underline-offset-4 decoration-outline-variant hover:decoration-wine";

export function GuestRegistryMetrics({
  eventId,
  stats,
}: GuestRegistryMetricsProps) {
  const confirmed = stats.acceptedGuests;
  const total = stats.totalAttendees;
  const declinedSeats = stats.declinedGuests;
  const awaitingSeats = Math.max(0, total - confirmed - declinedSeats);

  return (
    <section aria-label="RSVP progress" className="flex flex-col gap-3">
      <p className="font-serif text-xl text-on-surface">
        <b className="mr-1 text-4xl font-bold tabular-nums">{confirmed}</b>
        of {total} {total === 1 ? "seat" : "seats"} confirmed
      </p>

      <div
        role="img"
        aria-label={`${confirmed} attending, ${declinedSeats} declined, ${awaitingSeats} awaiting reply`}
        className="flex h-1.5 gap-[3px] overflow-hidden rounded-full"
      >
        <i className="block bg-success" style={{ flex: confirmed }} />
        <i className="block bg-error" style={{ flex: declinedSeats }} />
        <i
          className="block bg-outline-variant"
          style={{ flex: awaitingSeats }}
        />
      </div>

      <p className="text-sm text-on-surface-variant">
        {stats.pendingCount === 0 ? (
          "Every party has replied."
        ) : (
          <>
            {stats.pendingCount}{" "}
            {stats.pendingCount === 1 ? "party has" : "parties have"} not
            replied.{" "}
            <Link href={`/events/${eventId}/reminders`} className={linkClass}>
              Send reminders
            </Link>
          </>
        )}
        {stats.unassignedCount > 0 && (
          <>
            {" "}
            {stats.unassignedCount}{" "}
            {stats.unassignedCount === 1 ? "guest needs" : "guests need"} a
            table.{" "}
            <Link href={`/events/${eventId}/seating`} className={linkClass}>
              Open seating
            </Link>
          </>
        )}
      </p>
    </section>
  );
}

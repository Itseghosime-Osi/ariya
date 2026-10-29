"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { m } from "motion/react";
import { DeskItem } from "@/features/events/components/desk/DeskMotion";
import { GuestOverviewStats } from "../types";

interface GuestRegistryMetricsProps {
  eventId: string;
  stats: GuestOverviewStats;
}

const card =
  "bento-tile-hover flex flex-col justify-between gap-5 rounded-3xl border border-outline-variant/60 bg-surface-container-low p-5 sm:p-6";
const eyebrow =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink";
const cta =
  "inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-wine transition-transform hover:translate-x-0.5";

export function GuestRegistryMetrics({
  eventId,
  stats,
}: GuestRegistryMetricsProps) {
  const confirmed = stats.acceptedGuests;
  const total = stats.totalAttendees;
  const declined = stats.declinedGuests;
  const awaiting = Math.max(0, total - confirmed - declined);
  const seated = stats.seatedCount;
  const seatedPct =
    confirmed > 0 ? Math.min(100, (seated / confirmed) * 100) : 0;

  const legend = [
    { label: "Attending", value: confirmed, dot: "bg-success" },
    { label: "Declined", value: declined, dot: "bg-error" },
    { label: "Awaiting", value: awaiting, dot: "bg-outline-variant" },
  ];

  return (
    <section
      aria-label="RSVP progress"
      className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5"
    >
      <DeskItem className={`${card} lg:col-span-6`}>
        <div className="flex flex-col gap-3">
          <p className={eyebrow}>Seats confirmed</p>
          <p className="font-serif text-xl text-on-surface-variant">
            <NumberFlow
              value={confirmed}
              className="mr-1.5 text-5xl font-bold tabular-nums text-on-surface"
            />
            of {total} {total === 1 ? "seat" : "seats"}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div
            role="img"
            aria-label={`${confirmed} attending, ${declined} declined, ${awaiting} awaiting reply`}
            className="flex h-2 gap-[3px] overflow-hidden rounded-full"
          >
            <m.i
              className="block bg-success"
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: confirmed }}
              transition={{ type: "spring", visualDuration: 0.7, bounce: 0.1 }}
            />
            <m.i
              className="block bg-error"
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: declined }}
              transition={{ type: "spring", visualDuration: 0.7, bounce: 0.1 }}
            />
            <m.i
              className="block bg-outline-variant"
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: awaiting }}
              transition={{ type: "spring", visualDuration: 0.7, bounce: 0.1 }}
            />
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-on-surface-variant">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${item.dot}`}
                />
                {item.label}
                <b className="font-semibold tabular-nums text-on-surface">
                  {item.value}
                </b>
              </li>
            ))}
          </ul>
        </div>
      </DeskItem>

      <DeskItem className={`${card} lg:col-span-3`}>
        <div className="flex flex-col gap-3">
          <p className={eyebrow}>Awaiting reply</p>
          <p className="font-serif text-xl text-on-surface-variant">
            <NumberFlow
              value={stats.pendingCount}
              className="mr-1.5 text-5xl font-bold tabular-nums text-on-surface"
            />
            {stats.pendingCount === 1 ? "party" : "parties"}
          </p>
        </div>
        {stats.pendingCount === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Every party has replied.
          </p>
        ) : (
          <Link href={`/events/${eventId}/reminders`} className={cta}>
            Send reminders <span aria-hidden="true">→</span>
          </Link>
        )}
      </DeskItem>

      <DeskItem className={`${card} lg:col-span-3`}>
        <div className="flex flex-col gap-3">
          <p className={eyebrow}>Seated</p>
          <p className="font-serif text-xl text-on-surface-variant">
            <NumberFlow
              value={seated}
              className="mr-1.5 text-5xl font-bold tabular-nums text-on-surface"
            />
            of {confirmed}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant/60">
            <m.div
              className="h-full rounded-full bg-gold"
              initial={{ width: 0 }}
              animate={{ width: `${seatedPct}%` }}
              transition={{ type: "spring", visualDuration: 0.7, bounce: 0.1 }}
            />
          </div>
        </div>
        <Link href={`/events/${eventId}/seating`} className={cta}>
          {stats.unassignedCount > 0
            ? `${stats.unassignedCount} still need a table`
            : "Open seating"}{" "}
          <span aria-hidden="true">→</span>
        </Link>
      </DeskItem>
    </section>
  );
}

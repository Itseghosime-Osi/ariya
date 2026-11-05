"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { m } from "motion/react";
import { GuestOverviewStats } from "../types";

interface GuestRegistryMetricsProps {
  eventId: string;
  stats: GuestOverviewStats;
}

export function GuestRegistryMetrics({
  eventId,
  stats,
}: GuestRegistryMetricsProps) {
  const confirmed = stats.acceptedGuests;
  const total = stats.totalAttendees;
  const declined = stats.declinedGuests;
  const awaiting = Math.max(0, total - confirmed - declined);
  const seated = stats.seatedCount;

  const legend = [
    { label: "Attending", value: confirmed, dot: "bg-[#6fd3a0]" },
    { label: "Declined", value: declined, dot: "bg-[#ff8a9b]" },
    { label: "Awaiting", value: awaiting, dot: "bg-white/25" },
  ];

  return (
    <section
      aria-label="RSVP progress"
      className="profile-card relative overflow-hidden rounded-[28px] p-4 text-champagne sm:p-6"
    >
      <span aria-hidden="true" className="profile-card__weave" />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center lg:gap-8">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
            Seats confirmed
          </p>
          <p className="mt-1 font-display text-xl text-champagne/70">
            <NumberFlow
              value={confirmed}
              className="mr-1.5 text-4xl font-bold tabular-nums text-[#fff6dc] sm:text-5xl"
            />
            of {total} {total === 1 ? "seat" : "seats"}
          </p>
          <div
            role="img"
            aria-label={`${confirmed} attending, ${declined} declined, ${awaiting} awaiting reply`}
            className="mt-3 flex h-2 gap-[3px] overflow-hidden rounded-full"
          >
            <m.i
              className="block bg-[#6fd3a0]"
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: confirmed }}
              transition={{ type: "spring", visualDuration: 0.7, bounce: 0.1 }}
            />
            <m.i
              className="block bg-[#ff8a9b]"
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: declined }}
              transition={{ type: "spring", visualDuration: 0.7, bounce: 0.1 }}
            />
            <m.i
              className="block bg-white/25"
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: awaiting }}
              transition={{ type: "spring", visualDuration: 0.7, bounce: 0.1 }}
            />
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-champagne/70">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${item.dot}`}
                />
                {item.label}
                <b className="font-semibold tabular-nums text-[#fff6dc]">
                  {item.value}
                </b>
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-gold/15 rounded-2xl bg-black/20 py-3 text-center ring-1 ring-inset ring-gold/15">
          <div className="flex flex-col items-center gap-0.5 px-2">
            <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-champagne/55">
              Awaiting reply
            </dt>
            <dd className="flex flex-col items-center gap-0.5">
              <span className="font-display text-2xl tabular-nums text-[#fff6dc]">
                {stats.pendingCount}
              </span>
              {stats.pendingCount === 0 ? (
                <span className="text-[11px] text-champagne/60">
                  All replied
                </span>
              ) : (
                <Link
                  href={`/events/${eventId}/reminders`}
                  className="inline-flex min-h-8 items-center text-[11px] font-semibold text-gold"
                >
                  Send reminders →
                </Link>
              )}
            </dd>
          </div>
          <div className="flex flex-col items-center gap-0.5 px-2">
            <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-champagne/55">
              Seated
            </dt>
            <dd className="flex flex-col items-center gap-0.5">
              <span className="font-display text-2xl tabular-nums text-[#fff6dc]">
                {seated}
                <span className="text-sm text-champagne/60">/{confirmed}</span>
              </span>
              <Link
                href={`/events/${eventId}/seating`}
                className="inline-flex min-h-8 items-center text-[11px] font-semibold text-gold"
              >
                {stats.unassignedCount > 0
                  ? `${stats.unassignedCount} need a table →`
                  : "Open seating →"}
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

"use client";

import React from "react";
import NumberFlow from "@number-flow/react";
import { m } from "motion/react";
import { pluralNoun } from "@/lib/metrics";

interface RsvpDonutProps {
  acceptedGuests: number;
  acceptedPartiesPct: number;
  awaitingPartiesPct: number;
  declinedPartiesPct: number;
  totalParties: number;
}

export function RsvpDonut({
  acceptedGuests,
  acceptedPartiesPct,
  awaitingPartiesPct,
  declinedPartiesPct,
  totalParties,
}: RsvpDonutProps) {
  const acc = Math.max(0, Math.min(100, acceptedPartiesPct));
  const awt = Math.max(0, Math.min(100 - acc, awaitingPartiesPct));
  const dec = Math.max(0, Math.min(100 - acc - awt, declinedPartiesPct));

  const peopleUnit = pluralNoun(acceptedGuests, "person", "people");

  return (
    <div
      data-testid="rsvp-donut"
      className="relative flex h-40 w-40 shrink-0 items-center justify-center"
    >
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label={`Guest replies breakdown: ${acc}% accepted, ${awt}% awaiting, ${dec}% declined`}
      >
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke="var(--ivory)"
          strokeWidth="12"
          pathLength={100}
        />

        {totalParties > 0 && acc > 0 && (
          <m.circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="var(--rsvp-accepted)"
            strokeWidth="12"
            strokeLinecap="butt"
            pathLength={100}
            strokeDashoffset={0}
            initial={{ strokeDasharray: "0 100" }}
            animate={{ strokeDasharray: `${acc} ${100 - acc}` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        {totalParties > 0 && awt > 0 && (
          <m.circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="var(--rsvp-awaiting)"
            strokeWidth="12"
            strokeLinecap="butt"
            pathLength={100}
            strokeDashoffset={-acc}
            initial={{ strokeDasharray: "0 100" }}
            animate={{ strokeDasharray: `${awt} ${100 - awt}` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}

        {totalParties > 0 && dec > 0 && (
          <m.circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="var(--rsvp-declined)"
            strokeWidth="12"
            strokeLinecap="butt"
            pathLength={100}
            strokeDashoffset={-(acc + awt)}
            initial={{ strokeDasharray: "0 100" }}
            animate={{ strokeDasharray: `${dec} ${100 - dec}` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        <span
          data-testid="donut-attending-count"
          className="font-display text-3xl font-bold text-night leading-none tabular-nums"
        >
          <NumberFlow value={acceptedGuests} />
        </span>
        <span className="mt-1 text-[11px] font-medium text-label-2 leading-tight">
          {peopleUnit} attending
        </span>
      </div>
    </div>
  );
}

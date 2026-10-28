"use client";

import React, { useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import { pluralise, pluralNoun } from "@/lib/metrics";
import { aggregateEventMetrics } from "../lib/select-events";
import type { EventWithMetrics } from "../types";
import { MetricExplainer } from "./MetricExplainer";

interface GuestRepliesBentoCardProps {
  upcomingEvents: EventWithMetrics[];
}

export function GuestRepliesBentoCard({
  upcomingEvents,
}: GuestRepliesBentoCardProps) {
  const [selectedScope, setSelectedScope] = useState<string>("all");

  const activeMetrics = useMemo(() => {
    if (selectedScope === "all" || upcomingEvents.length <= 1) {
      return aggregateEventMetrics(upcomingEvents);
    }
    const found = upcomingEvents.find((ev) => ev.event.id === selectedScope);
    return found ? found.metrics : aggregateEventMetrics(upcomingEvents);
  }, [selectedScope, upcomingEvents]);

  const rows = [
    {
      key: "accepted",
      label: "Accepted",
      dotClass: "h-2.5 w-2.5 bg-[#6e1426]",
      parties: activeMetrics.acceptedParties,
      pct: activeMetrics.acceptedPartiesPct,
    },
    {
      key: "awaiting",
      label: "Awaiting",
      dotClass: "h-2.5 w-2.5 border-[1.5px] border-[#8a6620] bg-white",
      parties: activeMetrics.awaitingParties,
      pct: activeMetrics.awaitingPartiesPct,
    },
    {
      key: "declined",
      label: "Declined",
      dotClass: "h-1.5 w-1.5 bg-[#b9a9ad]",
      parties: activeMetrics.declinedParties,
      pct: activeMetrics.declinedPartiesPct,
    },
  ];

  return (
    <section
      aria-labelledby="guest-replies-heading"
      data-testid="guest-replies-card"
      className="bento-card @container flex flex-col justify-between p-5 sm:p-6 lg:col-span-4"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <h2
              id="guest-replies-heading"
              className="font-display text-xl font-bold text-night"
            >
              Guest replies
            </h2>
            <MetricExplainer />
          </div>
          <span className="text-xs font-medium text-label-2 tabular-nums">
            {pluralise(activeMetrics.totalParties, "party", "parties")} invited
          </span>
        </div>

        {upcomingEvents.length > 1 && (
          <div className="relative">
            <div
              role="group"
              aria-label="Filter guest replies by celebration"
              data-testid="guest-replies-segmented"
              style={{
                maskImage:
                  "linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, black 0%, black calc(100% - 20px), transparent 100%)",
              }}
              className="flex items-center gap-1 overflow-x-auto snap-x snap-mandatory pr-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <button
                type="button"
                onClick={() => setSelectedScope("all")}
                aria-pressed={selectedScope === "all"}
                title="All upcoming events"
                aria-label="All upcoming events"
                className={`min-h-[32px] snap-start shrink-0 rounded-full px-3 py-1 text-xs transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  selectedScope === "all"
                    ? "bg-burgundy text-white font-semibold"
                    : "bg-surface-container text-night/80 hover:text-night font-medium"
                }`}
              >
                <span className="block truncate">All upcoming events</span>
              </button>
              {upcomingEvents.map(({ event }) => {
                const active = selectedScope === event.id;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedScope(event.id)}
                    aria-pressed={active}
                    title={event.title}
                    aria-label={event.title}
                    className={`min-h-[32px] snap-start shrink-0 rounded-full px-3 py-1 text-xs transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                      active
                        ? "bg-burgundy text-white font-semibold"
                        : "bg-surface-container text-night/80 hover:text-night font-medium"
                    }`}
                  >
                    <span className="block max-w-[140px] truncate">
                      {event.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-col items-center gap-5 @[380px]:flex-row @[380px]:items-center">
        <ReplyWaffle
          accepted={activeMetrics.acceptedPartiesPct}
          awaiting={activeMetrics.awaitingPartiesPct}
          declined={activeMetrics.declinedPartiesPct}
          empty={activeMetrics.totalParties === 0}
        />

        <div className="w-full flex-1">
          <div className="mb-3">
            <span
              data-testid="donut-attending-count"
              className="font-display text-4xl font-bold leading-none text-burgundy tabular-nums"
            >
              <NumberFlow
                value={activeMetrics.acceptedGuests}
                respectMotionPreference
              />
            </span>
            <span className="ml-2 text-xs font-medium text-label-2">
              {pluralNoun(activeMetrics.acceptedGuests, "person", "people")}{" "}
              attending
            </span>
          </div>
          <ul className="space-y-1.5">
            {rows.map((row) => (
              <li
                key={row.key}
                data-testid={`donut-legend-${row.key}`}
                className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`shrink-0 rounded-full ${row.dotClass}`}
                  />
                  <span className="font-semibold text-night">{row.label}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums text-label-2">
                  <span>{pluralise(row.parties, "party", "parties")}</span>
                  <span className="w-9 text-right font-semibold text-night">
                    {row.pct}%
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * A hundred dots, one per percent of invited parties: filled burgundy for accepted, open gold rings
 * for awaiting, small grey dots for declined. Shapes differ, so it reads without colour.
 */
function ReplyWaffle({
  accepted,
  awaiting,
  declined,
  empty,
}: {
  accepted: number;
  awaiting: number;
  declined: number;
  empty: boolean;
}) {
  const a = Math.max(0, Math.min(100, Math.round(accepted)));
  const w = Math.max(0, Math.min(100 - a, Math.round(awaiting)));
  const d = Math.max(0, Math.min(100 - a - w, Math.round(declined)));
  const cells = Array.from({ length: 100 }, (_, i) =>
    empty
      ? "none"
      : i < a
        ? "accepted"
        : i < a + w
          ? "awaiting"
          : i < a + w + d
            ? "declined"
            : "none"
  );
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-36 w-36 shrink-0"
      role="img"
      aria-label={
        empty
          ? "No replies yet"
          : `Guest replies: ${a}% accepted, ${w}% awaiting, ${d}% declined`
      }
    >
      {cells.map((c, i) => {
        const cx = 5 + (i % 10) * 10;
        const cy = 5 + Math.floor(i / 10) * 10;
        const style = {
          transformOrigin: `${cx}px ${cy}px`,
          animation: `desk-star 420ms cubic-bezier(0.34,1.4,0.64,1) ${i * 8}ms both`,
        } as React.CSSProperties;
        if (c === "accepted")
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={3.8}
              fill="#6e1426"
              style={style}
            />
          );
        if (c === "awaiting")
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={3.1}
              fill="#fff"
              stroke="#8a6620"
              strokeWidth={1.3}
              style={style}
            />
          );
        if (c === "declined")
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={2}
              fill="#b9a9ad"
              style={style}
            />
          );
        return (
          <circle key={i} cx={cx} cy={cy} r={1.4} fill="rgba(28,7,13,0.12)" />
        );
      })}
    </svg>
  );
}

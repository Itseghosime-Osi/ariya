"use client";

import React, { useMemo, useState } from "react";
import { pluralise } from "@/lib/metrics";
import { aggregateEventMetrics } from "../lib/select-events";
import type { EventWithMetrics } from "../types";
import { MetricExplainer } from "./MetricExplainer";
import { RsvpDonut } from "./charts/RsvpDonut";

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
      dotClass: "bg-rsvp-accepted",
      parties: activeMetrics.acceptedParties,
      pct: activeMetrics.acceptedPartiesPct,
    },
    {
      key: "awaiting",
      label: "Awaiting",
      dotClass: "bg-rsvp-awaiting",
      parties: activeMetrics.awaitingParties,
      pct: activeMetrics.awaitingPartiesPct,
    },
    {
      key: "declined",
      label: "Declined",
      dotClass: "bg-rsvp-declined",
      parties: activeMetrics.declinedParties,
      pct: activeMetrics.declinedPartiesPct,
    },
  ];

  return (
    <section
      aria-labelledby="guest-replies-heading"
      data-testid="guest-replies-card"
      className="bento-card @container flex flex-col justify-between p-5 sm:p-6 lg:col-span-5"
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
          <div className="relative rounded-full bg-ivory p-1">
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
                    ? "bg-white text-burgundy font-semibold shadow-2xs"
                    : "text-night/75 hover:text-night font-medium"
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
                        ? "bg-white text-burgundy font-semibold shadow-2xs"
                        : "text-night/75 hover:text-night font-medium"
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

      <div className="mt-4 flex flex-col @[360px]:flex-row items-center justify-between gap-5">
        <RsvpDonut
          acceptedGuests={activeMetrics.acceptedGuests}
          acceptedPartiesPct={activeMetrics.acceptedPartiesPct}
          awaitingPartiesPct={activeMetrics.awaitingPartiesPct}
          declinedPartiesPct={activeMetrics.declinedPartiesPct}
          totalParties={activeMetrics.totalParties}
        />

        <ul className="w-full flex-1 space-y-2.5">
          {rows.map((row) => (
            <li
              key={row.key}
              data-testid={`donut-legend-${row.key}`}
              className="flex items-center justify-between gap-2 rounded-2xl bg-ivory/65 px-3.5 py-2 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.dotClass}`}
                />
                <span className="font-semibold text-night">{row.label}</span>
              </div>
              <div className="flex items-center gap-2 text-label-2 tabular-nums">
                <span>{pluralise(row.parties, "party", "parties")}</span>
                <span className="font-semibold text-night w-9 text-right">
                  {row.pct}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

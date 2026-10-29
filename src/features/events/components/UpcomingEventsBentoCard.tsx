"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { EventWithMetrics } from "../types";
import { UpcomingEventTile } from "./UpcomingEventTile";

interface UpcomingEventsBentoCardProps {
  upcomingEvents: EventWithMetrics[];
  totalEventsCount: number;
  onSeeAll?: () => void;
}

export function UpcomingEventsBentoCard({
  upcomingEvents,
  totalEventsCount,
  onSeeAll,
}: UpcomingEventsBentoCardProps) {
  const visibleTiles = upcomingEvents.slice(0, 3);
  const isSingleEventAccount =
    totalEventsCount === 1 && upcomingEvents.length === 1;

  return (
    <section
      aria-labelledby="upcoming-events-heading"
      data-testid="upcoming-events-card"
      className="bento-card @container flex flex-col justify-between p-5 sm:p-6 lg:col-span-8"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2
          id="upcoming-events-heading"
          className="font-display text-xl font-bold text-night"
        >
          Upcoming events
        </h2>

        {totalEventsCount >= 2 && (
          <a
            href="#all-events-card"
            onClick={(e) => {
              if (onSeeAll) {
                e.preventDefault();
                onSeeAll();
              }
            }}
            data-testid="upcoming-see-all"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-burgundy hover:bg-burgundy/8 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <span>See all</span>
            <Icon name="arrow_forward" size={14} />
          </a>
        )}
      </div>

      {visibleTiles.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline bg-ivory/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-semibold text-night">
            No upcoming celebrations
          </p>
          <p className="mt-1 text-xs text-label-2 max-w-sm">
            All of your existing celebrations are in the past. Start a new
            celebration whenever you&apos;re ready.
          </p>
          <Link
            href="/events/new"
            className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-burgundy px-4 py-2 text-xs font-semibold text-white hover:bg-wine transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="add_circle" size={16} />
            <span>New event</span>
          </Link>
        </div>
      ) : (
        <div
          className={`flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory lg:overflow-visible ${
            isSingleEventAccount ? "flex-col" : "flex-row"
          }`}
        >
          {visibleTiles.map((item, idx) => (
            <UpcomingEventTile
              key={item.event.id}
              item={item}
              index={idx}
              isSingleEventAccount={isSingleEventAccount}
            />
          ))}
        </div>
      )}
    </section>
  );
}

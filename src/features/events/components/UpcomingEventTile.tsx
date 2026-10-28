"use client";

import React from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Icon } from "@/components/ui/icon";
import { daysUntil, formatEventDate, getLagosDateKey } from "@/lib/format";
import { pluralise } from "@/lib/metrics";
import type { EventWithMetrics } from "../types";

const TINT_VARS = [
  "var(--tint-blush)",
  "var(--tint-sage)",
  "var(--tint-sand)",
  "var(--tint-sky)",
];

function extractInitials(coupleOrTitle: string): string {
  const cleaned = coupleOrTitle.trim();
  if (!cleaned) return "À";
  const parts = cleaned
    .split(/\s*(?:&|and|\+|\/|-)\s*|\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${Array.from(parts[0])[0] ?? ""}${Array.from(parts[1])[0] ?? ""}`.toUpperCase();
  }
  return (Array.from(parts[0])[0] ?? "À").toUpperCase();
}

interface UpcomingEventTileProps {
  item: EventWithMetrics;
  index: number;
  isSingleEventAccount?: boolean;
}

export function UpcomingEventTile({
  item,
  index,
  isSingleEventAccount = false,
}: UpcomingEventTileProps) {
  const { event, metrics } = item;
  const hasDate = Boolean(getLagosDateKey(event.date));
  const daysLeft = hasDate ? daysUntil(event.date) : null;
  const countdownText = !hasDate
    ? "Date not set"
    : daysLeft === 0
      ? "Today"
      : `${pluralise(daysLeft ?? 0, "day")} left`;

  const initials = extractInitials(event.couple || event.title);
  const tintBg = TINT_VARS[index % TINT_VARS.length];
  const venueLine =
    [event.venue, event.area]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(", ") || "Venue to be announced";

  const repliedPct = Math.max(0, Math.min(100, Math.round(metrics.rsvpRate)));
  const seatedPct =
    metrics.acceptedGuests > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((metrics.seatedGuests / metrics.acceptedGuests) * 100)
          )
        )
      : 0;

  return (
    <Link
      href={`/events/${event.id}`}
      data-testid={`upcoming-event-tile-${event.id}`}
      style={{ backgroundColor: tintBg }}
      className={`bento-tile-hover group flex flex-col justify-between rounded-2xl border border-night/6 p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy snap-start shrink-0 ${
        isSingleEventAccount
          ? "w-full"
          : "w-[272px] sm:w-[290px] lg:w-auto lg:min-w-0 lg:flex-1"
      }`}
    >
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white font-display text-sm font-bold text-burgundy shadow-2xs border border-night/6"
          >
            {initials}
          </span>
          <span
            data-testid={`tile-days-left-${event.id}`}
            className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-night shadow-2xs tabular-nums"
          >
            {countdownText}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold text-night leading-snug line-clamp-1 group-hover:text-burgundy transition-colors">
            {event.title}
          </h3>
          <p className="text-xs font-medium text-label-2 tabular-nums truncate">
            {hasDate ? formatEventDate(event.date) : "Date not set"}
          </p>
          <p className="flex items-center gap-1 text-xs text-label-2 truncate">
            <Icon name="location_on" size={13} className="shrink-0" />
            <span className="truncate">{venueLine}</span>
          </p>
        </div>
      </div>

      <div
        className={`mt-5 pt-3.5 border-t border-night/8 ${
          isSingleEventAccount
            ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
            : "space-y-2"
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-night tabular-nums">
            <span>Replied {repliedPct}%</span>
            <span className="font-semibold">{repliedPct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/80">
            <m.div
              initial={{ width: 0 }}
              animate={{ width: `${repliedPct}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-burgundy"
            />
          </div>
        </div>

        {isSingleEventAccount && (
          <div
            data-testid="single-event-seating-progress"
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs font-medium text-night tabular-nums">
              <span>Seating</span>
              <span className="font-semibold">
                {metrics.seatedGuests} of {metrics.acceptedGuests} seated
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/80">
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${seatedPct}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-rsvp-accepted"
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

"use client";

import React, { ViewTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatEventDate, getLagosDateKey } from "@/lib/format";
import type { EventWithMetrics } from "../types";
import { Countdown } from "./desk/Countdown";

/**
 * The nearest celebration, centre stage: names in Bodoni over the aurora and the Àríyá weave, a live
 * countdown, and a ring of replies. It shares its name with the desk's hero, so opening it morphs one
 * into the other.
 */
export function FeaturedCelebration({
  item,
  now,
}: {
  item: EventWithMetrics;
  now: number;
}) {
  const { event, metrics } = item;
  const hasDate = Boolean(getLagosDateKey(event.date));
  const replied = Math.max(0, Math.min(100, Math.round(metrics.rsvpRate)));
  const venue = [event.venue, event.area]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <ViewTransition
      name={`celebration-${event.id}`}
      share="desk-morph"
      default="none"
    >
      <Link
        href={`/events/${event.id}`}
        onPointerMove={onMove}
        data-testid="featured-celebration"
        className="desk-spot group relative block overflow-hidden rounded-[32px] bg-[#1c070d] text-ivory shadow-[0_30px_60px_-30px_rgba(28,7,13,0.65)] outline-none focus-visible:ring-4 focus-visible:ring-[#e9c98a]/60"
      >
        <div className="desk-aurora" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div
          className="weave absolute inset-0 opacity-[0.06]"
          aria-hidden="true"
        />
        <div className="desk-grain absolute inset-0" aria-hidden="true" />

        <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center lg:p-9">
          <div className="min-w-0 space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
              Next celebration
            </div>
            <div className="font-display text-3xl font-bold leading-tight text-ivory sm:text-5xl">
              {event.couple || event.title}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ivory/80">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" size={14} className="text-[#e9c98a]" />
                {hasDate ? formatEventDate(event.date) : "Date to be set"}
              </span>
              {venue && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="location" size={14} className="text-[#e9c98a]" />
                  {venue}
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-[#e9c98a]">
              Open the celebration desk
              <Icon
                name="arrow_forward"
                size={16}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
          </div>

          <div className="desk-ring flex items-center gap-6 rounded-[28px] bg-[#1c070d]/60 p-5 backdrop-blur-sm sm:p-6">
            {hasDate && <Countdown dateIso={event.date} initialNow={now} />}
            <div
              className="relative grid h-24 w-24 shrink-0 place-items-center"
              aria-label={`${replied}% of guests have replied`}
              role="img"
            >
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(244,239,230,0.12)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#e9c98a"
                  strokeWidth="8"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={`${replied / 100} 1`}
                />
              </svg>
              <div className="text-center leading-none">
                <div className="font-display text-2xl font-bold text-ivory tabular-nums">
                  {replied}%
                </div>
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-ivory/70">
                  replied
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </ViewTransition>
  );
}

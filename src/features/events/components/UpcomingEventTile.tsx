"use client";

import React from "react";
import Link from "next/link";
import { m } from "motion/react";
import { Icon } from "@/components/ui/icon";
import { daysUntil, formatEventDate, getLagosDateKey } from "@/lib/format";
import { pluralise } from "@/lib/metrics";
import type { EventWithMetrics } from "../types";
import { MonogramSeal } from "./desk/MonogramSeal";
import { TiltCard } from "./desk/TiltCard";

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
      : pluralise(daysLeft ?? 0, "day");

  const initials = extractInitials(event.couple || event.title);
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

  const monthShort = hasDate
    ? new Intl.DateTimeFormat("en-GB", {
        month: "short",
        timeZone: "Africa/Lagos",
      })
        .format(new Date(event.date))
        .toUpperCase()
    : "";
  const dayNum = hasDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        timeZone: "Africa/Lagos",
      }).format(new Date(event.date))
    : "";
  const urgent = daysLeft !== null && daysLeft <= 7;

  return (
    <Link
      href={`/events/${event.id}`}
      data-testid={`upcoming-event-tile-${event.id}`}
      className={`group block shrink-0 snap-start rounded-[22px] outline-none focus-visible:ring-4 focus-visible:ring-burgundy/40 ${
        isSingleEventAccount
          ? "w-full"
          : "w-[272px] sm:w-[290px] lg:w-auto lg:min-w-0 lg:flex-1"
      }`}
    >
      <TiltCard max={6} className="h-full rounded-[22px]">
        <div className="desk-paper relative flex h-full flex-col overflow-hidden rounded-[22px] p-5">
          <span className="foil-sheen" aria-hidden="true" />
          <div
            className="weave absolute inset-x-0 top-0 h-8 opacity-[0.1]"
            aria-hidden="true"
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <MonogramSeal
                text={event.couple || event.title || initials}
                size={40}
                className="drop-shadow-md transition-transform duration-500 group-hover:rotate-[-8deg]"
              />
              {hasDate && (
                <div
                  className="grid w-11 shrink-0 overflow-hidden rounded-xl bg-ivory text-center shadow-[0_4px_10px_-6px_rgba(28,7,13,0.4)] ring-1 ring-[#b8864b]/30"
                  aria-hidden="true"
                >
                  <span className="bg-[#6e1426] py-0.5 text-[9px] font-bold tracking-[0.14em] text-ivory">
                    {monthShort}
                  </span>
                  <span className="py-1 font-display text-xl font-bold leading-none text-night">
                    {dayNum}
                  </span>
                </div>
              )}
            </div>
            <span
              data-testid={`tile-days-left-${event.id}`}
              className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                urgent
                  ? "bg-[#6e1426] text-ivory"
                  : "bg-[#1c070d] text-[#e9c98a]"
              }`}
            >
              {countdownText}
            </span>
          </div>

          <div className="relative mt-4">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold leading-snug text-[#6e1426] line-clamp-2 [overflow-wrap:anywhere]">
                {event.title}
              </h3>
              <p className="mt-0.5 text-xs font-medium tabular-nums text-[#4a3a30]">
                {hasDate ? formatEventDate(event.date) : "Date not set"}
              </p>
            </div>
          </div>
          <p
            title={venueLine}
            className="relative mt-2 flex items-center gap-1 truncate text-xs text-[#4a3a30]"
          >
            <Icon
              name="location"
              size={13}
              className="shrink-0 text-[#8a6620]"
            />
            <span className="truncate">{venueLine}</span>
          </p>

          <div
            className="relative mt-auto grid grid-cols-2 gap-2 border-t border-[#b8864b]/25 pt-4"
            style={{ marginTop: "1.25rem" }}
          >
            {(
              [
                ["Replied", repliedPct, `${repliedPct}%`, "#6e1426", null],
                [
                  "Seating",
                  seatedPct,
                  isSingleEventAccount
                    ? `${metrics.seatedGuests} of ${metrics.acceptedGuests} seated`
                    : `${seatedPct}%`,
                  "#2e6a4f",
                  isSingleEventAccount
                    ? "single-event-seating-progress"
                    : undefined,
                ],
              ] as const
            ).map(([label, pct, text, colour, testId]) => (
              <div
                key={label}
                className="flex min-w-0 items-center gap-1.5"
                data-testid={testId ?? undefined}
              >
                <svg
                  viewBox="0 0 36 36"
                  className="h-8 w-8 shrink-0 -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="rgba(184,134,75,0.22)"
                    strokeWidth="4"
                  />
                  <m.circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke={colour}
                    strokeWidth="4"
                    strokeLinecap="round"
                    pathLength={1}
                    initial={{ strokeDasharray: "0 1" }}
                    animate={{
                      strokeDasharray: `${Math.max(0.001, pct / 100)} 1`,
                    }}
                    transition={{
                      duration: 0.9,
                      delay: 0.15 + index * 0.08,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </svg>
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5a474e]">
                    {label}
                  </div>
                  <div className="truncate text-xs font-bold tabular-nums text-night">
                    {text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TiltCard>
    </Link>
  );
}

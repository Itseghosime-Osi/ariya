"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { daysUntil, formatEventDate, getLagosDateKey } from "@/lib/format";
import { pluralise } from "@/lib/metrics";
import { getShareTarget } from "../lib/share";
import type { EventWithMetrics } from "../types";
import { MonogramSeal } from "./desk/MonogramSeal";

interface AllEventsRowProps {
  item: EventWithMetrics;
  isPastTab: boolean;
  copiedId: string | null;
  onCopyShare: (event: EventWithMetrics["event"]) => void;
}

export function AllEventsRow({
  item,
  isPastTab,
  copiedId,
  onCopyShare,
}: AllEventsRowProps) {
  const { event, metrics } = item;
  const hasDate = Boolean(getLagosDateKey(event.date));
  const daysLeft = hasDate ? daysUntil(event.date) : null;
  const seatedPct =
    metrics.acceptedGuests > 0
      ? Math.round((metrics.seatedGuests / metrics.acceptedGuests) * 100)
      : 0;
  const canShare = Boolean(getShareTarget(event));
  const isPaid = Boolean(event.paid_at);

  const replied = Math.max(0, Math.min(100, Math.round(metrics.rsvpRate)));
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
  const daysText = isPastTab
    ? "Past"
    : !hasDate
      ? "—"
      : daysLeft === 0
        ? "Today"
        : pluralise(daysLeft ?? 0, "day");
  const urgent = !isPastTab && daysLeft !== null && daysLeft <= 7;
  const subline = [
    event.couple && event.couple !== event.title ? event.couple : null,
    event.venue,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <tr
      data-testid={`all-events-row-${event.id}`}
      className="group relative transition-colors hover:bg-surface-container"
    >
      <th scope="row" className="py-3 pr-4 font-semibold text-night">
        <Link
          href={`/events/${event.id}`}
          className="flex min-w-[220px] items-center gap-3 rounded-lg hover:text-burgundy"
        >
          <MonogramSeal
            text={event.couple || event.title}
            size={38}
            className="shrink-0 transition-transform duration-300 group-hover:rotate-[-8deg]"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm">{event.title}</span>
            {subline && (
              <span className="block truncate text-[11px] font-normal text-label-2">
                {subline}
              </span>
            )}
          </span>
        </Link>
      </th>
      <td className="whitespace-nowrap px-3 py-3 tabular-nums">
        {hasDate ? (
          <span className="flex items-center gap-2.5">
            <span
              className="grid w-10 overflow-hidden rounded-lg bg-ivory text-center ring-1 ring-hairline"
              aria-hidden="true"
            >
              <span className="bg-burgundy py-px text-[8px] font-bold tracking-[0.12em] text-white">
                {monthShort}
              </span>
              <span className="py-0.5 font-display text-base font-bold leading-none text-night">
                {dayNum}
              </span>
            </span>
            <span className="text-label-2">{formatEventDate(event.date)}</span>
          </span>
        ) : (
          <span className="text-label-2">Date not set</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
            isPastTab
              ? "bg-surface-container text-label-2"
              : urgent
                ? "bg-burgundy text-white"
                : "bg-[#1c070d] text-[#e9c98a]"
          }`}
        >
          {daysText}
        </span>
      </td>
      {(
        [
          [replied, "#6e1426"],
          [seatedPct, "#2e6a4f"],
        ] as const
      ).map(([pct, colour], k) => (
        <td key={k} className="px-3 py-3">
          <span className="flex items-center gap-2 font-semibold tabular-nums text-night">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9.5"
                fill="none"
                stroke="rgba(28,7,13,0.1)"
                strokeWidth="3"
              />
              <circle
                cx="12"
                cy="12"
                r="9.5"
                fill="none"
                stroke={colour}
                strokeWidth="3"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={`${Math.max(0.001, pct / 100)} 1`}
                className="transition-[stroke-dasharray] duration-700"
              />
            </svg>
            {pct}%
          </span>
        </td>
      ))}
      <td className="whitespace-nowrap px-3 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            isPaid
              ? "bg-[#e4eee6] text-[#1f4d36]"
              : "border border-hairline bg-surface-container text-label-2"
          }`}
        >
          {isPaid ? "Paid" : "Free"}
        </span>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        {canShare ? (
          <button
            type="button"
            onClick={() => onCopyShare(event)}
            data-testid={`share-event-${event.id}`}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-hairline bg-ivory px-2.5 py-1 text-[11px] font-semibold text-night hover:bg-surface-container"
          >
            <Icon name={copiedId === event.id ? "check" : "share"} size={13} />
            <span>{copiedId === event.id ? "Link copied" : "Share"}</span>
          </button>
        ) : (
          <Link
            href={`/events/${event.id}/page-editor`}
            data-testid={`not-public-link-${event.id}`}
            className="text-[11px] font-medium text-burgundy hover:underline"
          >
            Not public yet
          </Link>
        )}
      </td>
      <td className="whitespace-nowrap py-3 pl-3 text-right">
        <Link
          href={`/events/${event.id}`}
          className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-burgundy px-3.5 py-1 text-xs font-semibold text-white transition-transform hover:bg-wine group-hover:translate-x-0.5"
        >
          Open
          <Icon name="arrow_forward" size={13} />
        </Link>
      </td>
    </tr>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { daysUntil, formatEventDate, getLagosDateKey } from "@/lib/format";
import { pluralise } from "@/lib/metrics";
import { getShareTarget } from "../lib/share";
import type { EventWithMetrics } from "../types";

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

  return (
    <tr
      data-testid={`all-events-row-${event.id}`}
      className="hover:bg-ivory/45 transition-colors"
    >
      <th
        scope="row"
        className="py-3 pr-4 font-semibold text-night whitespace-nowrap"
      >
        <Link href={`/events/${event.id}`} className="hover:text-burgundy">
          {event.title}
        </Link>
      </th>
      <td className="py-3 px-3 text-label-2 tabular-nums whitespace-nowrap">
        {hasDate ? formatEventDate(event.date) : "Date not set"}
      </td>
      <td className="py-3 px-3 text-night font-medium tabular-nums whitespace-nowrap">
        {isPastTab
          ? "Past"
          : !hasDate
            ? "—"
            : daysLeft === 0
              ? "Today"
              : pluralise(daysLeft ?? 0, "day")}
      </td>
      <td className="py-3 px-3 text-night font-semibold tabular-nums">
        {Math.round(metrics.rsvpRate)}%
      </td>
      <td className="py-3 px-3 text-night font-medium tabular-nums">
        {seatedPct}%
      </td>
      <td className="py-3 px-3 whitespace-nowrap">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            isPaid
              ? "bg-rsvp-accepted/12 text-rsvp-accepted"
              : "bg-ivory text-label-2 border border-hairline"
          }`}
        >
          {isPaid ? "Paid" : "Free"}
        </span>
      </td>
      <td className="py-3 px-3 whitespace-nowrap">
        {canShare ? (
          <button
            type="button"
            onClick={() => onCopyShare(event)}
            data-testid={`share-event-${event.id}`}
            className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-hairline bg-ivory/75 hover:bg-ivory px-2.5 py-1 text-[11px] font-semibold text-night"
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
      <td className="py-3 pl-3 text-right whitespace-nowrap">
        <Link
          href={`/events/${event.id}`}
          className="inline-flex min-h-[32px] items-center rounded-full bg-burgundy px-3.5 py-1 text-xs font-semibold text-white hover:bg-wine"
        >
          Open
        </Link>
      </td>
    </tr>
  );
}

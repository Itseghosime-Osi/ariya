"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  daysBetweenLagos,
  formatEventDate,
  getLagosDateKey,
} from "@/lib/format";
import { pluralise } from "@/lib/metrics";
import type { EventWithMetrics } from "../types";
import { relativeDayLabel } from "../lib/coming-up";
import { getShareTarget } from "../lib/share";
import { RsvpStackedBar } from "./charts/RsvpStackedBar";

interface EventCardProps {
  item: EventWithMetrics;
}

function getCardStatus(item: EventWithMetrics): {
  label: string;
  tone: "emerald" | "amber" | "neutral";
} {
  const { event, metrics } = item;
  if (event.status === "archived")
    return { label: "Archived", tone: "neutral" };
  const hasDate = getLagosDateKey(event.date) !== null;
  if (hasDate && daysBetweenLagos(event.date) < 0) {
    return { label: "Completed", tone: "neutral" };
  }
  if (metrics.totalParties > 0 && metrics.awaitingParties === 0) {
    return { label: "All replies in", tone: "emerald" };
  }
  if (metrics.awaitingParties > 0) {
    return { label: "Needs replies", tone: "amber" };
  }
  return { label: "On track", tone: "emerald" };
}

export function EventCard({ item }: EventCardProps) {
  const { event, metrics } = item;
  const [copied, setCopied] = useState(false);

  const hasDate = getLagosDateKey(event.date) !== null;
  const formattedDate = hasDate ? formatEventDate(event.date) : "Date not set";
  const relLabel = hasDate ? relativeDayLabel(event.date) : "Date not set";
  const status = getCardStatus(item);
  const shareTarget = getShareTarget(event);

  const handleShare = async () => {
    if (!shareTarget) return;
    const url = `${window.location.origin}${shareTarget.path}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTarget.title, url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const statusClasses =
    status.tone === "emerald"
      ? "bg-rsvp-accepted/10 text-rsvp-accepted"
      : status.tone === "amber"
        ? "bg-champagne/45 text-gold-ink"
        : "bg-night/6 text-label-2";

  return (
    <article
      data-testid="event-card"
      style={{ containerType: "inline-size" }}
      className="@container rounded-2xl bg-surface border border-hairline p-5 flex flex-col justify-between gap-4 transition-transform duration-200 [@media(hover:hover)]:hover:-translate-y-0.5 shadow-[0_6px_20px_-12px_rgba(28,15,20,0.12)]"
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex items-center rounded-full bg-ivory px-2.5 py-0.5 font-semibold text-burgundy border border-hairline">
              {relLabel}
            </span>
            <span className="text-label-2 tabular-nums">{formattedDate}</span>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClasses}`}
          >
            {status.label}
          </span>
        </div>

        <h3 className="font-display text-lg sm:text-xl font-semibold text-night leading-snug">
          <Link
            href={`/events/${event.id}`}
            className="hover:text-burgundy transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy rounded"
          >
            {event.title}
          </Link>
        </h3>

        <div className="flex flex-col @[420px]:flex-row @[420px]:items-center gap-1.5 @[420px]:gap-4 text-xs text-label-2">
          {event.venue && (
            <span className="inline-flex items-center gap-1.5 truncate">
              <Icon
                name="location"
                size={14}
                className="text-burgundy shrink-0"
              />
              <span className="truncate">
                {event.venue}
                {event.area ? `, ${event.area}` : ""}
              </span>
            </span>
          )}
          {event.dress_code && (
            <span className="inline-flex items-center gap-1.5 truncate">
              <Icon
                name="styler"
                size={13}
                className="text-gold-ink shrink-0"
              />
              <span className="truncate">{event.dress_code}</span>
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-hairline">
        <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
          <span className="font-semibold text-night">
            {pluralise(
              metrics.acceptedGuests,
              "person attending",
              "people attending"
            )}
          </span>
          <span className="text-label-2">
            {pluralise(metrics.acceptedParties, "party", "parties")} of{" "}
            {metrics.totalParties} accepted
          </span>
        </div>

        <RsvpStackedBar metrics={metrics} height={8} />

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/events/${event.id}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-burgundy/10 px-3.5 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy hover:text-ivory transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <span>Open event</span>
              <Icon name="arrow_forward" size={14} />
            </Link>
            <Link
              href={`/events/${event.id}/guests`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-hairline bg-ivory px-3 py-2 text-xs font-medium text-night hover:border-burgundy/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <span>Guests</span>
            </Link>
          </div>

          {shareTarget && (
            <button
              type="button"
              onClick={handleShare}
              aria-label={`Share public page for ${event.title}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-hairline bg-ivory px-3 py-2 text-xs font-medium text-night hover:border-burgundy/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <Icon name="share" size={14} />
              <span>{copied ? "Copied" : "Share"}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

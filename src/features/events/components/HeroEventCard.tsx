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
import { HeroRsvpPanel } from "./HeroRsvpPanel";

interface HeroEventCardProps {
  item: EventWithMetrics;
}

export function HeroEventCard({ item }: HeroEventCardProps) {
  const { event } = item;
  const [copiedToast, setCopiedToast] = useState(false);

  const hasDate = getLagosDateKey(event.date) !== null;
  const formattedDate = hasDate ? formatEventDate(event.date) : "Date not set";
  const relLabel = hasDate ? relativeDayLabel(event.date) : "Date not set";
  const lagosDiff = hasDate ? daysBetweenLagos(event.date) : NaN;
  const shareTarget = getShareTarget(event);

  const handleShare = async () => {
    if (!shareTarget) return;
    const fullUrl = `${window.location.origin}${shareTarget.path}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: shareTarget.title, url: fullUrl });
        return;
      } catch {
        // Fall back to clipboard copy
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedToast(true);
      window.setTimeout(() => setCopiedToast(false), 3000);
    }
  };

  return (
    <article
      data-testid="hero-event-card"
      aria-labelledby={`hero-title-${event.id}`}
      className="relative overflow-hidden rounded-2xl bg-burgundy text-ivory shadow-[0_14px_34px_-14px_rgba(28,15,20,0.38)]"
    >
      <div
        aria-hidden="true"
        className="h-1 w-full"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #C89B3C 0 28%, #6B1E2E 28% 32%, #E8D2A6 32% 60%, #6B1E2E 60% 64%, #C89B3C 64% 100%)",
        }}
      />

      <div className="p-5 sm:p-7 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-wine px-3 py-1 text-xs font-semibold text-champagne border border-champagne/25">
                  {relLabel}
                </span>
                <span className="text-xs font-medium text-ivory/90 tabular-nums">
                  {formattedDate}
                </span>
              </div>

              {hasDate && !Number.isNaN(lagosDiff) && lagosDiff >= 0 && (
                <time
                  dateTime={event.date}
                  className="inline-flex items-center gap-1.5 rounded-full bg-wine/80 px-3 py-1 text-xs font-semibold tabular-nums text-ivory border border-ivory/15"
                >
                  <Icon
                    name="calendar"
                    size={13}
                    className="text-champagne shrink-0"
                  />
                  <span>
                    {lagosDiff === 0
                      ? "Celebration day"
                      : `${pluralise(lagosDiff, "day")} away`}
                  </span>
                </time>
              )}
            </div>

            {event.couple && (
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-champagne">
                {event.couple}
              </p>
            )}

            <h2
              id={`hero-title-${event.id}`}
              className="font-display font-semibold tracking-[-0.015em] text-ivory leading-[1.15]"
              style={{ fontSize: "clamp(1.625rem, 1.2rem + 1.5vw, 2.25rem)" }}
            >
              {event.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs sm:text-sm text-ivory/90">
              {event.venue && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon
                    name="location"
                    size={15}
                    className="text-champagne shrink-0"
                  />
                  <span>
                    {event.venue}
                    {event.area ? `, ${event.area}` : ""}
                  </span>
                </span>
              )}
              {event.dress_code && (
                <span className="inline-flex items-center gap-1.5">
                  <Icon
                    name="styler"
                    size={15}
                    className="text-champagne shrink-0"
                  />
                  <span>{event.dress_code}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <Link
              href={`/events/${event.id}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-ivory px-4 py-2.5 text-xs sm:text-sm font-semibold text-burgundy shadow-xs transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
            >
              <span>Open event</span>
              <Icon name="arrow_forward" size={16} />
            </Link>

            <Link
              href={`/events/${event.id}/guests`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-ivory/30 bg-wine/60 px-4 py-2.5 text-xs sm:text-sm font-semibold text-ivory transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
            >
              <Icon name="diversity_3" size={16} />
              <span>Guests</span>
            </Link>

            {shareTarget ? (
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-ivory/30 bg-wine/60 px-4 py-2.5 text-xs sm:text-sm font-semibold text-ivory transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
              >
                <Icon name="share" size={15} />
                <span>{copiedToast ? "Public link copied" : "Share"}</span>
              </button>
            ) : (
              <Link
                href={`/events/${event.id}/page-editor`}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-champagne underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
              >
                <Icon name="visibility" size={14} />
                <span>Make public to share</span>
              </Link>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-center">
          <HeroRsvpPanel item={item} />
        </div>
      </div>
    </article>
  );
}

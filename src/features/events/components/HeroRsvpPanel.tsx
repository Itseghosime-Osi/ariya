"use client";

import React from "react";
import NumberFlow from "@number-flow/react";
import { pluralise } from "@/lib/metrics";
import type { EventWithMetrics } from "../types";
import { ProgressRing } from "./charts/ProgressRing";
import { RsvpStackedBar } from "./charts/RsvpStackedBar";
import { MetricExplainer } from "./MetricExplainer";
import { AllRepliesCelebration } from "./AllRepliesCelebration";

interface HeroRsvpPanelProps {
  item: EventWithMetrics;
}

/**
 * Inset warm-ivory RSVP panel (#FFFDF8) inside the burgundy hero card so
 * semantic green/amber/crimson indicators always sit on a high-contrast light surface.
 */
export function HeroRsvpPanel({ item }: HeroRsvpPanelProps) {
  const { event, metrics } = item;

  const seatingPct =
    metrics.acceptedGuests > 0
      ? Math.min(
          100,
          Math.round((metrics.seatedGuests / metrics.acceptedGuests) * 100)
        )
      : 0;

  return (
    <div
      data-testid="hero-rsvp-panel"
      className="rounded-2xl bg-surface text-night p-4 sm:p-5 border border-hairline shadow-sm flex flex-col justify-between gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <ProgressRing percentage={metrics.rsvpRate} size={64} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-display text-2xl sm:text-3xl font-semibold tabular-nums text-night">
                <NumberFlow value={metrics.acceptedGuests} />
              </span>
              <span className="text-sm font-semibold text-night">
                {metrics.acceptedGuests === 1
                  ? "person attending"
                  : "people attending"}
              </span>
            </div>
            <p className="text-xs text-label-2 mt-0.5 tabular-nums">
              Across{" "}
              {pluralise(
                metrics.acceptedParties,
                "accepted party",
                "accepted parties"
              )}{" "}
              of{" "}
              {pluralise(
                metrics.totalParties,
                "invited party",
                "invited parties"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <AllRepliesCelebration
            eventId={event.id}
            totalParties={metrics.totalParties}
            awaitingParties={metrics.awaitingParties}
          />
          <MetricExplainer />
        </div>
      </div>

      <div className="space-y-2.5">
        <RsvpStackedBar metrics={metrics} height={10} />

        <dl className="grid grid-cols-3 gap-2 pt-0.5 text-xs tabular-nums">
          <div className="rounded-lg bg-ivory/80 px-2.5 py-1.5 border border-hairline">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-label-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-rsvp-accepted shrink-0"
              />
              <span>Accepted</span>
            </dt>
            <dd className="mt-0.5 font-semibold text-night">
              {pluralise(metrics.acceptedParties, "party", "parties")}{" "}
              <span className="text-label-2 font-normal">
                ({metrics.acceptedPartiesPct}%)
              </span>
            </dd>
          </div>

          <div className="rounded-lg bg-ivory/80 px-2.5 py-1.5 border border-hairline">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-gold-ink">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-xs bg-rsvp-awaiting shrink-0"
              />
              <span>Awaiting</span>
            </dt>
            <dd className="mt-0.5 font-semibold text-night">
              {pluralise(metrics.awaitingParties, "party", "parties")}{" "}
              <span className="text-label-2 font-normal">
                ({metrics.awaitingPartiesPct}%)
              </span>
            </dd>
          </div>

          <div className="rounded-lg bg-ivory/80 px-2.5 py-1.5 border border-hairline">
            <dt className="flex items-center gap-1.5 text-[11px] font-medium text-label-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-rsvp-declined shrink-0"
              />
              <span>Declined</span>
            </dt>
            <dd className="mt-0.5 font-semibold text-night">
              {pluralise(metrics.declinedParties, "party", "parties")}{" "}
              <span className="text-label-2 font-normal">
                ({metrics.declinedPartiesPct}%)
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="pt-2 border-t border-hairline space-y-1.5">
        <div className="flex items-center justify-between text-xs tabular-nums">
          <span className="font-medium text-label-2">Table seating</span>
          <span className="font-semibold text-night">
            {metrics.seatedGuests} of {metrics.acceptedGuests} seated
          </span>
        </div>
        <div
          aria-hidden="true"
          className="h-1.5 w-full overflow-hidden rounded-full bg-night/8"
        >
          <div
            className="h-full rounded-full bg-burgundy transition-[width] duration-300"
            style={{ width: `${seatingPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

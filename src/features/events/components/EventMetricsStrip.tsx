"use client";

import React from "react";
import type { EventMetrics } from "../types";

interface EventMetricsStripProps {
  metrics: EventMetrics;
}

export function EventMetricsStrip({ metrics }: EventMetricsStripProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm bg-surface-container rounded-2xl p-space-md">
      <div className="space-y-0.5">
        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
          Invited Parties
        </div>
        <div className="font-headline-sm text-headline-sm text-night">
          {metrics.totalParties}
        </div>
        <div className="font-body-sm text-body-sm text-on-surface-variant">
          {metrics.totalParties === 1
            ? "1 party"
            : `${metrics.totalParties} parties`}
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
          Confirmed RSVPs
        </div>
        <div className="font-headline-sm text-headline-sm text-success">
          {metrics.acceptedParties}{" "}
          <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
            ({metrics.readinessPercentage}%)
          </span>
        </div>
        <div className="font-body-sm text-body-sm text-on-surface-variant">
          {metrics.acceptedGuests === 1
            ? "1 person attending"
            : `${metrics.acceptedGuests} people attending`}
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
          Seated
        </div>
        <div className="font-headline-sm text-headline-sm text-night">
          {metrics.seatedGuests}
        </div>
        <div className="font-body-sm text-body-sm text-on-surface-variant">
          of {metrics.acceptedGuests}{" "}
          {metrics.acceptedGuests === 1 ? "person" : "people"}
        </div>
      </div>

      <div className="space-y-0.5">
        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
          Unassigned
        </div>
        <div className="font-headline-sm text-headline-sm text-secondary">
          {metrics.unassignedGuests}
        </div>
        <div className="font-body-sm text-body-sm text-on-surface-variant">
          awaiting table
        </div>
      </div>
    </div>
  );
}

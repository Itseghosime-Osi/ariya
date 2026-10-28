"use client";

import React from "react";
import type { EventMetrics } from "../../types";

interface RsvpTrajectoryChartProps {
  metrics: EventMetrics;
}

export function RsvpTrajectoryChart({ metrics }: RsvpTrajectoryChartProps) {
  const hasResponses = metrics.acceptedGuests > 0 || metrics.declinedGuests > 0;

  if (!hasResponses) {
    return (
      <div className="bg-surface-container-lowest rounded-[24px] p-margin shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] space-y-space-md border border-surface-container-high/40">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">
            RSVP Progress
          </h2>
          <p className="font-body-sm text-on-surface-variant">
            Response progress for invited guests
          </p>
        </div>

        <div className="py-12 text-center flex flex-col items-center justify-center space-y-2 border border-dashed border-outline-variant/60 rounded-2xl bg-surface-container-low/30 px-4">
          <p className="text-sm font-semibold text-neutral-800">
            No RSVPs yet — add guests and send invitations
          </p>
          <p className="text-xs text-neutral-600 max-w-sm">
            Confirmed and declined guest responses will appear here as soon as
            guests reply using their personal invitation links.
          </p>
        </div>
      </div>
    );
  }

  const total = metrics.totalAttendees || 1;
  const acceptedRatio = Math.round((metrics.acceptedGuests / total) * 100);
  const declinedRatio = Math.round((metrics.declinedGuests / total) * 100);
  const awaitingRatio = Math.max(0, 100 - acceptedRatio - declinedRatio);

  return (
    <div className="bg-surface-container-lowest rounded-[24px] p-margin shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] space-y-space-md border border-surface-container-high/40">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-headline-sm text-headline-sm text-primary">
            RSVP Progress
          </h2>
          <p className="font-body-sm text-on-surface-variant">
            {metrics.acceptedGuests} of {metrics.totalAttendees} invited people
            confirmed
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          {metrics.readinessPercentage}% attendance readiness
        </span>
      </div>

      <div className="space-y-3 pt-2">
        <div className="h-4 w-full rounded-full bg-surface-container flex overflow-hidden p-0.5 gap-1">
          {acceptedRatio > 0 && (
            <div
              className="h-full bg-wine rounded-full transition-all"
              style={{ width: `${acceptedRatio}%` }}
              title={`${metrics.acceptedGuests} accepted`}
            />
          )}
          {awaitingRatio > 0 && (
            <div
              className="h-full bg-gold rounded-full transition-all"
              style={{ width: `${awaitingRatio}%` }}
              title={`${metrics.awaitingGuests} awaiting`}
            />
          )}
          {declinedRatio > 0 && (
            <div
              className="h-full bg-mist rounded-full transition-all"
              style={{ width: `${declinedRatio}%` }}
              title={`${metrics.declinedGuests} declined`}
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
            <span className="text-neutral-700 block font-medium">
              Confirmed
            </span>
            <span className="text-base font-bold text-wine">
              {metrics.acceptedGuests}
            </span>
            <span className="text-[11px] text-neutral-600 block">
              {metrics.acceptedParties}{" "}
              {metrics.acceptedParties === 1 ? "party" : "parties"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
            <span className="text-neutral-700 block font-medium">Awaiting</span>
            <span className="text-base font-bold text-amber-800">
              {metrics.awaitingGuests}
            </span>
            <span className="text-[11px] text-neutral-600 block">
              {metrics.awaitingParties}{" "}
              {metrics.awaitingParties === 1 ? "party" : "parties"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40 space-y-0.5">
            <span className="text-neutral-700 block font-medium">Declined</span>
            <span className="text-base font-bold text-neutral-700">
              {metrics.declinedGuests}
            </span>
            <span className="text-[11px] text-neutral-600 block">
              {metrics.declinedParties}{" "}
              {metrics.declinedParties === 1 ? "party" : "parties"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

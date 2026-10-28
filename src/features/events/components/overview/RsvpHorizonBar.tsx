"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import type { EventMetrics } from "../../types";

interface RsvpHorizonBarProps {
  metrics: EventMetrics;
  confirmedPct: number;
  awaitingPct: number;
  declinedPct: number;
}

export function RsvpHorizonBar({
  metrics,
  confirmedPct,
  awaitingPct,
  declinedPct,
}: RsvpHorizonBarProps) {
  return (
    <div className="lg:col-span-7 bg-surface-container-lowest rounded-[24px] p-margin lg:p-margin-lg shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] flex flex-col justify-between space-y-space-lg relative overflow-hidden border border-surface-container-high/40">
      <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none" />

      <div>
        <div className="flex items-center justify-between mb-space-sm">
          <span className="font-label-sm uppercase tracking-widest text-on-surface-variant font-bold">
            Guest Responses
          </span>
          <span className="font-label-sm text-wine font-semibold">
            {metrics.totalParties > 0
              ? `${Math.round(((metrics.acceptedParties + metrics.declinedParties) / metrics.totalParties) * 100)}% responded`
              : "Awaiting invitations"}
          </span>
        </div>

        <div className="flex items-baseline gap-space-sm flex-wrap">
          <span className="font-display text-display text-primary tracking-tight leading-none">
            {metrics.acceptedGuests}
          </span>
          <span className="font-headline-sm text-headline-sm text-on-surface">
            guests confirmed
          </span>
        </div>
        <p className="font-body-md text-on-surface-variant mt-1.5">
          {metrics.acceptedParties} accepted parties · {metrics.acceptedGuests}{" "}
          of {metrics.totalAttendees} people
        </p>
      </div>

      {/* Segmented RSVP Horizon Bar */}
      <div className="space-y-space-xs">
        <div className="h-3.5 w-full rounded-full bg-surface-container flex overflow-hidden p-0.5 gap-1">
          <div
            className="h-full bg-wine rounded-full transition-all duration-500"
            style={{ width: `${confirmedPct}%` }}
            title={`${confirmedPct}% Confirmed`}
          />
          <div
            className="h-full bg-gold rounded-full transition-all duration-500"
            style={{ width: `${awaitingPct}%` }}
            title={`${awaitingPct}% Awaiting`}
          />
          <div
            className="h-full bg-mist rounded-full transition-all duration-500"
            style={{ width: `${declinedPct}%` }}
            title={`${declinedPct}% Declined`}
          />
        </div>

        <div className="flex items-center justify-between font-label-sm text-on-surface-variant pt-1 text-[12px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
            <strong className="text-on-surface font-semibold">
              {metrics.acceptedGuests}
            </strong>{" "}
            Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block" />
            <strong className="text-on-surface font-semibold">
              {metrics.awaitingGuests}
            </strong>{" "}
            Awaiting
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-mist inline-block" />
            <strong className="text-on-surface font-semibold">
              {metrics.declinedGuests}
            </strong>{" "}
            Declined
          </span>
        </div>
      </div>

      {/* Inline Protocol Stat Triad */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-space-xs">
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Seated
            </span>
            <Icon name="chair" className="text-wine text-lg" />
          </div>
          <div className="text-2xl font-bold text-wine">
            {metrics.seatedGuests}
          </div>
          <span className="text-xs font-medium text-neutral-700 block">
            of {metrics.acceptedGuests} people
          </span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Unassigned
            </span>
            <Icon name="pending" className="text-amber-800 text-lg" />
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {metrics.unassignedGuests}
          </div>
          <span className="text-xs font-medium text-neutral-700 block">
            Awaiting placement
          </span>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Parties
            </span>
            <Icon name="diversity_3" className="text-wine text-lg" />
          </div>
          <div className="text-2xl font-bold text-night">
            {metrics.acceptedParties}
          </div>
          <span className="text-xs font-medium text-neutral-700 block">
            Accepted invites
          </span>
        </div>
      </div>
    </div>
  );
}

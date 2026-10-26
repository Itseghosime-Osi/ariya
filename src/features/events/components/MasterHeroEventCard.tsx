"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatLagosDate } from "@/lib/format";
import type { EventWithMetrics } from "../types";

interface MasterHeroEventCardProps {
  item: EventWithMetrics;
}

export function MasterHeroEventCard({ item }: MasterHeroEventCardProps) {
  const { event, metrics } = item;
  const [copied, setCopied] = useState(false);

  const formattedDate = formatLagosDate(event.date);

  const handleShare = async () => {
    const url = `${window.location.origin}/events/${event.id}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="mb-space-xl">
      <div className="relative bg-paper rounded-[24px] p-space-lg lg:p-margin shadow-md overflow-hidden">
        {/* Top Metallic Accent Foil Border simulation */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-gold via-secondary-fixed to-gold" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
          {/* Tactile Visual Column (Velvet Envelope Stationery Presentation) */}
          <div className="lg:col-span-4 relative group">
            <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[4/3] bg-night flex flex-col justify-between p-6">
              {/* Velvet Texture and Monogram Glow */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-wine/60 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-gold/15 blur-2xl pointer-events-none" />

              {/* Subtle Badge Overlay */}
              <div className="relative z-10 self-start px-3 py-1 rounded-full bg-night/85 backdrop-blur-md text-gold font-label-sm text-label-sm shadow-md flex items-center gap-1.5">
                <Icon name="local_florist" className="text-sm" />
                <span>Grand Nuptials &amp; Reception</span>
              </div>

              {/* Center Monogram Wax Seal Graphic */}
              <div className="relative z-10 my-auto flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-wine border-2 border-gold/60 flex items-center justify-center shadow-xl">
                  <span className="font-display text-2xl text-gold font-bold select-none">
                    À
                  </span>
                </div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-gold/80 mt-2 font-bold">
                  Sovereign Seal
                </span>
              </div>

              <div className="relative z-10 flex items-center justify-between text-ivory">
                <div className="font-label-sm text-label-sm tracking-widest uppercase text-gold">
                  Wedding
                </div>
                <div className="font-headline-sm text-headline-sm text-ivory">
                  Main Celebration
                </div>
              </div>
            </div>
          </div>

          {/* Main Info Column */}
          <div className="lg:col-span-8 flex flex-col justify-between h-full space-y-space-md">
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-space-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-ivory font-label-sm text-label-sm font-semibold">
                    Primary Celebration
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm flex items-center gap-1 font-semibold">
                    <Icon name="timer" className="text-sm" />
                    <span>{metrics.daysAway} days to go</span>
                  </span>
                </div>
                {event.registry_code && (
                  <div className="text-right font-label-sm text-label-sm text-on-surface-variant">
                    Registry Code:{" "}
                    <span className="font-mono text-wine font-bold">
                      {event.registry_code}
                    </span>
                  </div>
                )}
              </div>

              <h2 className="font-headline-lg text-headline-lg text-night mb-1 tracking-tight">
                {event.title}
              </h2>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-space-md text-paper-ink font-body-md text-body-md mt-1 mb-space-md">
                <div className="flex items-center gap-1 text-wine">
                  <Icon name="calendar_month" className="text-lg" />
                  <span className="font-semibold">{formattedDate}</span>
                </div>
                <span className="text-mist">•</span>
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <Icon name="location_on" className="text-lg text-wine" />
                  <span>
                    {event.venue}
                    {event.area ? `, ${event.area}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Metric Strip Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm bg-surface-container rounded-2xl p-space-md">
              <div className="space-y-0.5">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Party Roster
                </div>
                <div className="font-headline-sm text-headline-sm text-night">
                  {metrics.totalParties}
                </div>
                <div className="font-body-sm text-body-sm text-mist">
                  {metrics.totalAttendees} verified attendees
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
                <div className="font-body-sm text-body-sm text-mist">
                  {metrics.acceptedGuests} guests attending
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Seated
                </div>
                <div className="font-headline-sm text-headline-sm text-night">
                  {metrics.seatedGuests}
                </div>
                <div className="font-body-sm text-body-sm text-mist">
                  of {metrics.acceptedGuests} confirmed people
                </div>
              </div>

              <div className="space-y-0.5">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Aṣọ-Ẹbí
                </div>
                <div className="font-headline-sm text-headline-sm text-secondary">
                  {metrics.asoEbiRequests}
                </div>
                <div className="font-body-sm text-body-sm text-mist">
                  Packets requested
                </div>
              </div>
            </div>

            {/* Progress Bar Line */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-label-sm font-label-sm text-on-surface-variant">
                <span>Ceremonial Attendance Readiness</span>
                <span className="font-semibold text-wine">
                  {metrics.readinessPercentage}% Confirmed
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-variant overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-wine to-gold rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, metrics.readinessPercentage)}%`,
                  }}
                />
              </div>
            </div>

            {/* Action Strip */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
              <div className="flex items-center gap-space-sm">
                <Link
                  className="px-space-lg py-3 rounded-xl bg-wine hover:bg-primary-container text-ivory font-label-md text-label-md font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 group min-h-[44px]"
                  href={`/events/${event.id}`}
                >
                  <span>Open Celebration Desk</span>
                  <Icon
                    name="arrow_forward"
                    className="text-base text-gold transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <button
                  className="px-space-md py-3 rounded-xl bg-transparent hover:bg-surface-container text-wine font-label-md text-label-md transition-all flex items-center gap-1.5 min-h-[44px]"
                  type="button"
                  onClick={handleShare}
                >
                  <Icon name={copied ? "check" : "share"} className="text-lg" />
                  <span>{copied ? "Link Copied!" : "Share Overview"}</span>
                </button>
              </div>

              {/* Planners pill */}
              <div className="flex items-center -space-x-2 overflow-hidden py-1">
                <div className="w-8 h-8 rounded-full bg-gold/40 flex items-center justify-center text-night font-label-sm text-[10px] font-bold shadow-sm">
                  CT
                </div>
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-[10px] font-bold shadow-sm">
                  AO
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-sm text-[10px] font-bold shadow-sm">
                  FB
                </div>
                <span className="pl-3 font-label-sm text-label-sm text-mist font-medium">
                  +6 planners
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

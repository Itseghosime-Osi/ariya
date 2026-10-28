"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { EventWithMetrics, RecentGuestResponse } from "../types";
import { RsvpHorizonBar } from "./overview/RsvpHorizonBar";
import { RsvpTrajectoryChart } from "./overview/RsvpTrajectoryChart";
import { RecentResponsesFeed } from "./overview/RecentResponsesFeed";
import { NextToCareForCard } from "./overview/NextToCareForCard";

interface EventOverviewDeskProps {
  data: EventWithMetrics;
  recentResponses: RecentGuestResponse[];
}

export function EventOverviewDesk({
  data,
  recentResponses,
}: EventOverviewDeskProps) {
  const { event, metrics } = data;
  const searchParams = useSearchParams();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (searchParams?.get("created")) {
      showToast("Your event has been created");
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete("created");
        window.history.replaceState(
          null,
          "",
          url.pathname + (url.search ? url.search : "")
        );
      }
    }
  }, [searchParams]);

  const totalParties = metrics.totalParties;
  const confirmedPct =
    totalParties > 0
      ? Math.round((metrics.acceptedParties / totalParties) * 100)
      : 0;
  const awaitingPct =
    totalParties > 0
      ? Math.round((metrics.awaitingParties / totalParties) * 100)
      : 0;
  const declinedPct =
    totalParties > 0
      ? Math.round((metrics.declinedParties / totalParties) * 100)
      : 0;

  return (
    <div className="space-y-space-xl pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-night text-gold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-gold/30">
          <Icon name="check_circle" className="text-gold text-lg" />
          <span className="font-body-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Editorial Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-xs">
        <div className="space-y-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-label-sm uppercase tracking-widest text-secondary font-bold">
              Celebration Desk
            </span>
            <span className="text-mist">•</span>
            <span className="font-label-sm text-on-surface-variant font-medium">
              {event.couple}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-space-md gap-y-space-xs">
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
              Every yes, together.
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm tracking-widest uppercase shadow-sm font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              {metrics.daysAway} days to celebration
            </span>
          </div>
        </div>

        {/* Quick Action Desk Bar */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            onClick={() => showToast("Announcement composer drafted.")}
            className="px-space-md py-2.5 rounded-xl bg-surface-container text-primary font-label-md flex items-center gap-2 hover:bg-surface-container-high transition-colors shadow-sm min-h-[44px]"
          >
            <Icon name="drafts" className="text-lg" />
            <span>Draft Announcement</span>
          </button>
          <button
            type="button"
            onClick={() => showToast("Guest registration opened.")}
            className="px-space-md py-2.5 rounded-xl bg-gold text-night font-label-md flex items-center gap-2 hover:bg-secondary-fixed-dim transition-all shadow-[0_4px_16px_-2px_rgba(233,201,138,0.45)] font-semibold min-h-[44px]"
          >
            <Icon name="add_circle" className="text-lg" />
            <span>Register Guest</span>
          </button>
        </div>
      </header>

      {/* Asymmetric Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-stretch">
        <RsvpHorizonBar
          metrics={metrics}
          confirmedPct={confirmedPct}
          awaitingPct={awaitingPct}
          declinedPct={declinedPct}
        />

        {/* 40% Right Area: Curated Stationery Presentation */}
        <div className="lg:col-span-5 bg-paper rounded-[24px] p-space-lg flex flex-col justify-between shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] relative border border-surface-container-high/40">
          <div
            data-testid="invitation-tile"
            className="relative rounded-2xl overflow-hidden aspect-[4/3] w-full shadow-md bg-night flex flex-col justify-between p-6"
          >
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-wine/50 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-gold/20 blur-2xl pointer-events-none" />

            <div className="relative z-10 self-start px-3 py-1 rounded-full bg-night/80 backdrop-blur-md text-gold font-label-sm tracking-wider uppercase flex items-center gap-1.5 font-bold">
              <Icon name="stylus" className="text-sm" />
              <span>YOUR INVITATION</span>
            </div>

            <div className="relative z-10 my-auto flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-wine border-2 border-gold flex items-center justify-center shadow-lg">
                <Icon name="verified" className="text-gold text-2xl" />
              </div>
              <span className="font-headline-sm text-headline-sm text-ivory mt-2 tracking-wide font-serif">
                {event.couple}
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-between text-ivory/80 text-[12px]">
              <span>Ceremony &amp; Reception</span>
              <span className="text-gold font-semibold">
                Personal Guest Link
              </span>
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between">
            <div>
              <div className="font-title-md text-title-md text-paper-ink font-semibold">
                A personal invitation
              </div>
              <p className="font-body-sm text-on-surface-variant">
                Burgundy, ivory and a place for every guest
              </p>
            </div>
            <Link
              href={`/events/${event.id}/guests`}
              className="w-10 h-10 rounded-xl bg-surface-container-highest text-wine hover:bg-gold hover:text-night transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
              title="Inspect Proof Details"
            >
              <Icon name="arrow_forward" className="text-lg" />
            </Link>
          </div>
        </div>
      </section>

      {/* Lower Section: RSVP Pace & Curated Priority Deck */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        <div className="lg:col-span-7 space-y-gutter-lg">
          <RsvpTrajectoryChart metrics={metrics} />
          <RecentResponsesFeed
            eventId={event.id}
            totalAttendees={metrics.totalAttendees}
            recentResponses={recentResponses}
          />
        </div>

        <NextToCareForCard metrics={metrics} onActionToast={showToast} />
      </section>
    </div>
  );
}

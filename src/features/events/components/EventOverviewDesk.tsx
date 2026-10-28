"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { EventWithMetrics, RecentGuestResponse } from "../types";
import type { EventPlanningSnapshot } from "../queries";
import {
  buildPlanningPhases,
  computeReadiness,
  pickNextAction,
  summariseBudget,
} from "../lib/overview-insights";
import { RecentResponsesFeed } from "./overview/RecentResponsesFeed";
import { DeskMotion, DeskItem } from "./desk/DeskMotion";
import { DeskHero } from "./desk/DeskHero";
import { NextActionCard } from "./desk/NextActionCard";
import { ReadinessGauge } from "./desk/ReadinessGauge";
import { GuestConstellation } from "./desk/GuestConstellation";
import { BudgetTile } from "./desk/BudgetTile";
import { PlanningRibbon } from "./desk/PlanningRibbon";

interface EventOverviewDeskProps {
  data: EventWithMetrics;
  recentResponses: RecentGuestResponse[];
  planning: EventPlanningSnapshot;
  /** Server time and the Lagos date key, so first paint matches the server. */
  now: number;
  todayKey: string;
  eventDateKey: string | null;
}

export function EventOverviewDesk({
  data,
  recentResponses,
  planning,
  now,
  todayKey,
  eventDateKey,
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

  const readiness = computeReadiness(metrics, planning.vendors, planning.tasks);
  const phases = buildPlanningPhases(eventDateKey, planning.tasks, todayKey);
  const budget = summariseBudget(planning.vendors);
  const nextAction = pickNextAction({
    eventId: event.id,
    metrics,
    vendors: planning.vendors,
    tasks: planning.tasks,
    todayKey,
  });

  return (
    <div className="pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-night text-gold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-gold/30">
          <Icon name="check_circle" className="text-gold text-lg" />
          <span className="font-body-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      <DeskMotion className="space-y-6 lg:space-y-8">
        <DeskItem>
          <DeskHero
            event={event}
            metrics={metrics}
            initialNow={now}
            checkedInPeople={planning.checkedInPeople}
          />
        </DeskItem>

        <DeskItem>
          <NextActionCard action={nextAction} />
        </DeskItem>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <DeskItem className="lg:col-span-5">
            <ReadinessGauge eventId={event.id} readiness={readiness} />
          </DeskItem>
          <DeskItem className="lg:col-span-4">
            <GuestConstellation
              eventId={event.id}
              guests={planning.guests}
              metrics={metrics}
            />
          </DeskItem>
          <DeskItem className="lg:col-span-3">
            <BudgetTile eventId={event.id} budget={budget} />
          </DeskItem>
        </div>

        <DeskItem>
          <PlanningRibbon phases={phases} />
        </DeskItem>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <DeskItem className="lg:col-span-7">
            <RecentResponsesFeed
              eventId={event.id}
              totalAttendees={metrics.totalAttendees}
              recentResponses={recentResponses}
            />
          </DeskItem>
          <DeskItem className="lg:col-span-5">
            <div className="h-full bg-paper rounded-[24px] p-space-lg flex flex-col justify-between shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] relative border border-surface-container-high/40">
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
          </DeskItem>
        </div>
      </DeskMotion>
    </div>
  );
}

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
  pickNextActions,
  summariseBudget,
} from "../lib/overview-insights";
import { DeskMotion, DeskItem } from "./desk/DeskMotion";
import { DeskHero } from "./desk/DeskHero";
import { NextUpStrip } from "./desk/NextUpStrip";
import { ReadinessRings } from "./desk/ReadinessRings";
import { GuestConstellation } from "./desk/GuestConstellation";
import { BudgetWeave } from "./desk/BudgetWeave";
import { PlanningRibbon } from "./desk/PlanningRibbon";
import { InvitationPreview } from "./desk/InvitationPreview";
import { Guestbook } from "./desk/Guestbook";

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
  const nextActions = pickNextActions({
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
          <NextUpStrip actions={nextActions} />
        </DeskItem>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <DeskItem className="lg:col-span-5">
            <ReadinessRings eventId={event.id} readiness={readiness} />
          </DeskItem>
          <DeskItem className="lg:col-span-7">
            <GuestConstellation
              eventId={event.id}
              guests={planning.guests}
              metrics={metrics}
            />
          </DeskItem>
        </div>

        <DeskItem>
          <BudgetWeave eventId={event.id} budget={budget} />
        </DeskItem>

        <DeskItem>
          <PlanningRibbon eventId={event.id} phases={phases} />
        </DeskItem>

        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
          <DeskItem className="lg:col-span-7">
            <section
              aria-labelledby="guestbook-title"
              className="bento-card flex h-full flex-col p-6 sm:p-7"
            >
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
                    Guestbook
                  </div>
                  <h2
                    id="guestbook-title"
                    className="mt-1 font-display text-2xl font-bold text-night"
                  >
                    Latest replies
                  </h2>
                </div>
                <Link
                  href={`/events/${event.id}/guests`}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-full px-3 text-sm font-semibold text-burgundy hover:bg-surface-container"
                >
                  All {metrics.totalParties} guests
                  <Icon name="arrow_forward" size={14} />
                </Link>
              </div>
              <Guestbook
                entries={recentResponses.map((r) => ({
                  id: r.id,
                  name: r.guestName,
                  status: r.status,
                  partySize:
                    r.status === "accepted"
                      ? r.attendingCount || r.partySize
                      : r.partySize,
                  meta: [
                    /^(bride|groom)$/i.test(r.side ?? "")
                      ? `${r.side.charAt(0).toUpperCase()}${r.side.slice(1).toLowerCase()}'s side`
                      : null,
                    r.groupName,
                    r.tableName
                      ? `Table: ${r.tableName}`
                      : r.status === "accepted"
                        ? "Not seated yet"
                        : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  when: r.timeAgo,
                  href: `/events/${event.id}/guests`,
                }))}
                empty="No replies yet. They'll land here, one note at a time, as guests answer their invitations."
              />
            </section>
          </DeskItem>
          <DeskItem className="lg:col-span-5">
            <InvitationPreview event={event} />
          </DeskItem>
        </div>
      </DeskMotion>
    </div>
  );
}

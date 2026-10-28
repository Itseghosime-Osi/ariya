"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import type { EventMetrics } from "../../types";

interface NextToCareForCardProps {
  metrics: EventMetrics;
  onActionToast: (msg: string) => void;
}

export function NextToCareForCard({
  metrics,
  onActionToast,
}: NextToCareForCardProps) {
  const tasks: React.ReactNode[] = [];

  if (metrics.conflictedParties && metrics.conflictedParties > 0) {
    tasks.push(
      <div
        key="conflicts"
        className="bg-amber-500/20 border border-amber-400/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-amber-500/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-space-xs">
          <div className="flex items-start gap-space-sm">
            <Icon name="warning" className="text-amber-300 mt-0.5 text-xl" />
            <div>
              <h4 className="font-title-md text-ivory font-semibold">
                {metrics.conflictedParties} seating conflict
                {metrics.conflictedParties === 1 ? "" : "s"}
              </h4>
              <p className="font-body-sm text-ivory/80">
                Party size changed on RSVP • Needs table re-assignment
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-label-sm text-amber-300 font-semibold">
            Action required
          </span>
          <button
            type="button"
            onClick={() =>
              onActionToast("Opening seating chart to resolve conflict...")
            }
            className="px-space-md py-1.5 rounded-xl bg-amber-400 text-night font-label-sm hover:bg-amber-300 transition-all font-semibold shadow-sm min-h-[36px]"
          >
            Resolve Seating
          </button>
        </div>
      </div>
    );
  }

  if (metrics.unassignedGuests > 0) {
    tasks.push(
      <div
        key="unassigned"
        className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-space-xs">
          <div className="flex items-start gap-space-sm">
            <Icon
              name="table_chart_view"
              className="text-gold mt-0.5 text-xl"
            />
            <div>
              <h4 className="font-title-md text-ivory font-semibold">
                {metrics.unassignedGuests} unassigned guests
              </h4>
              <p className="font-body-sm text-ivory/70">
                Confirmed attending • Place them at open tables
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-label-sm text-gold">Table seating</span>
          <button
            type="button"
            onClick={() => onActionToast("Navigating to seating chart...")}
            className="px-space-md py-1.5 rounded-xl bg-ivory text-wine font-label-sm hover:bg-paper transition-all font-semibold shadow-sm min-h-[36px]"
          >
            Assign Seats
          </button>
        </div>
      </div>
    );
  }

  if (metrics.awaitingParties > 0) {
    tasks.push(
      <div
        key="awaiting"
        className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-space-xs">
          <div className="flex items-start gap-space-sm">
            <Icon name="outgoing_mail" className="text-gold mt-0.5 text-xl" />
            <div>
              <h4 className="font-title-md text-ivory font-semibold">
                {metrics.awaitingParties}{" "}
                {metrics.awaitingParties === 1 ? "party" : "parties"} awaiting
                replies
              </h4>
              <p className="font-body-sm text-ivory/70">
                {metrics.awaitingGuests}{" "}
                {metrics.awaitingGuests === 1 ? "person" : "people"} total •
                Follow up or send reminders
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-label-sm text-gold">RSVP Follow-up</span>
          <button
            type="button"
            onClick={() => onActionToast("Guest registry opened.")}
            className="px-space-md py-1.5 rounded-xl bg-gold text-night font-label-sm hover:bg-secondary-fixed transition-all font-semibold shadow-sm min-h-[36px]"
          >
            Review Guests
          </button>
        </div>
      </div>
    );
  }

  if (metrics.totalParties === 0) {
    tasks.push(
      <div
        key="empty"
        className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors"
      >
        <div className="flex items-start gap-space-sm">
          <Icon name="group_add" className="text-gold mt-0.5 text-xl" />
          <div>
            <h4 className="font-title-md text-ivory font-semibold">
              Add guests to get started
            </h4>
            <p className="font-body-sm text-ivory/70">
              Import a CSV spreadsheet or register your first guest party
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-label-sm text-gold">Registry setup</span>
          <button
            type="button"
            onClick={() => onActionToast("Opening guest registry...")}
            className="px-space-md py-1.5 rounded-xl bg-gold text-night font-label-sm hover:bg-secondary-fixed transition-all font-semibold shadow-sm min-h-[36px]"
          >
            Add Guests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-5 bg-wine text-ivory rounded-[24px] p-margin lg:p-margin-lg shadow-[0_12px_32px_-6px_rgba(28,7,13,0.18)] space-y-space-lg relative overflow-hidden">
      <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-gold/15 blur-3xl pointer-events-none" />

      <div className="space-y-space-xs relative">
        <div className="flex items-center justify-between">
          <span className="font-label-sm uppercase tracking-widest text-gold font-bold">
            NEXT STEPS
          </span>
          <span className="px-2 py-0.5 rounded-full bg-night/50 text-gold font-label-sm font-semibold">
            {tasks.length} {tasks.length === 1 ? "Item" : "Items"}
          </span>
        </div>
        <h2 className="font-headline-md text-headline-md text-ivory">
          Next to care for
        </h2>
        <p className="font-body-sm text-ivory/80">
          Key priorities for your celebration
        </p>
      </div>

      <div className="space-y-space-md relative">{tasks}</div>
    </div>
  );
}

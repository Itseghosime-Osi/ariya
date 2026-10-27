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
  return (
    <div className="lg:col-span-5 bg-wine text-ivory rounded-[24px] p-margin lg:p-margin-lg shadow-[0_12px_32px_-6px_rgba(28,7,13,0.18)] space-y-space-lg relative overflow-hidden">
      <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-gold/15 blur-3xl pointer-events-none" />

      <div className="space-y-space-xs relative">
        <div className="flex items-center justify-between">
          <span className="font-label-sm uppercase tracking-widest text-gold font-bold">
            NEXT STEPS
          </span>
          <span className="px-2 py-0.5 rounded-full bg-night/50 text-gold font-label-sm font-semibold">
            3 Outstanding
          </span>
        </div>
        <h2 className="font-headline-md text-headline-md text-ivory">
          Next to care for
        </h2>
        <p className="font-body-sm text-mist">
          A few things to take care of this week
        </p>
      </div>

      <div className="space-y-space-md relative">
        {/* Task 1: Follow-ups */}
        <div className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors">
          <div className="flex items-start justify-between gap-space-xs">
            <div className="flex items-start gap-space-sm">
              <Icon name="outgoing_mail" className="text-gold mt-0.5 text-xl" />
              <div>
                <h4 className="font-title-md text-ivory font-semibold">
                  {metrics.awaitingParties} parties awaiting replies
                </h4>
                <p className="font-body-sm text-ivory/70">
                  {metrics.awaitingGuests} people total • Send a friendly
                  reminder
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-label-sm text-gold">Cutoff: 30 Nov</span>
            <button
              type="button"
              onClick={() => onActionToast("Reminder queue opened.")}
              className="px-space-md py-1.5 rounded-xl bg-gold text-night font-label-sm hover:bg-secondary-fixed transition-all font-semibold shadow-sm min-h-[36px]"
            >
              Review Reminders
            </button>
          </div>
        </div>

        {/* Task 2: Seating Placements */}
        <div className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors">
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
                  Confirmed yes • Tables 1 through 8 have open banquet seats
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-label-sm text-gold">Open seating</span>
            <button
              type="button"
              onClick={() => onActionToast("Navigating to seating chart...")}
              className="px-space-md py-1.5 rounded-xl bg-ivory text-wine font-label-sm hover:bg-paper transition-all font-semibold shadow-sm min-h-[36px]"
            >
              Assign Seats
            </button>
          </div>
        </div>

        {/* Task 3: Vendor Confirmations */}
        <div className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors">
          <div className="flex items-start justify-between gap-space-xs">
            <div className="flex items-start gap-space-sm">
              <Icon
                name="restaurant_menu"
                className="text-gold mt-0.5 text-xl"
              />
              <div>
                <h4 className="font-title-md text-ivory font-semibold">
                  2 vendor sign-offs this week
                </h4>
                <p className="font-body-sm text-ivory/70">
                  Catering tasting menu sign-off &amp; Floral arch mockup
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-label-sm text-gold">Due Friday 2pm</span>
            <button
              type="button"
              onClick={() => onActionToast("Opening vendor schedule...")}
              className="px-space-md py-1.5 rounded-xl bg-night text-gold font-label-sm hover:bg-night/80 transition-all font-semibold min-h-[36px]"
            >
              Open Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Protocol Note */}
      <div className="p-space-md rounded-2xl bg-tertiary-container/80 text-on-tertiary-container text-body-sm flex items-center gap-space-sm border border-gold/20">
        <Icon name="info" className="text-gold text-lg shrink-0" />
        <span>
          Aṣọ-Ẹbí distribution batches are ready for guest collection.
        </span>
      </div>
    </div>
  );
}

"use client";

import { GuestOverviewStats } from "../types";
import { Users, UserCheck, UserX, Clock, Armchair } from "lucide-react";

interface GuestRegistryMetricsProps {
  stats: GuestOverviewStats;
}

export function GuestRegistryMetrics({ stats }: GuestRegistryMetricsProps) {
  const cards = [
    {
      label: "Invited Parties",
      value: stats.totalCount,
      subtext: `${stats.totalAttendees} invited seats`,
      icon: Users,
      color: "text-wine bg-wine/10",
    },
    {
      label: "Attending Parties",
      value: stats.acceptedCount,
      subtext: `${stats.acceptedGuests} expected people`,
      icon: UserCheck,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Declined Parties",
      value: stats.declinedCount,
      subtext: "Declined invitation",
      icon: UserX,
      color: "text-red-600 bg-red-50 dark:bg-red-950/40",
    },
    {
      label: "Pending RSVP",
      value: stats.pendingCount,
      subtext: "Awaiting reply",
      icon: Clock,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "Seated People",
      value: `${stats.seatedCount}/${stats.acceptedGuests || stats.totalAttendees}`,
      subtext: `${stats.unassignedCount} unseated`,
      icon: Armchair,
      color: "text-gold bg-gold/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="flex flex-col justify-between rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                {c.label}
              </span>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${c.color}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-serif text-2xl font-bold text-on-surface">
                {c.value}
              </div>
              <div className="text-[11px] text-on-surface-variant truncate mt-0.5">
                {c.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

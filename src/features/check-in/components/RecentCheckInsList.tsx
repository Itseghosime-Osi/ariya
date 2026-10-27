"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { formatLagosTime } from "@/lib/format";
import type { RecentCheckIn } from "../types";

interface RecentCheckInsListProps {
  checkIns: RecentCheckIn[];
}

export function RecentCheckInsList({ checkIns }: RecentCheckInsListProps) {
  return (
    <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-2">
          <Icon name="history" className="text-wine text-base" />
          <h3 className="font-serif text-base font-bold text-wine">
            Admissions Activity Log
          </h3>
        </div>
        <span className="text-[11px] text-on-surface-variant font-mono">
          Last {checkIns.length} check-ins
        </span>
      </div>

      {checkIns.length === 0 ? (
        <div className="p-8 text-center space-y-1">
          <Icon name="groups" className="text-3xl text-wine/40 block mx-auto" />
          <p className="text-xs text-wine font-medium">No admissions yet</p>
          <p className="text-[11px] text-on-surface-variant">
            Guests admitted via camera scan or manual code will appear here in
            real time.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/20 max-h-96 overflow-y-auto">
          {checkIns.map((ci) => (
            <div
              key={ci.id}
              className="py-3 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold text-xs">
                  +{ci.count}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-wine truncate">
                    {ci.guest_name}
                  </p>
                  <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                    <Icon
                      name="table_restaurant"
                      className="text-xs text-wine/60"
                    />
                    <span>{ci.table_name || "Unseated"}</span>
                  </p>
                </div>
              </div>

              <span className="text-[11px] text-on-surface-variant font-mono shrink-0">
                {formatLagosTime(ci.checked_in_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <section className="bento-card space-y-3 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon name="schedule" className="text-base text-gold-ink" />
          <h2 className="font-display text-lg font-bold text-night">
            Admissions Activity Log
          </h2>
        </div>
        <span className="text-[12px] text-label-2">Last {checkIns.length}</span>
      </div>

      {checkIns.length === 0 ? (
        <div className="space-y-1 px-2 py-8 text-center">
          <Icon
            name="diversity_3"
            className="mx-auto block text-3xl text-gold-ink"
          />
          <p className="text-sm font-semibold text-night">No admissions yet</p>
          <p className="text-[13px] text-label-2">
            Guests you admit will appear here as they arrive.
          </p>
        </div>
      ) : (
        <ul className="max-h-96 divide-y divide-hairline overflow-y-auto">
          {checkIns.map((ci) => (
            <li
              key={ci.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] text-[13px] font-bold text-night">
                  +{ci.count}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-night">
                    {ci.guest_name}
                  </p>
                  <p className="flex items-center gap-1 text-[13px] text-label-2">
                    <Icon
                      name="table_restaurant"
                      className="text-sm text-gold-ink"
                    />
                    <span className="truncate">
                      {ci.table_name || "Unseated"}
                    </span>
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-right text-[13px] text-label-2">
                {formatLagosTime(ci.checked_in_at)}
                {ci.waiting && (
                  <span className="mt-0.5 block text-[11px] font-semibold text-gold-ink">
                    Waiting to send
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

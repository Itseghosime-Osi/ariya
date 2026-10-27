"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { SeatingDeskData } from "../types";

interface SeatingHeaderProps {
  eventId: string;
  stats: SeatingDeskData["stats"];
  onAddTable: () => void;
}

export function SeatingHeader({
  eventId,
  stats,
  onAddTable,
}: SeatingHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-low p-4 sm:p-5 rounded-2xl border border-outline-variant/30">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl text-wine font-medium">
            Seating & Floor Plan
          </h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-wine/10 text-wine uppercase tracking-wider">
            V2 23 Protocol
          </span>
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Curate banquet table arrangements, drag guests or assign by keyboard,
          and print charts.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
        {/* Readiness Metric Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-outline-variant/40 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-wine font-semibold">
            {stats.readinessPct}% Seated
          </span>
          <span className="text-on-surface-variant text-[11px]">
            ({stats.seatedAttendees} /{" "}
            {stats.seatedAttendees + stats.unseatedAttendees} guests)
          </span>
        </div>

        {/* Print Button Link */}
        <Link
          href={`/events/${eventId}/seating/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-2 rounded-xl border border-wine/30 text-wine hover:bg-wine/5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Icon name="print" className="text-sm" />
          <span>Print Cards & Chart</span>
        </Link>

        {/* Add Table Button */}
        <button
          type="button"
          onClick={onAddTable}
          className="px-4 py-2 rounded-xl bg-wine hover:bg-wine/90 text-ivory text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Icon name="add" className="text-sm" />
          <span>New Table</span>
        </button>
      </div>
    </div>
  );
}

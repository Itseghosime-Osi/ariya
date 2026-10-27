"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { CheckInStats } from "../types";

interface CheckInHeaderProps {
  eventId: string;
  stats: CheckInStats;
  isRealtimeActive: boolean;
}

export function CheckInHeader({
  eventId,
  stats,
  isRealtimeActive,
}: CheckInHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top breadcrumb & title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-wine/70 mb-1">
            <Link
              href={`/events/${eventId}`}
              className="hover:underline flex items-center gap-1 font-medium"
            >
              <Icon name="arrow_back" className="text-xs" />
              <span>Event Overview</span>
            </Link>
            <span>•</span>
            <span className="text-wine font-semibold">Concierge</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-wine">
            Check-In Desk &amp; Reception Concierge
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Rapid barcode camera admission, unguessable personal codes, and live
            headcount telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-surface-container-low px-3 py-1.5 rounded-full border border-outline-variant/30 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isRealtimeActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span className="text-wine font-medium">
            {isRealtimeActive ? "Realtime Telemetry Active" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-wine/70 block">
            Expected Attendees
          </span>
          <p className="font-serif text-2xl font-bold text-wine">
            {stats.totalExpected}
          </p>
          <span className="text-[11px] text-on-surface-variant block">
            Confirmed RSVPs
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-wine/70 block">
            Admitted Through Desk
          </span>
          <p className="font-serif text-2xl font-bold text-emerald-800">
            {stats.checkedIn}
          </p>
          <span className="text-[11px] text-emerald-700 block">
            Guests in celebration
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-wine/70 block">
            Awaiting Arrival
          </span>
          <p className="font-serif text-2xl font-bold text-amber-900">
            {stats.remaining}
          </p>
          <span className="text-[11px] text-on-surface-variant block">
            Yet to be checked in
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 space-y-1 shadow-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-wine/70 block">
            Attendance Rate
          </span>
          <p className="font-serif text-2xl font-bold text-wine">
            {stats.attendanceRate}%
          </p>
          <div className="w-full bg-surface-container rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="bg-wine h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.attendanceRate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

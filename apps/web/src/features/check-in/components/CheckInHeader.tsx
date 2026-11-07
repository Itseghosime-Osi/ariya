"use client";

import React from "react";
import { ScreenHeader } from "@/components/layout/screen-header";
import type { CheckInStats } from "../types";

interface CheckInHeaderProps {
  eventId: string;
  stats: CheckInStats;
  isRealtimeActive: boolean;
}

/** The desk's heading and its numbers: how many are in, how many are still to come. */
export function CheckInHeader({
  eventId,
  stats,
  isRealtimeActive,
}: CheckInHeaderProps) {
  return (
    <>
      <ScreenHeader
        title="Check-in"
        subtitle="Reception desk"
        backHref={`/events/${eventId}`}
      />

      <header className="flex flex-col gap-3 standalone:max-md:hidden sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            Concierge
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-[1.05] text-night sm:text-4xl">
            Check-In Desk &amp; Reception Concierge
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-label-2">
            Scan a pass or type its code. Nobody is let in until you tap Admit.
          </p>
        </div>
        <span
          role="status"
          className="desk-chip inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-full px-4 text-[13px] font-semibold text-burgundy sm:self-auto"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              isRealtimeActive ? "animate-pulse bg-emerald-600" : "bg-gold"
            }`}
          />
          {isRealtimeActive ? "Live updates on" : "Connecting"}
        </span>
      </header>

      <section
        aria-label="Who has arrived"
        className="profile-card relative overflow-hidden rounded-[28px] p-5 sm:p-6"
      >
        <span aria-hidden="true" className="profile-card__weave" />
        <div className="relative flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f3d98f]">
              Admitted Through Desk
            </p>
            <p className="mt-1 flex items-baseline gap-2 font-display text-[#fff6dc]">
              <span className="text-5xl font-semibold leading-none">
                {stats.checkedIn}
              </span>
              <span className="text-xl text-[#f4e8cc]">
                of {stats.totalExpected} expected
              </span>
            </p>
          </div>
          <p className="shrink-0 font-display text-3xl font-semibold text-[#f3d98f] sm:text-4xl">
            {stats.attendanceRate}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Attendance"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={stats.attendanceRate}
          className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#f6e2ad] to-[#d4a85a] transition-[width] duration-500"
            style={{ width: `${stats.attendanceRate}%` }}
          />
        </div>
        <dl className="relative mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-white/[0.07] px-2 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#f4e8cc]">
              Awaiting Arrival
            </dt>
            <dd className="text-[17px] font-semibold text-[#fff6dc]">
              {stats.remaining}
            </dd>
          </div>
          <div className="rounded-2xl bg-white/[0.07] px-2 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[#f4e8cc]">
              Confirmed RSVPs
            </dt>
            <dd className="text-[17px] font-semibold text-[#fff6dc]">
              {stats.totalExpected}
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}

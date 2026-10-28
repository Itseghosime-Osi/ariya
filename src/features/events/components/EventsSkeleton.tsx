import React from "react";

/**
 * Layout-identical skeleton for /events to prevent layout shift (CLS < 0.05).
 */
export function EventsSkeleton() {
  return (
    <div
      data-testid="events-skeleton"
      aria-busy="true"
      aria-label="Loading your events"
      className="space-y-8 animate-pulse"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3.5 w-36 rounded-full bg-night/8" />
          <div className="h-9 w-52 rounded-xl bg-night/10" />
        </div>
        <div className="hidden md:block h-11 w-36 rounded-xl bg-night/10" />
      </div>

      <div className="h-11 w-64 rounded-xl bg-night/8" />

      <div className="rounded-2xl bg-burgundy/85 p-6 sm:p-8 h-[320px] grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="h-6 w-48 rounded-full bg-ivory/15" />
            <div className="h-10 w-3/4 rounded-xl bg-ivory/20" />
            <div className="h-4 w-1/2 rounded-full bg-ivory/15" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-32 rounded-xl bg-ivory/25" />
            <div className="h-11 w-28 rounded-xl bg-ivory/15" />
          </div>
        </div>
        <div className="lg:col-span-5 rounded-2xl bg-surface/90 p-5" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-52 rounded-2xl bg-surface border border-hairline" />
          <div className="h-52 rounded-2xl bg-surface border border-hairline" />
        </div>
        <div className="lg:col-span-5 h-64 rounded-2xl bg-surface border border-hairline" />
      </div>
    </div>
  );
}

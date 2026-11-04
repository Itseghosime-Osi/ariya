import React from "react";

export function EventsSkeleton() {
  return (
    <div
      role="status"
      data-testid="events-skeleton"
      aria-busy="true"
      aria-label="Loading your events"
      className="space-y-6 animate-pulse"
    >
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3.5 w-36 rounded-md bg-night/8" />
          <div className="h-9 w-48 rounded-lg bg-night/12" />
        </div>
        <div className="hidden md:block h-11 w-32 rounded-full bg-night/12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="bento-card h-64 p-6 lg:col-span-8">
          <div className="h-6 w-40 rounded bg-night/10 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl bg-night/6" />
            <div className="h-44 rounded-2xl bg-night/6 hidden sm:block" />
          </div>
        </div>
        <div className="bento-card h-64 p-6 lg:col-span-4">
          <div className="h-6 w-24 rounded bg-night/10 mb-4" />
          <div className="space-y-3">
            <div className="h-12 rounded-2xl bg-night/6" />
            <div className="h-12 rounded-2xl bg-night/6" />
          </div>
        </div>
        <div className="bento-card h-64 p-6 lg:col-span-5" />
        <div className="bento-card h-64 p-6 lg:col-span-4" />
        <div className="bento-card h-64 p-6 lg:col-span-3" />
      </div>
    </div>
  );
}

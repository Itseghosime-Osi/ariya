import React from "react";

/**
 * Content-only skeleton for every event section. It also gives Link a
 * boundary to prefetch up to, so tapping between sections feels instant.
 */
export default function EventSectionLoading() {
  return (
    <div
      role="status"
      aria-label="Loading celebration section"
      className="space-y-5 animate-pulse"
    >
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-burgundy/10" />
        <div className="h-8 w-64 max-w-full rounded-xl bg-night/10" />
        <div className="h-3 w-80 max-w-full rounded-full bg-night/5" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/80 shadow-2xs" />
        ))}
      </div>
      <div className="h-72 rounded-3xl bg-white/80 shadow-2xs" />
    </div>
  );
}

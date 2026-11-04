import React from "react";
import { Icon } from "@/components/ui/icon";

interface EventsNoResultsProps {
  query: string;
  onClear: () => void;
}

export function EventsNoResults({ query, onClear }: EventsNoResultsProps) {
  return (
    <div
      data-testid="events-no-results"
      className="rounded-2xl bg-surface-container-low border border-hairline p-8 text-center space-y-3"
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-ivory text-label-2">
        <Icon name="search" size={20} />
      </div>
      <p className="font-display text-lg font-semibold text-night">
        No events match &quot;{query}&quot;
      </p>
      <p className="text-xs text-label-2 max-w-sm mx-auto">
        Try searching by event name, couple or host names, or venue.
      </p>
      <div className="pt-1">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-burgundy px-4 py-2 text-xs font-semibold text-ivory hover:bg-wine transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <span>Clear search</span>
        </button>
      </div>
    </div>
  );
}

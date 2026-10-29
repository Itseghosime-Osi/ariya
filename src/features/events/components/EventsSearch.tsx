"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

interface EventsSearchProps {
  query: string;
  onQueryChange: (next: string) => void;
}

export function EventsSearch({ query, onQueryChange }: EventsSearchProps) {
  return (
    <div className="hidden md:block relative w-56" data-testid="events-search">
      <label htmlFor="events-filter-input" className="sr-only">
        Filter events
      </label>
      <Icon
        name="search"
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-label-2"
      />
      <input
        id="events-filter-input"
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Filter events"
        className="w-full min-h-[44px] rounded-full border border-night/15 bg-ivory pl-9 pr-9 py-2 text-sm text-night placeholder:text-label-3 transition-shadow focus:outline-none focus-visible:border-burgundy focus-visible:ring-2 focus-visible:ring-burgundy/25"
      />
      {query && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Clear search"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-label-2 hover:bg-night/6 hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}

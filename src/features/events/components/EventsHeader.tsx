"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { getLagosGreeting } from "@/lib/format";
import { EventsSearch } from "./EventsSearch";

interface EventsHeaderProps {
  firstName?: string | null;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (next: string) => void;
}

export function EventsHeader({
  firstName,
  showSearch = false,
  searchQuery = "",
  onSearchQueryChange,
}: EventsHeaderProps) {
  const greeting = getLagosGreeting();
  const cleanFirstName = firstName?.trim();

  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="space-y-1">
        <p
          data-testid="events-greeting"
          className="text-xs font-semibold uppercase tracking-[0.12em] text-label-2"
        >
          {cleanFirstName ? `${greeting}, ${cleanFirstName}` : greeting}
        </p>
        <h1
          className="font-display font-semibold tracking-[-0.02em] text-night leading-[1.1]"
          style={{
            fontSize: "clamp(1.75rem, 1.35rem + 1.4vw, 2.375rem)",
          }}
        >
          Your events
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showSearch && onSearchQueryChange && (
          <EventsSearch
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
          />
        )}

        <Link
          href="/events/new"
          data-testid="desktop-new-event"
          className="hidden md:inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(107,30,46,0.45)] transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="add_circle" size={18} />
          <span>New event</span>
        </Link>
      </div>
    </header>
  );
}

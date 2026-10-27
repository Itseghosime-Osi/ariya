"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

interface TopBarProps {
  title?: string;
  dateStr?: string;
  daysAway?: number | null;
  onOpenSearch?: () => void;
}

export function TopBar({
  title = "Chidinma & Tunde",
  dateStr = "12 Dec 2026",
  daysAway = 47,
  onOpenSearch,
}: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 md:left-[84px] right-0 h-16 bg-ivory/90 backdrop-blur-xl z-40 border-b border-outline-variant/20">
      <div className="h-16 w-full px-6 md:px-8 flex items-center justify-between">
        {/* Left: Event Quick Context */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <Link
            href="/events"
            className="font-bold text-primary tracking-wide hover:underline"
          >
            {title}
          </Link>
          <span className="text-mist hidden sm:inline">•</span>
          <span className="text-on-surface-variant hidden sm:inline">
            {dateStr}
          </span>
          {daysAway !== null && (
            <>
              <span className="text-mist hidden md:inline">•</span>
              <Badge variant="awaiting" className="text-xs">
                {daysAway > 0
                  ? `${daysAway} days away`
                  : daysAway === 0
                    ? "Today"
                    : "Concluded"}
              </Badge>
            </>
          )}
        </div>

        {/* Right: Search, Workspace Pill, Profile */}
        <div className="flex items-center gap-3">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl bg-surface-container text-on-surface-variant text-xs hover:bg-surface-container-high transition-colors focus:outline-none focus:ring-2 focus:ring-wine"
              title="Search celebration (Cmd + K)"
            >
              <Icon
                name="search"
                size={16}
                className="text-wine"
                aria-hidden="true"
              />
              <span className="sr-only sm:not-sr-only sm:inline">
                Search celebration...
              </span>
              <kbd
                aria-hidden="true"
                className="hidden sm:inline-block rounded bg-surface-container-highest px-1.5 py-0.5 text-[10px] text-on-surface-variant"
              >
                ⌘K
              </kbd>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-container text-on-surface-variant text-xs font-medium">
            <Icon name="verified" size={15} className="text-wine" />
            <span>Àríyá workspace</span>
          </div>

          <Link
            href="/events"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-primary flex items-center justify-center text-ivory hover:opacity-90 transition-opacity"
            title="Celebrations overview"
            aria-label="Celebrations overview"
          >
            <Icon name="celebration" size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}

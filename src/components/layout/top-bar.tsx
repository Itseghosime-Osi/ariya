"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { formatEventDate } from "@/lib/format";

interface TopBarProps {
  title?: string;
  dateStr?: string;
  daysAway?: number | null;
  onOpenSearch?: () => void;
}

export function TopBar({
  title = "Àríyá Celebration",
  dateStr = "",
  daysAway = null,
  onOpenSearch,
}: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 md:left-[84px] right-0 h-16 bg-[#1c070d]/92 text-ivory backdrop-blur-md z-40 border-b border-gold/25 shadow-[0_10px_30px_-18px_rgba(12,4,6,0.7)]">
      <div className="h-16 w-full px-6 md:px-8 flex items-center justify-between">
        {/* Left: Event Quick Context */}
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <Link
            href="/events"
            className="font-display text-[1.35rem] italic leading-none text-ivory hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold rounded"
          >
            {title}
          </Link>
          <span className="text-ivory/40 hidden sm:inline">•</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory/70 hidden sm:inline">
            {dateStr ? formatEventDate(dateStr) : ""}
          </span>
          {daysAway !== null && (
            <>
              <span className="text-ivory/40 hidden md:inline">•</span>
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
              className="flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-full border border-ivory/15 hover:border-gold bg-ivory/[0.06] hover:bg-ivory/[0.1] text-ivory/80 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              title="Search celebration (Cmd + K)"
            >
              <Icon
                name="search"
                size={16}
                className="text-gold"
                aria-hidden="true"
              />
              <span className="sr-only sm:not-sr-only sm:inline">
                Search celebration...
              </span>
              <kbd
                aria-hidden="true"
                className="hidden sm:inline-block rounded-md border border-ivory/15 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-ivory/60"
              >
                ⌘K
              </kbd>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border border-ivory/15 text-ivory/70 text-[11px] font-semibold uppercase tracking-[0.14em]">
            <Icon name="verified" size={15} className="text-gold" />
            <span>Àríyá workspace</span>
          </div>

          <Link
            href="/events"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-ivory/20 hover:border-gold flex items-center justify-center text-ivory hover:text-gold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
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

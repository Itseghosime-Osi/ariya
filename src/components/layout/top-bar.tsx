"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { GlobalSearch } from "./global-search";
import { formatEventDate } from "@/lib/format";
import { signOutAction } from "@/features/auth/actions";

interface TopBarProps {
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;
  daysAway?: number;
}

export function TopBar({
  eventId,
  eventTitle,
  eventDate,
  daysAway,
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="glass sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-3 after:bg-gradient-to-b after:from-ivory/50 after:to-transparent">
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
          <Link
            href="/events"
            className="md:hidden flex items-center gap-1.5 font-display text-lg font-bold text-night shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy rounded-lg px-1"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-burgundy text-sm font-bold text-ivory"
            >
              À
            </span>
            <span>Àríyá</span>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full min-h-[44px] flex items-center justify-between bg-surface/90 hover:bg-surface px-3.5 py-2 rounded-full border border-hairline transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <div className="flex items-center gap-2.5 text-label-2 min-w-0">
              <Icon name="search" size={16} className="shrink-0" />
              <span className="text-xs sm:text-sm truncate">
                Search events, guests, tables...
              </span>
            </div>
            <kbd
              aria-hidden="true"
              className="hidden sm:inline-block rounded bg-ivory px-2 py-0.5 text-[10px] font-medium text-label-2 border border-hairline"
            >
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {eventTitle && (
            <div className="hidden sm:flex items-center gap-2 bg-surface px-3.5 py-1.5 rounded-full border border-hairline">
              <Icon
                name="celebration"
                size={15}
                className="text-burgundy shrink-0"
              />
              <span className="text-xs font-semibold text-night truncate max-w-[180px]">
                {eventTitle}
              </span>
              {eventDate && (
                <>
                  <span className="text-label-3">•</span>
                  <span className="text-xs text-label-2">
                    {formatEventDate(eventDate)}
                  </span>
                </>
              )}
              {typeof daysAway === "number" && daysAway >= 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy text-[11px] font-semibold">
                  {daysAway === 0 ? "Today" : `${daysAway}d`}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              void signOutAction();
            }}
            title="Sign out"
            aria-label="Sign out"
            className="md:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-hairline bg-surface/90 text-label-2 hover:text-burgundy transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </header>

      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        eventId={eventId}
      />
    </>
  );
}

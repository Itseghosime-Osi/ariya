"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "./global-search";
import { signOutAction } from "@/features/auth/actions";

interface TopBarProps {
  eventId?: string;
  userEmail?: string;
}

export function TopBar({ eventId, userEmail }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="glass sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
          <Link
            href="/events"
            className="md:hidden flex items-center gap-1.5 font-display text-lg font-bold text-night shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy rounded-lg px-1"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-burgundy text-sm font-bold text-white"
            >
              À
            </span>
            <span>Àríyá</span>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="w-full min-h-[44px] flex items-center justify-between bg-white/85 hover:bg-white px-3.5 py-2 rounded-full border border-hairline transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Profile & Settings"
                data-testid="user-avatar-menu"
                className="flex min-h-[44px] items-center gap-2 rounded-full border border-hairline bg-white/85 hover:bg-white px-2.5 py-1.5 text-xs font-medium text-night transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-burgundy/12 text-burgundy shrink-0">
                  <Icon name="person" size={16} />
                </span>
                <span className="hidden sm:inline max-w-[160px] truncate text-label-2">
                  {userEmail || "Account"}
                </span>
                <Icon
                  name="expand_more"
                  size={15}
                  className="text-label-2 shrink-0"
                />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56 rounded-2xl border border-hairline bg-surface p-1.5 shadow-lg"
            >
              <DropdownMenuLabel className="px-3 py-2 text-xs font-normal text-label-2 truncate">
                {userEmail || "Signed in"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-hairline" />
              <DropdownMenuItem
                onSelect={() => {
                  void signOutAction();
                }}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-burgundy cursor-pointer"
              >
                <Icon name="logout" size={16} />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

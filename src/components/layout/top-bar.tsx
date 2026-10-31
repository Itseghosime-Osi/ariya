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
import { SignOutConfirmation } from "./SignOutConfirmation";

interface TopBarProps {
  eventId?: string;
  userEmail?: string;
}

export function TopBar({ eventId, userEmail }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  return (
    <>
      <header
        data-top-bar
        className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-gold-ink/20 bg-[#f7f2e8]/94 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md [-webkit-backdrop-filter:blur(10px)] sm:px-6 lg:px-8 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold/60 after:to-transparent"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
          <Link
            href="/events"
            aria-label="Àríyá, all events"
            className="md:hidden flex items-center gap-2 font-display text-[1.55rem] italic leading-none text-night shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy rounded-lg px-1"
          >
            <span>Àríyá</span>
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex w-full min-h-[44px] items-center justify-between bg-white/70 hover:bg-white px-4 py-2 rounded-full border border-gold-ink/25 hover:border-gold-ink/60 transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <div className="flex items-center gap-2.5 text-label-2 min-w-0">
              <Icon name="search" size={16} className="shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] truncate">
                Search events, guests, tables...
              </span>
            </div>
            <kbd
              aria-hidden="true"
              className="hidden sm:inline-block rounded-md border border-gold-ink/25 px-1.5 py-0.5 text-[10px] font-medium text-label-2"
            >
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search events, guests, tables"
            data-testid="mobile-search-trigger"
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-full border border-gold-ink/25 bg-white/70 hover:bg-white hover:border-gold-ink/60 text-night transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="search" size={18} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Profile & Settings"
                data-testid="user-avatar-menu"
                className="flex min-h-[44px] items-center gap-2 rounded-full border border-gold-ink/25 bg-white/70 hover:bg-white hover:border-gold-ink/60 px-2.5 py-1.5 text-xs font-medium text-night transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-burgundy text-champagne shrink-0">
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
              className="w-56 rounded-2xl border border-gold-ink/25 bg-surface p-1.5 shadow-lg"
            >
              <DropdownMenuLabel className="px-3 py-2 text-xs font-normal text-label-2 truncate">
                {userEmail || "Signed in"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1 bg-hairline" />
              <DropdownMenuItem
                onSelect={() => setSignOutOpen(true)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-burgundy cursor-pointer"
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
      <SignOutConfirmation open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  );
}

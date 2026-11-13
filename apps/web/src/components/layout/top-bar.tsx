"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { AccountSheet } from "./account-sheet";
import { GlobalSearch } from "./global-search";
import { HelpButton } from "@/features/onboarding/HelpButton";
import { accountInitials } from "./nav-items";

interface TopBarProps {
  eventId?: string;
  userEmail?: string;
  pendingProposals?: number;
  /** Installed app on a phone: leave the bar out, for screens with their own (screen-header.tsx). */
  hideOnPhone?: boolean;
}

export function TopBar({
  eventId,
  userEmail,
  pendingProposals = 0,
  hideOnPhone = false,
}: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      {/*
        Fixed to the top of the screen on every device, so only the page beneath it scrolls. It sits
        beside the sidebar on wide screens (and slides with it), and the spacer after it keeps the
        page from starting underneath.
      */}
      <header
        data-top-bar
        className={`${hideOnPhone ? "standalone:max-md:hidden " : ""}app-bar sb-offset fixed inset-x-0 top-0 z-30 flex h-[calc(env(safe-area-inset-top)+4rem)] items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6 md:left-[var(--sb-offset)] lg:px-8`}
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
            data-tour="search"
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
          <HelpButton className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold-ink/25 bg-white/70 text-night transition-colors hover:border-gold-ink/60 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy" />
          <Link
            href="/approvals"
            aria-label={
              pendingProposals > 0
                ? `Approvals, ${pendingProposals} waiting`
                : "Approvals"
            }
            data-testid="approvals-link"
            className="relative flex h-11 items-center gap-2 rounded-full border border-gold-ink/25 bg-white/70 px-3 text-night transition-colors hover:border-gold-ink/60 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="pending" size={18} className="shrink-0" />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] sm:inline">
              Approvals
            </span>
            {pendingProposals > 0 ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[11px] font-semibold leading-none text-champagne">
                {pendingProposals > 9 ? "9+" : pendingProposals}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search events, guests, tables"
            data-testid="mobile-search-trigger"
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-full border border-gold-ink/25 bg-white/70 hover:bg-white hover:border-gold-ink/60 text-night transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon name="search" size={18} />
          </button>

          {/* Desktop: the one door for a connected app */}
          <Link
            href="/connect-ai"
            data-testid="connect-ai-link"
            className="group relative hidden h-11 items-center gap-2 overflow-hidden rounded-full border border-gold/45 bg-burgundy pl-3 pr-4 text-champagne transition-[transform,background-color,box-shadow] duration-200 hover:bg-wine hover:shadow-[0_12px_26px_-14px_rgba(107,30,46,0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy motion-safe:hover:-translate-y-px md:flex"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[200%]"
            />
            <Icon name="styler" size={17} className="relative shrink-0" />
            <span className="relative text-[11px] font-semibold uppercase tracking-[0.14em]">
              Connect to an AI
            </span>
          </Link>

          {/* Phone: the account icon opens the sheet */}
          <button
            type="button"
            ref={accountButtonRef}
            onClick={() => setAccountOpen(true)}
            aria-label={`${accountInitials(userEmail)}, Account menu`}
            data-testid="user-avatar-menu"
            className="md:hidden grid h-11 w-11 place-items-center rounded-full border border-gold-ink/25 bg-white/70 text-night transition-colors hover:border-gold-ink/60 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-burgundy font-display text-[12px] font-bold leading-none text-champagne ring-1 ring-gold/40">
              {accountInitials(userEmail)}
            </span>
          </button>
        </div>
      </header>
      <div
        aria-hidden="true"
        className={`${hideOnPhone ? "standalone:max-md:hidden " : ""}h-[calc(env(safe-area-inset-top)+4rem)] shrink-0`}
      />

      <GlobalSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        eventId={eventId}
      />
      <AccountSheet
        open={accountOpen}
        onOpenChange={setAccountOpen}
        userEmail={userEmail}
        eventId={eventId}
        returnFocusTo={accountButtonRef}
      />
    </>
  );
}

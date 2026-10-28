"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/features/auth/actions";
import { NAV_ITEMS } from "./nav-items";

interface SidebarProps {
  eventId?: string;
  userEmail?: string;
}

export function Sidebar({ eventId, userEmail = "Host" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOutAction();
    } finally {
      router.push("/sign-in");
      router.refresh();
    }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full w-[84px] bg-wine z-50 flex-col items-center justify-between py-6 shadow-[0_4px_24px_rgba(28,7,13,0.18)]"
        aria-label="Desktop Navigation"
      >
        <div className="flex flex-col items-center gap-6">
          <Link
            href="/events"
            className="group relative flex items-center justify-center w-12 h-12 rounded-xl bg-night/40 hover:bg-night/60 transition-all focus:outline-none focus:ring-2 focus:ring-gold"
            title="Àríyá Suite"
            aria-label="Àríyá Suite Home"
          >
            <span className="font-display text-2xl font-bold text-gold select-none">
              À
            </span>
            <span className="absolute left-[92px] px-3 py-1.5 rounded-lg bg-night text-ivory text-xs font-semibold uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_2px_8px_rgba(28,7,13,0.3)] z-50">
              Àríyá Suite
            </span>
          </Link>

          <nav className="flex flex-col items-center gap-2 w-full px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = item.activePattern.test(pathname);
              return (
                <Link
                  key={item.name}
                  href={item.href(eventId)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.name}
                  className={cn(
                    "group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-gold",
                    isActive
                      ? "bg-night text-gold shadow-inner"
                      : "text-ivory/80 hover:bg-night/40 hover:text-gold"
                  )}
                >
                  <Icon name={item.icon} size={22} />
                  <span className="absolute left-[92px] px-3 py-1.5 rounded-lg bg-night text-ivory text-xs tracking-wide whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_2px_8px_rgba(28,7,13,0.3)] z-50">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile / Account & Sign Out */}
        <div className="flex flex-col items-center gap-2 relative">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((prev) => !prev)}
            className="group relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gold rounded-full min-w-[44px] min-h-[44px]"
            title="Account & Sign out"
            aria-label="Account Menu"
          >
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center ring-1 ring-gold/40 hover:ring-gold transition-all">
              <Icon name="person" size={20} className="text-gold" />
            </div>
            <span className="absolute left-[92px] px-3 py-1.5 rounded-lg bg-night text-ivory text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_2px_8px_rgba(28,7,13,0.3)] z-50">
              {userEmail}
            </span>
          </button>

          {accountMenuOpen && (
            <div className="absolute left-[92px] bottom-0 p-3 rounded-xl bg-night border border-gold/40 shadow-2xl z-50 w-52 flex flex-col gap-2">
              <div className="text-xs text-ivory/80 truncate font-medium">
                {userEmail}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-wine text-ivory hover:bg-wine/80 text-xs font-semibold tracking-wide transition-colors"
              >
                <Icon name="logout" size={16} />
                <span>Sign out</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="group relative flex items-center justify-center w-10 h-10 rounded-xl text-ivory/70 hover:bg-night/40 hover:text-gold transition-all focus:outline-none focus:ring-2 focus:ring-gold min-w-[44px] min-h-[44px]"
            title="Sign out"
            aria-label="Sign out"
          >
            <Icon name="logout" size={20} />
            <span className="absolute left-[92px] px-3 py-1.5 rounded-lg bg-night text-ivory text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_2px_8px_rgba(28,7,13,0.3)] z-50">
              Sign out
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Tap targets >= 44px) */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-wine z-50 items-center justify-around px-2 border-t border-night/20 shadow-[0_-4px_16px_rgba(28,7,13,0.15)]"
        aria-label="Mobile Navigation"
      >
        {[
          NAV_ITEMS[0],
          NAV_ITEMS[2],
          NAV_ITEMS[3],
          NAV_ITEMS[5],
          NAV_ITEMS[6],
        ].map((item) => {
          const isActive = item.activePattern.test(pathname);
          return (
            <Link
              key={item.name}
              href={item.href(eventId)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.name}
              className={cn(
                "min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 transition-all focus:outline-none focus:ring-2 focus:ring-gold",
                isActive
                  ? "text-gold font-semibold"
                  : "text-ivory/70 hover:text-gold"
              )}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-[9px] tracking-tight truncate max-w-[56px] text-center mt-0.5">
                {item.name.split(" ")[0]}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center rounded-xl p-1 text-ivory/70 hover:text-gold transition-all focus:outline-none focus:ring-2 focus:ring-gold"
        >
          <Icon name="logout" size={20} />
          <span className="text-[9px] tracking-tight truncate max-w-[56px] text-center mt-0.5">
            Sign out
          </span>
        </button>
      </nav>
    </>
  );
}

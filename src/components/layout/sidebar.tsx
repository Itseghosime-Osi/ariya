"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { getNavItems } from "./nav-items";
import { signOutAction } from "@/features/auth/actions";

interface SidebarProps {
  eventId?: string;
  userEmail?: string;
}

export function Sidebar({ eventId, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItems(eventId);

  const isActive = (href: string) => {
    if (href === "/events") {
      return pathname === "/events";
    }
    if (href.match(/^\/events\/[^/]+$/)) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      aria-label="Primary navigation"
      data-testid="desktop-sidebar"
      className="glass hidden md:flex fixed left-0 top-0 h-full md:w-[88px] lg:w-[228px] z-40 flex-col justify-between py-5 px-2 lg:px-3"
    >
      <div className="flex flex-col items-center lg:items-stretch gap-5 min-h-0 flex-1">
        <Link
          href="/events"
          className="flex items-center justify-center lg:justify-start gap-2.5 px-2 py-1.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-burgundy font-display text-lg font-bold text-ivory shadow-xs"
          >
            À
          </span>
          <span className="sr-only lg:not-sr-only lg:inline font-display text-xl font-bold tracking-tight text-night">
            Àríyá
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex flex-col items-center lg:items-stretch gap-1 w-full overflow-y-auto pr-0.5"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 w-full min-h-[44px] px-2 lg:px-3 py-2 rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  active
                    ? "bg-burgundy text-ivory font-semibold shadow-xs"
                    : "text-night hover:bg-burgundy/8 hover:text-burgundy"
                }`}
              >
                <Icon name={item.icon} size={18} className="shrink-0" />
                <span className="text-[11px] lg:text-sm leading-tight truncate max-w-[74px] lg:max-w-none">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center lg:items-stretch gap-2 pt-3 border-t border-hairline">
        <Link
          href="/events"
          title="Profile & Settings"
          className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1.5 lg:gap-2.5 min-h-[44px] px-2 lg:px-3 py-1.5 rounded-xl text-label-2 hover:bg-burgundy/8 hover:text-night transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <div className="w-8 h-8 rounded-full bg-burgundy/12 flex items-center justify-center text-burgundy shrink-0">
            <Icon name="person" size={16} />
          </div>
          <span className="sr-only">Profile &amp; Settings</span>
          <span
            aria-hidden="true"
            className="hidden lg:inline text-xs font-medium text-label-2 truncate"
          >
            {userEmail || "Account"}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => {
            void signOutAction();
          }}
          title="Sign out"
          className="flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-2.5 w-full min-h-[44px] px-2 lg:px-3 py-2 rounded-xl text-label-2 hover:bg-burgundy/8 hover:text-burgundy transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="logout" size={17} />
          <span className="text-[11px] lg:text-xs font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

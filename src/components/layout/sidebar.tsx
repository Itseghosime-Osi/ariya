"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: (eventId?: string) => string;
  icon: IconName;
  activePattern: RegExp;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Desk & Overview",
    href: (id) => (id ? `/events/${id}` : "/events"),
    icon: "space_dashboard",
    activePattern: /^\/events\/[^/]+$/,
  },
  {
    name: "Celebrations",
    href: () => "/events",
    icon: "celebration",
    activePattern: /^\/events$/,
  },
  {
    name: "Guest Registry",
    href: (id) => (id ? `/events/${id}/guests` : "/events"),
    icon: "menu_book",
    activePattern: /\/guests/,
  },
  {
    name: "Seating Plan",
    href: (id) => (id ? `/events/${id}/seating` : "/events"),
    icon: "table_restaurant",
    activePattern: /\/seating/,
  },
  {
    name: "Event Page & Editor",
    href: (id) => (id ? `/events/${id}/page-editor` : "/events"),
    icon: "edit",
    activePattern: /\/page-editor/,
  },
  {
    name: "Invitation Atelier",
    href: (id) => (id ? `/events/${id}/invitations` : "/events"),
    icon: "styler",
    activePattern: /\/invitations/,
  },
  {
    name: "Check-in Desk",
    href: (id) => (id ? `/events/${id}/check-in` : "/events"),
    icon: "qr_code_scanner",
    activePattern: /\/check-in/,
  },
  {
    name: "Vendors",
    href: (id) => (id ? `/events/${id}/vendors` : "/events"),
    icon: "restaurant_menu",
    activePattern: /\/vendors/,
  },
  {
    name: "Team & Roles",
    href: (id) => (id ? `/events/${id}/team` : "/events"),
    icon: "diversity_3",
    activePattern: /\/team/,
  },
  {
    name: "Billing & Invoicing",
    href: (id) => (id ? `/events/${id}/billing` : "/events"),
    icon: "credit_card",
    activePattern: /\/billing/,
  },
];

interface SidebarProps {
  eventId?: string;
  userEmail?: string;
}

export function Sidebar({ eventId, userEmail = "Host" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full w-[84px] bg-wine z-50 flex-col items-center justify-between py-6 shadow-[0_4px_24px_rgba(28,7,13,0.18)]"
        aria-label="Desktop Navigation"
      >
        <div className="flex flex-col items-center gap-6">
          {/* Brand Monogram */}
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

          {/* Navigation items */}
          <nav className="flex flex-col items-center gap-2 w-full px-2">
            {NAV_ITEMS.map((item) => {
              const isActive = item.activePattern.test(pathname);
              const targetHref = item.href(eventId);

              return (
                <Link
                  key={item.name}
                  href={targetHref}
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

        {/* Bottom Profile / Settings */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href={eventId ? `/events/${eventId}/billing` : "/events"}
            className="group relative flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-gold rounded-full min-w-[44px] min-h-[44px]"
            title="Billing & Settings"
            aria-label="Billing & Settings"
          >
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center ring-1 ring-gold/40 hover:ring-gold transition-all">
              <Icon name="person" size={20} className="text-gold" />
            </div>
            <span className="absolute left-[92px] px-3 py-1.5 rounded-lg bg-night text-ivory text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_2px_8px_rgba(28,7,13,0.3)] z-50">
              {userEmail}
            </span>
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Tap targets >= 44px) */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-wine z-50 items-center justify-around px-2 border-t border-night/20 shadow-[0_-4px_16px_rgba(28,7,13,0.15)]"
        aria-label="Mobile Navigation"
      >
        {[
          NAV_ITEMS[0], // Desk
          NAV_ITEMS[2], // Guests
          NAV_ITEMS[3], // Seating
          NAV_ITEMS[5], // Invitations
          NAV_ITEMS[6], // Check-in
        ].map((item) => {
          const isActive = item.activePattern.test(pathname);
          const targetHref = item.href(eventId);

          return (
            <Link
              key={item.name}
              href={targetHref}
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
      </nav>
    </>
  );
}

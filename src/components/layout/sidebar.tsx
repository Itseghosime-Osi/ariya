"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { EventSwitcher } from "./EventSwitcher";
import { getEventSections, type SwitcherEvent } from "./nav-items";

interface SidebarProps {
  events: SwitcherEvent[];
  activeEvent: SwitcherEvent | null;
  onSelectEvent: (eventId: string) => void;
}

export function Sidebar({ events, activeEvent, onSelectEvent }: SidebarProps) {
  const pathname = usePathname();
  const sections = getEventSections(activeEvent?.id);

  const isActive = (href: string) => {
    if (href === "/events") {
      return pathname === "/events";
    }
    if (href.match(/^\/events\/[^/]+$/)) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const homeActive = isActive("/events");

  return (
    <aside
      aria-label="Primary navigation"
      data-testid="desktop-sidebar"
      className="glass hidden md:flex fixed left-0 top-0 h-full w-[244px] z-40 flex-col justify-between py-5 px-3.5"
    >
      <div className="flex flex-col gap-3 min-h-0 flex-1">
        <Link
          href="/events"
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-burgundy font-display text-base font-bold text-white shadow-2xs"
          >
            À
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-night">
            Àríyá
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex flex-col gap-1.5 w-full overflow-y-auto pr-0.5 min-h-0 flex-1"
        >
          <Link
            href="/events"
            aria-current={homeActive ? "page" : undefined}
            className={`flex items-center gap-3 w-full h-11 min-h-[44px] px-3.5 rounded-full text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
              homeActive
                ? "bg-white text-burgundy font-semibold shadow-sm"
                : "text-night/75 hover:bg-white/60 hover:text-night font-medium"
            }`}
          >
            <Icon
              name="celebration"
              size={18}
              className={homeActive ? "text-burgundy shrink-0" : "shrink-0"}
            />
            <span className="truncate">Home</span>
          </Link>

          <div className="my-1">
            <EventSwitcher
              events={events}
              activeEvent={activeEvent}
              onSelectEvent={onSelectEvent}
            />
          </div>

          {sections.length > 0 && (
            <div
              data-testid="sidebar-event-sections"
              className="flex flex-col gap-1 pt-0.5"
            >
              {sections.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 w-full h-11 min-h-[44px] px-3.5 rounded-full text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                      active
                        ? "bg-white text-burgundy font-semibold shadow-sm"
                        : "text-night/75 hover:bg-white/60 hover:text-night font-medium"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      size={18}
                      className={active ? "text-burgundy shrink-0" : "shrink-0"}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventSwitcher } from "./EventSwitcher";
import {
  getPhoneMoreSections,
  getPhonePrimaryTabs,
  type SwitcherEvent,
} from "./nav-items";

interface PhoneTabBarProps {
  events: SwitcherEvent[];
  activeEvent: SwitcherEvent | null;
  onSelectEvent: (eventId: string) => void;
}

export function PhoneTabBar({
  events,
  activeEvent,
  onSelectEvent,
}: PhoneTabBarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryTabs = getPhonePrimaryTabs(activeEvent?.id);
  const moreSections = getPhoneMoreSections(activeEvent?.id);

  const isActive = (href: string, name: string) => {
    if (name === "Home") return pathname === "/events";
    if (href === "/events") return false;
    return pathname.startsWith(href);
  };

  const isMoreActive = moreSections.some((item) => {
    if (item.href.match(/^\/events\/[^/]+$/)) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  });

  return (
    <>
      <div
        className="fixed left-3 right-3 z-40 pointer-events-none md:hidden"
        style={{
          bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
      >
        <nav
          aria-label="Mobile navigation"
          data-testid="phone-tab-bar"
          className="glass pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-full p-1.5"
        >
          {primaryTabs.map((item) => {
            const active = isActive(item.href, item.name);
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  active
                    ? "bg-white text-burgundy font-semibold shadow-sm"
                    : "text-night/75 hover:text-night font-medium"
                }`}
              >
                <Icon name={item.icon} size={17} />
                <span className="leading-none truncate">{item.name}</span>
              </Link>
            );
          })}

          <button
            type="button"
            data-testid="phone-more-button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
            className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
              moreOpen || isMoreActive
                ? "bg-white text-burgundy font-semibold shadow-sm"
                : "text-night/75 hover:text-night font-medium"
            }`}
          >
            <Icon name="more_horiz" size={17} />
            <span className="leading-none">More</span>
          </button>
        </nav>
      </div>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent
          data-testid="phone-more-sheet"
          className="fixed inset-x-3 bottom-3 top-auto translate-x-0 translate-y-0 max-w-md mx-auto rounded-3xl border border-hairline bg-ivory p-5 shadow-2xl"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-lg font-bold text-night">
              Celebration menu
            </DialogTitle>
            <DialogDescription className="text-xs text-label-2">
              Switch celebrations or jump to any section.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <EventSwitcher
              events={events}
              activeEvent={activeEvent}
              onSelectEvent={(id) => {
                onSelectEvent(id);
              }}
            />

            {moreSections.length > 0 && (
              <div
                data-testid="phone-more-sections"
                className="grid grid-cols-2 gap-1.5 pt-1"
              >
                {moreSections.map((item) => {
                  const active = item.href.match(/^\/events\/[^/]+$/)
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex min-h-[44px] items-center gap-2.5 rounded-2xl px-3 py-2 text-xs transition-colors ${
                        active
                          ? "bg-white text-burgundy font-semibold shadow-xs"
                          : "bg-white/60 text-night/80 hover:bg-white hover:text-night font-medium"
                      }`}
                    >
                      <Icon name={item.icon} size={16} className="shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

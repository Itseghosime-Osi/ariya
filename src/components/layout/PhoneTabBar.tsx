"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { getPhoneTabItems } from "./nav-items";

interface PhoneTabBarProps {
  eventId?: string;
  primaryEventId?: string;
}

export function PhoneTabBar({ eventId, primaryEventId }: PhoneTabBarProps) {
  const pathname = usePathname();
  const tabs = getPhoneTabItems(eventId, primaryEventId);

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
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pt-1 pointer-events-none md:hidden"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <nav
        aria-label="Mobile navigation"
        data-testid="phone-tab-bar"
        className="glass pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-full px-1.5 py-1"
      >
        {tabs.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                active
                  ? "bg-burgundy text-ivory font-semibold shadow-xs"
                  : "text-night hover:text-burgundy"
              }`}
            >
              <Icon name={item.icon} size={17} />
              <span className="leading-none truncate max-w-[64px]">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

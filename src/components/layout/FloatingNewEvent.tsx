"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface FloatingNewEventProps {
  href?: string;
}

/**
 * Burgundy "New event" floating capsule positioned bottom-right above the
 * phone bottom tab bar (< md), hidden on desktop/tablet where the header CTA shows.
 */
export function FloatingNewEvent({
  href = "/events/new",
}: FloatingNewEventProps) {
  return (
    <div
      className="fixed right-4 z-40 md:hidden"
      style={{
        bottom: "calc(4.75rem + env(safe-area-inset-bottom))",
      }}
    >
      <Link
        href={href}
        data-testid="floating-new-event"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-burgundy px-4 py-2.5 text-sm font-semibold text-ivory shadow-[0_10px_24px_-6px_rgba(107,30,46,0.5)] transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <Icon name="add_circle" size={18} />
        <span>New event</span>
      </Link>
    </div>
  );
}

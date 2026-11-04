import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface StaffBlockedBannerProps {
  eventId: string;
}

export function StaffBlockedBanner({ eventId }: StaffBlockedBannerProps) {
  return (
    <div className="max-w-xl mx-auto my-12 bg-[var(--surface-container-low)] border border-gold-ink/25 rounded-3xl p-8 text-center space-y-4 shadow-lg">
      <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
        <Icon name="lock" className="text-2xl" />
      </div>

      <div className="space-y-1">
        <h3 className="font-serif text-xl font-bold text-night">
          Billing Access Restricted
        </h3>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
          Event staff accounts are assigned operational check-in roles only.
          Financial records and subscription billing are restricted to the host
          couple and planners.
        </p>
      </div>

      <div className="pt-2">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all shadow-xs"
        >
          <Icon name="arrow_back" className="text-sm" />
          <span>Return to Celebration Desk</span>
        </Link>
      </div>
    </div>
  );
}

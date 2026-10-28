import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import type {
  NeedsAttentionAlert,
  NeedsAttentionKind,
} from "../lib/needs-attention";

const KIND_ICON: Record<NeedsAttentionKind, IconName> = {
  rsvp_deadline: "schedule",
  unseated_guests: "chair",
  free_plan_limit: "outgoing_mail",
  event_soon: "celebration",
};

interface NeedsAttentionItemProps {
  item: NeedsAttentionAlert;
}

export function NeedsAttentionItem({ item }: NeedsAttentionItemProps) {
  const iconName = KIND_ICON[item.kind];

  return (
    <li className="rounded-xl bg-surface border border-hairline px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coral/12 text-coral"
        >
          <Icon name={iconName} size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-night leading-snug">
            {item.message}
          </p>
          <p className="text-[11px] font-medium text-label-2 truncate mt-0.5">
            {item.eventTitle}
          </p>
        </div>
      </div>

      <Link
        href={item.href}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <span>{item.ctaLabel}</span>
        <Icon name="arrow_forward" size={14} />
      </Link>
    </li>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import type {
  NeedsAttentionAlert,
  NeedsAttentionKind,
} from "../lib/needs-attention";

const KIND_ICON: Record<
  NeedsAttentionKind,
  { icon: IconName; badgeClass: string }
> = {
  rsvp_deadline: {
    icon: "schedule",
    badgeClass: "bg-rsvp-awaiting/14 text-gold-ink",
  },
  unseated_guests: {
    icon: "table_restaurant",
    badgeClass: "bg-burgundy/10 text-burgundy",
  },
  free_plan_limit: {
    icon: "credit_card",
    badgeClass: "bg-coral/12 text-coral",
  },
  event_soon: {
    icon: "celebration",
    badgeClass: "bg-rsvp-accepted/12 text-rsvp-accepted",
  },
};

interface TodoBentoCardProps {
  alerts: NeedsAttentionAlert[];
}

export function TodoBentoCard({ alerts }: TodoBentoCardProps) {
  return (
    <section
      aria-labelledby="todo-bento-heading"
      data-testid="todo-bento-card"
      className="bento-card @container flex flex-col justify-between p-5 sm:p-6 lg:col-span-4"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2
          id="todo-bento-heading"
          className="font-display text-xl font-bold text-night"
        >
          To do
        </h2>
        {alerts.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-burgundy/10 px-2.5 py-0.5 text-xs font-semibold text-burgundy tabular-nums">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div
          data-testid="todo-empty-state"
          className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-ivory/60 px-4 py-8 text-center"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rsvp-accepted/12 text-rsvp-accepted mb-2.5">
            <Icon name="check_circle" size={20} />
          </span>
          <p className="text-sm font-semibold text-night">
            You&apos;re all caught up
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-hairline -my-1 flex-1 flex flex-col justify-center">
          {alerts.map((alert) => {
            const style = KIND_ICON[alert.kind];
            return (
              <li key={alert.id} className="py-1.5">
                <Link
                  href={alert.href}
                  data-testid={`todo-item-${alert.id}`}
                  className="group flex min-h-[48px] items-center justify-between gap-3 rounded-2xl px-2.5 py-2 hover:bg-ivory/75 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.badgeClass}`}
                    >
                      <Icon name={style.icon} size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-night truncate group-hover:text-burgundy transition-colors tabular-nums">
                        {alert.message}
                      </p>
                      <p className="text-[11px] text-label-2 truncate">
                        {alert.eventTitle}
                      </p>
                    </div>
                  </div>
                  <Icon
                    name="chevron_right"
                    size={18}
                    className="shrink-0 text-label-2 group-hover:text-burgundy transition-colors"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

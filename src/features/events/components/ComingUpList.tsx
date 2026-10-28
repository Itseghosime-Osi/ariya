import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import {
  groupByLagosDay,
  type ComingUpItem,
  type ComingUpKind,
} from "../lib/coming-up";

const KIND_BADGE: Record<
  ComingUpKind,
  { label: string; icon: IconName; classes: string }
> = {
  event_date: {
    label: "Celebration",
    icon: "celebration",
    classes: "bg-burgundy/10 text-burgundy",
  },
  rsvp_deadline: {
    label: "RSVP cutoff",
    icon: "schedule",
    classes: "bg-champagne/45 text-gold-ink",
  },
  vendor_task: {
    label: "Vendor task",
    icon: "restaurant_menu",
    classes: "bg-night/6 text-label-2",
  },
};

interface ComingUpListProps {
  items: ComingUpItem[];
}

export function ComingUpList({ items }: ComingUpListProps) {
  const dayGroups = groupByLagosDay(items);

  return (
    <section
      aria-labelledby="coming-up-heading"
      data-testid="coming-up-section"
      className="rounded-2xl bg-surface border border-hairline p-5 space-y-4"
    >
      <div>
        <h2
          id="coming-up-heading"
          className="font-display text-lg font-semibold text-night"
        >
          Coming up in the next 14 days
        </h2>
        <p className="text-xs text-label-2 mt-0.5">
          Vendor tasks, RSVP cutoffs, and celebration dates in WAT
        </p>
      </div>

      {dayGroups.length === 0 ? (
        <div
          data-testid="coming-up-empty"
          className="rounded-xl bg-ivory/70 border border-hairline p-5 text-center space-y-1.5"
        >
          <p className="text-sm font-semibold text-night">
            Nothing due in the next 14 days
          </p>
          <p className="text-xs text-label-2">
            Upcoming tasks and deadlines across your events will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayGroups.map((group) => (
            <div key={group.lagosDateKey} className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-burgundy">
                  {group.relativeLabel}
                </span>
                <span className="text-label-2 tabular-nums">
                  {group.formattedDateWAT}
                </span>
              </div>

              <ul className="space-y-2">
                {group.items.map((item) => {
                  const badge = KIND_BADGE[item.kind];
                  return (
                    <li
                      key={item.id}
                      className="rounded-xl bg-ivory/65 border border-hairline p-3 hover:border-burgundy/30 transition-colors"
                    >
                      <Link
                        href={item.href}
                        className="flex items-start justify-between gap-3 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy rounded-lg"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.classes}`}
                            >
                              <Icon name={badge.icon} size={11} />
                              <span>{badge.label}</span>
                            </span>
                            <span className="text-[11px] font-medium text-label-2 truncate">
                              {item.eventTitle}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-night group-hover:text-burgundy transition-colors">
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-[11px] text-label-2 truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <Icon
                          name="chevron_right"
                          size={16}
                          className="text-label-3 group-hover:text-burgundy shrink-0 mt-1 transition-colors"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

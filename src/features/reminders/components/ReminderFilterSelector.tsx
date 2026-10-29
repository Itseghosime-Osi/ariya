import React from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import type { ReminderFilter } from "../types";

interface ReminderFilterSelectorProps {
  currentFilter: ReminderFilter;
  awaitingCount: number;
  totalGuests: number;
  noEmailCount: number;
  onFilterChange: (filter: ReminderFilter) => void;
}

export function ReminderFilterSelector({
  currentFilter,
  awaitingCount,
  totalGuests,
  noEmailCount,
  onFilterChange,
}: ReminderFilterSelectorProps) {
  const options: {
    id: ReminderFilter;
    label: string;
    count: number;
    icon: IconName;
    desc: string;
  }[] = [
    {
      id: "awaiting",
      label: "Awaiting RSVP",
      count: awaitingCount,
      icon: "schedule",
      desc: "Pending guests who have not confirmed attendance",
    },
    {
      id: "no_email",
      label: "Missing Email",
      count: noEmailCount,
      icon: "mail",
      desc: "Guests requiring phone / WhatsApp follow-up",
    },
    {
      id: "all",
      label: "All Guests",
      count: totalGuests,
      icon: "diversity_3",
      desc: "Entire guest registry cohort",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {options.map((opt) => {
        const isSelected = currentFilter === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onFilterChange(opt.id)}
            className={`p-4 rounded-2xl border text-left transition-all ${
              isSelected
                ? "bg-wine/5 border-wine text-night shadow-xs"
                : "bg-surface-container-lowest border-outline-variant/60 hover:border-wine/40"
            }`}
          >
            <div className="flex items-center justify-between pb-2">
              <span className="font-semibold text-sm text-night flex items-center gap-1.5">
                <Icon name={opt.icon} className="text-base text-wine" />
                <span>{opt.label}</span>
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isSelected
                    ? "bg-wine text-ivory"
                    : "bg-stone-100 text-stone-700"
                }`}
              >
                {opt.count}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">{opt.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

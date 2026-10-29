import React from "react";
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
  const options: { id: ReminderFilter; label: string; count: number }[] = [
    { id: "awaiting", label: "Awaiting reply", count: awaitingCount },
    { id: "no_email", label: "No email", count: noEmailCount },
    { id: "all", label: "Everyone", count: totalGuests },
  ];

  return (
    <div
      role="group"
      aria-label="Choose who to remind"
      className="flex gap-6 overflow-x-auto border-b border-outline-variant/70"
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          aria-pressed={currentFilter === opt.id}
          onClick={() => onFilterChange(opt.id)}
          className={`relative min-h-11 whitespace-nowrap pb-2 pt-2 text-sm font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 aria-pressed:after:scale-x-100 ${
            currentFilter === opt.id
              ? "text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {opt.label}
          <span className="ml-1.5 font-medium tabular-nums">{opt.count}</span>
        </button>
      ))}
    </div>
  );
}

"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import type { VendorStatus } from "../types";
import {
  VENDOR_SORT_LABELS,
  VENDOR_STATUS_META,
  VENDOR_STATUSES,
  type VendorSort,
} from "../lib/vendor-insights";

export type VendorStatusFilter = "all" | VendorStatus;

/**
 * One quiet strip for the whole roster: search, the statuses that actually have someone in them, and
 * what "first" means. Empty statuses stay out of the way until a vendor lands in them.
 */
export function VendorFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  sort,
  onSortChange,
  counts,
  total,
  shown,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  status: VendorStatusFilter;
  onStatusChange: (value: VendorStatusFilter) => void;
  sort: VendorSort;
  onSortChange: (value: VendorSort) => void;
  counts: Record<VendorStatus, number>;
  total: number;
  shown: number;
}) {
  const chips: { value: VendorStatusFilter; label: string; count: number }[] = [
    { value: "all", label: "Everyone", count: total },
    ...VENDOR_STATUSES.filter(
      (value) => counts[value] > 0 || status === value
    ).map((value) => ({
      value,
      label: VENDOR_STATUS_META[value].label,
      count: counts[value],
    })),
  ];

  return (
    <div className="rounded-3xl border border-hairline bg-white/45 p-2.5 backdrop-blur-sm sm:p-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 xl:flex-nowrap">
        <label className="relative min-w-0 flex-1 basis-40 xl:w-72 xl:flex-none xl:shrink-0">
          <span className="sr-only">Search vendors</span>
          <Icon
            name="search"
            size={17}
            className="pointer-events-none absolute left-[18px] top-1/2 -translate-y-1/2 text-label-2"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search"
            className="desk-field min-h-[44px] w-full rounded-full pl-12 pr-5 text-sm text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none"
          />
        </label>

        <div className="order-last -mx-2.5 flex w-[calc(100%+1.25rem)] items-center gap-1.5 overflow-x-auto px-2.5 [scrollbar-width:none] sm:order-none sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => {
            const on = status === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={on}
                onClick={() => onStatusChange(chip.value)}
                className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  on
                    ? "border border-burgundy bg-burgundy text-ivory"
                    : "desk-chip text-label-2 hover:text-night"
                }`}
              >
                {chip.label}
                <span
                  className={`tabular-nums ${on ? "text-ivory/70" : "text-label-3"}`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 xl:ml-auto">
          <span className="hidden shrink-0 text-[10px] sm:inline font-semibold uppercase tracking-[0.18em] text-label-3">
            Sort
          </span>
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as VendorSort)}
            className="desk-field min-h-[44px] max-w-[9.5rem] cursor-pointer rounded-full pl-3.5 pr-8 sm:max-w-none sm:min-h-[40px] sm:pl-4 sm:pr-9 text-xs font-semibold text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none"
          >
            {(Object.keys(VENDOR_SORT_LABELS) as VendorSort[]).map((value) => (
              <option key={value} value={value}>
                {VENDOR_SORT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        {shown !== total && (
          <span className="text-xs text-label-3 tabular-nums xl:ml-auto">
            {shown} of {total}
          </span>
        )}
      </div>
    </div>
  );
}

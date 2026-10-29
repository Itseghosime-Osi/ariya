"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuestFilterState, GuestOverviewStats } from "../types";
import { Search, X, Star } from "lucide-react";

interface GuestRegistryFiltersProps {
  filters: GuestFilterState;
  stats: GuestOverviewStats;
  availableGroups: string[];
  onChange: (filters: GuestFilterState) => void;
  onReset: () => void;
}

export function GuestRegistryFilters({
  filters,
  stats,
  availableGroups,
  onChange,
  onReset,
}: GuestRegistryFiltersProps) {
  const hasMoreFilters = Boolean(
    (filters.side && filters.side !== "all") ||
    (filters.group && filters.group !== "all") ||
    (filters.seatedStatus && filters.seatedStatus !== "all") ||
    filters.isVip !== undefined
  );
  const hasActiveFilters = hasMoreFilters || Boolean(filters.search);
  const [moreOpen, setMoreOpen] = React.useState(hasMoreFilters);
  const showMore = moreOpen || hasMoreFilters;

  const status = filters.rsvpStatus || "all";
  const tabs: {
    value: NonNullable<GuestFilterState["rsvpStatus"]>;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "Everyone", count: stats.totalCount },
    { value: "accepted", label: "Attending", count: stats.acceptedCount },
    { value: "pending", label: "Awaiting", count: stats.pendingCount },
    { value: "declined", label: "Declined", count: stats.declinedCount },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-outline-variant/70">
        <div
          role="group"
          aria-label="Filter by reply"
          className="-mb-px flex w-full gap-6 overflow-x-auto sm:w-auto"
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={status === t.value}
              onClick={() => onChange({ ...filters, rsvpStatus: t.value })}
              className={`relative min-h-11 whitespace-nowrap pb-2 pt-2 text-sm font-semibold transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-gold after:transition-transform after:duration-300 aria-pressed:after:scale-x-100 ${
                status === t.value
                  ? "text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t.label}
              <span className="ml-1.5 font-medium tabular-nums">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="relative mb-2 w-full sm:w-72">
          <Search
            aria-hidden="true"
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
          />
          <Input
            aria-label="Search guests"
            placeholder="Search by name, phone or email"
            value={filters.search || ""}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="h-11 rounded-full border-outline-variant/70 bg-ivory pl-10 pr-9 shadow-none transition-colors focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/30"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setMoreOpen((v) => !v)}
          className="min-h-11 font-semibold text-on-surface-variant underline decoration-outline-variant underline-offset-4 hover:text-wine"
        >
          {showMore ? "Hide filters" : "More filters"}
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 font-semibold text-on-surface-variant underline decoration-outline-variant underline-offset-4 hover:text-wine"
          >
            Reset
          </button>
        )}
      </div>

      {showMore && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filters.side || "all"}
            onValueChange={(val) =>
              onChange({ ...filters, side: val as GuestFilterState["side"] })
            }
          >
            <SelectTrigger aria-label="Filter by side" className="w-[130px]">
              <SelectValue placeholder="Side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sides</SelectItem>
              <SelectItem value="bride">Bride</SelectItem>
              <SelectItem value="groom">Groom</SelectItem>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="planner">Planner</SelectItem>
              <SelectItem value="mutual">Mutual</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.seatedStatus || "all"}
            onValueChange={(val) =>
              onChange({
                ...filters,
                seatedStatus: val as GuestFilterState["seatedStatus"],
              })
            }
          >
            <SelectTrigger
              aria-label="Filter by seating status"
              className="w-[135px]"
            >
              <SelectValue placeholder="Seating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seating</SelectItem>
              <SelectItem value="seated">Seated</SelectItem>
              <SelectItem value="unseated">Unseated</SelectItem>
            </SelectContent>
          </Select>

          {availableGroups.length > 0 && (
            <Select
              value={filters.group || "all"}
              onValueChange={(val) => onChange({ ...filters, group: val })}
            >
              <SelectTrigger aria-label="Filter by group" className="w-[140px]">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {availableGroups.map((grp) => (
                  <SelectItem key={grp} value={grp}>
                    {grp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            type="button"
            variant={filters.isVip ? "gold" : "outline"}
            size="sm"
            className="h-11 px-3 border-outline-variant"
            onClick={() =>
              onChange({ ...filters, isVip: filters.isVip ? undefined : true })
            }
          >
            <Star
              className={`mr-1.5 h-4 w-4 ${
                filters.isVip
                  ? "fill-amber-500 text-amber-500"
                  : "text-on-surface-variant"
              }`}
            />
            VIP
          </Button>
        </div>
      )}
    </div>
  );
}

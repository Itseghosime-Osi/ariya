"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GuestFilterState } from "../types";
import { Search, X, Star } from "lucide-react";

interface GuestRegistryFiltersProps {
  filters: GuestFilterState;
  availableGroups: string[];
  onChange: (filters: GuestFilterState) => void;
  onReset: () => void;
}

export function GuestRegistryFilters({
  filters,
  availableGroups,
  onChange,
  onReset,
}: GuestRegistryFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.search ||
    (filters.side && filters.side !== "all") ||
    (filters.group && filters.group !== "all") ||
    (filters.rsvpStatus && filters.rsvpStatus !== "all") ||
    (filters.seatedStatus && filters.seatedStatus !== "all") ||
    filters.isVip !== undefined
  );

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/50 shadow-sm">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
        <Input
          placeholder="Search by name, phone or email..."
          value={filters.search || ""}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 bg-surface-container/40"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.side || "all"}
          onValueChange={(val) =>
            onChange({ ...filters, side: val as GuestFilterState["side"] })
          }
        >
          <SelectTrigger
            aria-label="Filter by side"
            className="w-[130px] bg-surface-container/40"
          >
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
          value={filters.rsvpStatus || "all"}
          onValueChange={(val) =>
            onChange({
              ...filters,
              rsvpStatus: val as GuestFilterState["rsvpStatus"],
            })
          }
        >
          <SelectTrigger
            aria-label="Filter by RSVP status"
            className="w-[140px] bg-surface-container/40"
          >
            <SelectValue placeholder="RSVP Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All RSVP</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
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
            className="w-[135px] bg-surface-container/40"
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
            <SelectTrigger
              aria-label="Filter by group"
              className="w-[140px] bg-surface-container/40"
            >
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
            className={`h-4 w-4 mr-1.5 ${
              filters.isVip
                ? "fill-amber-500 text-amber-500"
                : "text-on-surface-variant"
            }`}
          />
          VIP
        </Button>

        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 text-on-surface-variant hover:text-on-surface"
            onClick={onReset}
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}

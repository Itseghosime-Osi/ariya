"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { UnseatedGuestCard } from "./UnseatedGuestCard";
import type { SeatingGuest, TableWithGuests } from "../types";

interface UnseatedGuestListProps {
  guests: SeatingGuest[];
  tables: TableWithGuests[];
  onAssignTable: (guestId: string, tableId: string) => void;
}

export function UnseatedGuestList({
  guests,
  tables,
  onAssignTable,
}: UnseatedGuestListProps) {
  const [search, setSearch] = useState("");
  const [vipOnly, setVipOnly] = useState(false);

  const filtered = guests.filter((g) => {
    const matchSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.group_name &&
        g.group_name.toLowerCase().includes(search.toLowerCase())) ||
      g.side.toLowerCase().includes(search.toLowerCase());
    const matchVip = vipOnly ? g.is_vip : true;
    return matchSearch && matchVip;
  });

  return (
    <div className="flex h-full max-h-[calc(100dvh-16rem)] flex-col space-y-3 rounded-[22px] border border-hairline bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-label-2">
            Waiting for a seat
          </h2>
          <p className="mt-0.5 text-[11px] text-label-2">
            {guests.length} {guests.length === 1 ? "party" : "parties"} awaiting
            table allocation
          </p>
        </div>
        <span className="rounded-full bg-burgundy px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
          {guests.reduce((acc, g) => acc + g.attending_count, 0)} guests
        </span>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant"
          />
          <input
            type="text"
            placeholder="Find a guest"
            aria-label="Find a guest waiting for a seat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-full border border-hairline bg-white pl-9 pr-3 text-base text-night outline-none focus:border-night sm:text-sm"
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs text-label-2">
            <input
              type="checkbox"
              checked={vipOnly}
              onChange={(e) => setVipOnly(e.target.checked)}
              className="h-4 w-4 accent-[#6e1426]"
            />
            <span>VIPs only</span>
          </label>
        </div>
      </div>

      {/* List Container */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant text-xs space-y-2">
            <Icon
              name="check_circle"
              className="text-2xl text-emerald-600 block mx-auto"
            />
            <p className="font-medium">
              {guests.length === 0
                ? "All registered guests have been seated!"
                : "No unseated guests match your search filter."}
            </p>
          </div>
        ) : (
          filtered.map((guest) => (
            <UnseatedGuestCard
              key={guest.id}
              guest={guest}
              tables={tables}
              onAssignTable={onAssignTable}
            />
          ))
        )}
      </div>
    </div>
  );
}

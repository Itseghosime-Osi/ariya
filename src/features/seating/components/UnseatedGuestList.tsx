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
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant/30 p-4 space-y-4 flex flex-col h-full max-h-[800px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-base text-wine font-medium">
            Unseated Guests
          </h2>
          <p className="text-[11px] text-on-surface-variant">
            {guests.length} {guests.length === 1 ? "party" : "parties"} awaiting
            table allocation
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-wine/10 text-wine">
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
            placeholder="Search unseated guests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-outline-variant/60 bg-white text-xs text-night focus:outline-none focus:ring-1 focus:ring-wine/50"
          />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer text-on-surface-variant text-[11px]">
            <input
              type="checkbox"
              checked={vipOnly}
              onChange={(e) => setVipOnly(e.target.checked)}
              className="rounded text-wine focus:ring-wine/40"
            />
            <span>VIP Dignitaries Only</span>
          </label>
        </div>
      </div>

      <hr className="border-outline-variant/30" />

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

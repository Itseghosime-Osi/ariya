"use client";

import React, { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableCard } from "./TableCard";
import { UnseatedGuestList } from "./UnseatedGuestList";
import type { SeatingDeskData, TableWithGuests } from "../types";

type Filter = "all" | "space" | "full" | "empty";

/** The table list: every table as a card, with search and quick filters, and the guests to seat. */
export function TableListView({
  data,
  onAddTable,
  onAssign,
  onEditTable,
  onDeleteTable,
}: {
  data: SeatingDeskData;
  onAddTable: () => void;
  onAssign: (guestId: string, tableId: string | null) => void;
  onEditTable: (t: TableWithGuests) => void;
  onDeleteTable: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const counts = useMemo(
    () => ({
      all: data.tables.length,
      space: data.tables.filter(
        (t) => t.occupiedSeats > 0 && t.occupiedSeats < t.capacity
      ).length,
      full: data.tables.filter((t) => t.occupiedSeats >= t.capacity).length,
      empty: data.tables.filter((t) => t.occupiedSeats === 0).length,
    }),
    [data.tables]
  );
  const needle = q.trim().toLowerCase();
  const tables = data.tables.filter((t) => {
    const keep =
      filter === "all"
        ? true
        : filter === "space"
          ? t.occupiedSeats > 0 && t.occupiedSeats < t.capacity
          : filter === "full"
            ? t.occupiedSeats >= t.capacity
            : t.occupiedSeats === 0;
    return (
      keep &&
      (!needle ||
        t.name.toLowerCase().includes(needle) ||
        t.guests.some((g) => g.name.toLowerCase().includes(needle)))
    );
  });

  if (data.tables.length === 0)
    return (
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="rounded-[28px] border border-dashed border-hairline bg-white px-6 py-14 text-center lg:col-span-8">
          <p className="font-display text-2xl font-bold text-night">
            No tables yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-label-2">
            Add your first table, or open the hall studio and let Fit place them
            for you.
          </p>
          <button
            type="button"
            onClick={onAddTable}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-5 text-xs font-semibold uppercase tracking-[0.12em] text-ivory hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Plus size={15} /> Create first table
          </button>
        </div>
        <div className="lg:col-span-4">
          <UnseatedGuestList
            guests={data.unseatedGuests}
            tables={data.tables}
            onAssignTable={(g, t) => onAssign(g, t)}
          />
        </div>
      </div>
    );

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-label-2"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a table or a seated guest"
              aria-label="Find a table or a seated guest"
              className="h-11 w-full rounded-full border border-hairline bg-white pl-10 pr-4 text-base outline-none focus:border-night sm:text-sm"
            />
          </div>
          <div
            role="group"
            aria-label="Show tables"
            className="flex rounded-full border border-hairline bg-white p-1"
          >
            {(
              [
                ["all", "All"],
                ["space", "Has space"],
                ["empty", "Empty"],
                ["full", "Full"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={filter === k}
                onClick={() => setFilter(k)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-label-2 transition-colors aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                {l}
                <span className="tabular-nums opacity-70">{counts[k]}</span>
              </button>
            ))}
          </div>
        </div>
        {tables.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-10 text-center text-sm text-label-2">
            No tables match.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {tables.map((t) => (
              <TableCard
                key={t.id}
                table={t}
                onUnseatGuest={(g) => onAssign(g, null)}
                onEditTable={onEditTable}
                onDeleteTable={onDeleteTable}
              />
            ))}
          </div>
        )}
      </div>
      <div className={cn("lg:sticky lg:top-6 lg:col-span-4")}>
        <UnseatedGuestList
          guests={data.unseatedGuests}
          tables={data.tables}
          onAssignTable={(g, t) => onAssign(g, t)}
        />
      </div>
    </div>
  );
}

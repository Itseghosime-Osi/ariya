"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Icon } from "@/components/ui/icon";
import { pluralise } from "@/lib/metrics";
import type { SeatingGuest, TableWithGuests } from "../types";

interface UnseatedGuestCardProps {
  guest: SeatingGuest;
  tables: TableWithGuests[];
  onAssignTable: (guestId: string, tableId: string) => void;
}

export function UnseatedGuestCard({
  guest,
  tables,
  onAssignTable,
}: UnseatedGuestCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
    data: { guestId: guest.id, attendingCount: guest.attending_count },
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-3.5 rounded-2xl border transition-all text-xs bg-white space-y-2.5 ${
        isDragging
          ? "opacity-40 border-dashed border-wine"
          : "border-outline-variant/50 hover:border-wine/40 shadow-xs"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing p-1 text-on-surface-variant hover:text-wine rounded"
            title="Drag guest to table"
            aria-label={`Drag ${guest.name} to table`}
          >
            <Icon name="more_vert" className="text-sm" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-night truncate block max-w-[150px]">
                {guest.name}
              </span>
              {guest.is_vip && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  VIP
                </span>
              )}
              {guest.seating_conflict_at && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5">
                  <Icon name="error" className="text-[10px]" />
                  <span>party size changed</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-on-surface-variant truncate">
              {guest.side} {guest.group_name ? `• ${guest.group_name}` : ""}
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-wine/10 text-wine shrink-0">
          {pluralise(guest.attending_count, "seat")}
        </span>
      </div>

      {/* Accessible Non-Drag Keyboard Alternative: Quick Table Selector */}
      <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/30">
        <label
          htmlFor={`seat-select-${guest.id}`}
          className="text-[10px] font-medium text-on-surface-variant shrink-0"
        >
          Assign:
        </label>
        <select
          id={`seat-select-${guest.id}`}
          aria-label={`Assign ${guest.name} to a table`}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              onAssignTable(guest.id, e.target.value);
              e.target.value = "";
            }
          }}
          className="flex-1 py-1 px-2 rounded-lg border border-outline-variant/60 bg-paper text-[11px] text-night focus:outline-none focus:ring-1 focus:ring-wine/50"
        >
          <option value="" disabled>
            Choose table...
          </option>
          {tables.map((t) => {
            const seatsLeft = Math.max(0, t.capacity - t.occupiedSeats);
            return (
              <option key={t.id} value={t.id}>
                {t.name} ({seatsLeft} left of {t.capacity})
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}

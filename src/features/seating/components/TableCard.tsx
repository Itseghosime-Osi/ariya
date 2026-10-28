"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Icon } from "@/components/ui/icon";
import type { TableWithGuests } from "../types";

interface TableCardProps {
  table: TableWithGuests;
  onUnseatGuest: (guestId: string) => void;
  onEditTable: (table: TableWithGuests) => void;
  onDeleteTable: (tableId: string) => void;
}

export function TableCard({
  table,
  onUnseatGuest,
  onEditTable,
  onDeleteTable,
}: TableCardProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: table.id,
    data: { tableId: table.id },
  });

  const availableSeats = Math.max(0, table.capacity - table.occupiedSeats);
  const isFull = table.occupiedSeats >= table.capacity;
  const pct = Math.min(
    100,
    Math.round((table.occupiedSeats / table.capacity) * 100)
  );

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border p-5 transition-all duration-200 flex flex-col justify-between ${
        isOver
          ? "border-wine bg-wine/5 ring-2 ring-wine/30 shadow-md scale-[1.01]"
          : "border-outline-variant/40 bg-white hover:border-wine/40 shadow-sm"
      }`}
    >
      <div className="space-y-3">
        {/* Table Top Metadata */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Icon
                name={
                  table.shape === "head"
                    ? "verified"
                    : table.shape === "rectangular"
                      ? "table_restaurant"
                      : "pending"
                }
                className="text-wine text-sm"
              />
              <h3 className="font-serif text-base text-wine font-medium">
                {table.name}
              </h3>
            </div>
            <p className="text-[11px] text-on-surface-variant capitalize">
              {table.shape} Layout • {table.capacity} Seats Total
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEditTable(table)}
              title="Edit table settings"
              className="p-1 rounded-lg text-on-surface-variant hover:text-wine hover:bg-wine/5"
            >
              <Icon name="edit" className="text-sm" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteTable(table.id)}
              title="Delete table"
              className="p-1 rounded-lg text-on-surface-variant hover:text-red-700 hover:bg-red-50"
            >
              <Icon name="delete" className="text-sm" />
            </button>
          </div>
        </div>

        {/* Capacity Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-semibold">
            <span className={isFull ? "text-amber-800" : "text-emerald-800"}>
              {table.occupiedSeats} / {table.capacity} Seated
            </span>
            <span className="text-on-surface-variant text-[10px]">
              {availableSeats === 0
                ? "Full Capacity"
                : `${availableSeats} seats left`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isFull ? "bg-amber-600" : "bg-wine"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <hr className="border-outline-variant/30" />

        {/* Guest Chips inside Table */}
        <div className="space-y-2 min-h-[90px]">
          {table.guests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-on-surface-variant/70 border border-dashed border-outline-variant/50 rounded-xl">
              <Icon name="chair" className="text-lg opacity-40 mb-1" />
              <p className="text-[11px]">Drop guests here or use select menu</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {table.guests.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-paper border border-outline-variant/40 text-xs text-night group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-wine/10 text-wine font-serif font-bold text-[10px] flex items-center justify-center shrink-0">
                      {g.name[0]}
                    </span>
                    <span className="font-medium truncate">{g.name}</span>
                    {g.attending_count > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-wine/10 text-wine shrink-0 font-semibold">
                        +{g.attending_count - 1}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onUnseatGuest(g.id)}
                    title="Unseat guest"
                    className="opacity-0 group-hover:opacity-100 p-1 text-on-surface-variant hover:text-red-700 transition-opacity"
                  >
                    <Icon name="close" className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 text-center text-[10px] text-on-surface-variant">
        {isOver ? "Release to Seat Guest" : "Drag target area"}
      </div>
    </div>
  );
}

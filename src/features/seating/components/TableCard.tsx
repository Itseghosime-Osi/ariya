"use client";

import React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Crown, GripVertical, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tableSizeLabel } from "../hall/model";
import { TableGlyph } from "../hall/studio-ui";
import type { SeatingGuest, TableWithGuests } from "../types";

interface TableCardProps {
  table: TableWithGuests;
  onUnseatGuest: (guestId: string) => void;
  onEditTable: (table: TableWithGuests) => void;
  onDeleteTable: (tableId: string) => void;
}

/** A seated guest; drag the chip onto another table to move them. */
function GuestChip({
  guest,
  onUnseat,
}: {
  guest: SeatingGuest;
  onUnseat: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: guest.id, data: { guestId: guest.id } });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "flex items-center gap-1 rounded-full border border-hairline bg-white py-0.5 pl-0.5 pr-0.5 text-xs text-night",
        isDragging && "z-20 shadow-lg ring-2 ring-burgundy/30"
      )}
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Move ${guest.name} to another table`}
        className="grid h-7 w-6 cursor-grab touch-none place-items-center rounded-full text-label-2 hover:text-night active:cursor-grabbing"
      >
        <GripVertical size={13} />
      </button>
      {guest.is_vip && (
        <Crown size={12} className="shrink-0 text-gold-ink" aria-label="VIP" />
      )}
      <span className="max-w-[9rem] truncate font-medium">{guest.name}</span>
      {guest.attending_count > 1 && (
        <span className="rounded-full bg-[#f3ead8] px-1.5 text-[10px] font-semibold text-[#5c4013]">
          +{guest.attending_count - 1}
        </span>
      )}
      <button
        type="button"
        onClick={onUnseat}
        aria-label={`Unseat ${guest.name}`}
        title="Unseat"
        className="grid h-7 w-7 place-items-center rounded-full text-label-2 hover:bg-[#fbe9ea] hover:text-[#9e2a2b] focus-visible:outline-2 focus-visible:outline-burgundy"
      >
        <X size={13} />
      </button>
    </li>
  );
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
  const free = Math.max(0, table.capacity - table.occupiedSeats);
  const full = table.occupiedSeats >= table.capacity;
  const pct = Math.min(100, (table.occupiedSeats / table.capacity) * 100);

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "group flex flex-col rounded-[22px] border bg-white p-4 transition-all duration-200 motion-reduce:transition-none",
        isOver
          ? "border-burgundy shadow-[0_12px_30px_-14px_rgba(110,20,38,0.55)] ring-2 ring-burgundy/20"
          : "border-hairline shadow-[0_1px_2px_rgba(28,7,13,0.05)] hover:shadow-[0_14px_30px_-20px_rgba(28,7,13,0.45)]"
      )}
    >
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-16 w-16 shrink-0 place-items-center rounded-2xl transition-colors",
            full ? "bg-burgundy text-[#f6dca8]" : "bg-[#f6f1e8] text-burgundy"
          )}
        >
          <TableGlyph
            shape={table.shape}
            seats={table.capacity}
            filled={table.occupiedSeats}
            size={52}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold leading-tight text-night">
            {table.name}
          </h3>
          <p className="text-[11px] text-label-2">
            {tableSizeLabel(table.shape, table.capacity)} · {table.capacity}{" "}
            seats
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#efe7da]">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none",
                  full ? "bg-gold-ink" : "bg-burgundy"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-night">
              {table.occupiedSeats}/{table.capacity}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onEditTable(table)}
            aria-label={`Edit ${table.name}`}
            title="Edit name, seats or shape"
            className="grid h-9 w-9 place-items-center rounded-full text-label-2 hover:bg-[#f1ece4] hover:text-night focus-visible:outline-2 focus-visible:outline-burgundy"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDeleteTable(table.id)}
            aria-label={`Delete ${table.name}`}
            title="Delete table"
            className="grid h-9 w-9 place-items-center rounded-full text-label-2 hover:bg-[#fbe9ea] hover:text-[#9e2a2b] focus-visible:outline-2 focus-visible:outline-burgundy"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      <div className="mt-3 min-h-[76px] flex-1">
        {table.guests.length === 0 ? (
          <p
            className={cn(
              "grid h-full min-h-[76px] place-items-center rounded-2xl border border-dashed px-3 text-center text-[11px] transition-colors",
              isOver
                ? "border-burgundy bg-burgundy/5 text-burgundy"
                : "border-hairline text-label-2"
            )}
          >
            {isOver
              ? "Let go to seat them here"
              : "Drag guests here, or pick this table from their menu"}
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {table.guests.map((g) => (
              <GuestChip
                key={g.id}
                guest={g}
                onUnseat={() => onUnseatGuest(g.id)}
              />
            ))}
          </ul>
        )}
      </div>
      <p
        className={cn(
          "mt-3 text-[11px] font-semibold",
          full ? "text-gold-ink" : "text-label-2"
        )}
      >
        {full ? "Full" : `${free} ${free === 1 ? "seat" : "seats"} free`}
      </p>
    </article>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  LayoutGrid,
  List,
  Plus,
  Printer,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { TableListView } from "./TableListView";
import { TableFormModal } from "./TableFormModal";
import { SeatingHeader } from "./SeatingHeader";
import { useSeatingDesk } from "./useSeatingDesk";
import { HallStudio } from "../hall/HallStudio";
import type { SeatingDeskData } from "../types";

interface SeatingDeskProps {
  eventId: string;
  initialData: SeatingDeskData;
  hallLayout?: unknown;
  hallLayoutAvailable?: boolean;
}

const VIEW_KEY = "ariya:seating-view";

function ViewSwitch({
  view,
  onChange,
  compact,
}: {
  view: "hall" | "list";
  onChange: (v: "hall" | "list") => void;
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Seating view"
      className="inline-flex rounded-full border border-hairline bg-white p-1"
    >
      {(
        [
          ["hall", "Hall studio", LayoutGrid],
          ["list", "Table list", List],
        ] as const
      ).map(([key, label, I]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={view === key}
          onClick={() => onChange(key)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
            compact ? "min-h-9" : "min-h-10",
            view === key
              ? "bg-burgundy text-ivory"
              : "text-label-2 hover:bg-burgundy/10"
          )}
        >
          <I size={14} />{" "}
          <span className={cn(compact && "max-sm:sr-only")}>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function SeatingDesk({
  eventId,
  initialData,
  hallLayout = null,
  hallLayoutAvailable = false,
}: SeatingDeskProps) {
  // The hall is the default on tablets and laptops; phones start on the list, which suits them.
  const [view, setView] = useState<"hall" | "list">("hall");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "hall" || saved === "list") return setView(saved);
    } catch {
      /* no storage */
    }
    if (window.matchMedia("(max-width: 767px)").matches) setView("list");
  }, []);
  const chooseView = (v: "hall" | "list") => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* not remembered */
    }
  };

  const {
    addTables,
    updateTable,
    setTablePositions,
    bulkAssign,
    data,
    errorMsg,
    successMsg,
    isModalOpen,
    setIsModalOpen,
    editingTable,
    setEditingTable,
    executeSeatChange,
    handleSaveTable,
    handleDeleteTable,
  } = useSeatingDesk(eventId, initialData);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // The guest being dragged is drawn in an overlay above the page, so no scrolling list clips it.
  const [dragging, setDragging] = useState<string | null>(null);
  const draggedGuest = dragging
    ? (data.unseatedGuests.find((g) => g.id === dragging) ??
      data.tables.flatMap((t) => t.guests).find((g) => g.id === dragging))
    : undefined;
  const handleDragStart = (event: DragStartEvent) =>
    setDragging(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const { active, over } = event;
    if (!over) return;
    executeSeatChange(String(active.id), String(over.id));
  };

  const openNewTable = () => {
    setEditingTable(null);
    setIsModalOpen(true);
  };

  const modal = (
    <TableFormModal
      isOpen={isModalOpen}
      initialTable={editingTable}
      onClose={() => setIsModalOpen(false)}
      onSubmit={handleSaveTable}
    />
  );

  if (view === "hall")
    return (
      <>
        <HallStudio
          eventId={eventId}
          data={data}
          initialLayout={hallLayout}
          layoutAvailable={hallLayoutAvailable}
          addTables={addTables}
          updateTable={updateTable}
          setTablePositions={setTablePositions}
          bulkAssign={bulkAssign}
          onAssignTable={(guestId, tableId) =>
            executeSeatChange(guestId, tableId)
          }
          onDeleteTable={handleDeleteTable}
          notice={
            errorMsg ? (
              <span className="inline-flex items-center gap-2 text-[#9e2a2b]">
                <CircleAlert size={15} /> {errorMsg}
              </span>
            ) : successMsg ? (
              <span className="inline-flex items-center gap-2 text-[#1f6b4a]">
                <CircleCheck size={15} /> {successMsg}
              </span>
            ) : null
          }
          header={
            <>
              <Link
                href={`/events/${eventId}`}
                aria-label="Back to the event"
                title="Back to the event"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-night hover:bg-[#f1ece4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <ArrowLeft size={18} />
              </Link>
              <h1 className="truncate font-display text-lg font-bold text-night">
                Seating &amp; Floor Plan
              </h1>
              <div className="mx-auto">
                <ViewSwitch view={view} onChange={chooseView} compact />
              </div>
              <span className="hidden text-xs text-label-2 xl:inline">
                <strong className="font-semibold text-night">
                  {data.stats.readinessPct}%
                </strong>{" "}
                seated
              </span>
              <Link
                href={`/events/${eventId}/seating/print`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Print cards and chart"
                title="Print cards and chart"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-night hover:bg-[#f1ece4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <Printer size={17} />
              </Link>
              <button
                type="button"
                onClick={openNewTable}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-burgundy px-4 text-xs font-semibold text-ivory hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <Plus size={15} />
                <span className="max-sm:sr-only">New Table</span>
              </button>
            </>
          }
        />
        {modal}
      </>
    );

  return (
    <DndContext
      id="seating-desk"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="space-y-6">
        <SeatingHeader
          eventId={eventId}
          stats={data.stats}
          onAddTable={openNewTable}
        />

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 flex items-center gap-2">
            <Icon name="error" className="text-sm text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
            <Icon
              name="check_circle"
              className="text-sm text-emerald-600 shrink-0"
            />
            <span>{successMsg}</span>
          </div>
        )}

        <ViewSwitch view={view} onChange={chooseView} />

        <TableListView
          data={data}
          onAddTable={openNewTable}
          onAssign={executeSeatChange}
          onEditTable={(t) => {
            setEditingTable(t);
            setIsModalOpen(true);
          }}
          onDeleteTable={handleDeleteTable}
        />

        {modal}
      </div>
      {typeof document !== "undefined" &&
        createPortal(
          <DragOverlay dropAnimation={null} zIndex={80}>
            {draggedGuest ? (
              <div className="inline-flex cursor-grabbing items-center gap-2 rounded-full border border-burgundy/30 bg-white py-1.5 pl-1.5 pr-3.5 text-sm font-semibold text-night shadow-[0_18px_40px_-14px_rgba(28,7,13,0.55)]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-burgundy text-[11px] font-bold text-white">
                  {draggedGuest.name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                {draggedGuest.name}
                {draggedGuest.attending_count > 1 && (
                  <span className="rounded-full bg-[#f3ead8] px-1.5 text-[11px] text-[#5c4013]">
                    +{draggedGuest.attending_count - 1}
                  </span>
                )}
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );
}

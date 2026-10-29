"use client";

import React, { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Icon } from "@/components/ui/icon";
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const guestId = String(active.id);
    const tableId = String(over.id);
    executeSeatChange(guestId, tableId);
  };

  return (
    <DndContext id="seating-desk" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <SeatingHeader
          eventId={eventId}
          stats={data.stats}
          onAddTable={() => {
            setEditingTable(null);
            setIsModalOpen(true);
          }}
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
              onClick={() => chooseView(key)}
              className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                view === key
                  ? "bg-burgundy text-ivory"
                  : "text-label-2 hover:bg-burgundy/10"
              }`}
            >
              <I size={14} /> {label}
            </button>
          ))}
        </div>

        {view === "hall" ? (
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
          />
        ) : (
          <TableListView
            data={data}
            onAddTable={() => {
              setEditingTable(null);
              setIsModalOpen(true);
            }}
            onAssign={executeSeatChange}
            onEditTable={(t) => {
              setEditingTable(t);
              setIsModalOpen(true);
            }}
            onDeleteTable={handleDeleteTable}
          />
        )}

        <TableFormModal
          isOpen={isModalOpen}
          initialTable={editingTable}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSaveTable}
        />
      </div>
    </DndContext>
  );
}

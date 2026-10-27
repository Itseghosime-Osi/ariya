"use client";

import React from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Icon } from "@/components/ui/icon";
import { TableCard } from "./TableCard";
import { UnseatedGuestList } from "./UnseatedGuestList";
import { TableFormModal } from "./TableFormModal";
import { SeatingHeader } from "./SeatingHeader";
import { useSeatingDesk } from "./useSeatingDesk";
import type { SeatingDeskData } from "../types";

interface SeatingDeskProps {
  eventId: string;
  initialData: SeatingDeskData;
}

export function SeatingDesk({ eventId, initialData }: SeatingDeskProps) {
  const {
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            {data.tables.length === 0 ? (
              <div className="bg-surface-container-low p-12 text-center rounded-2xl border border-outline-variant/30 space-y-3">
                <Icon
                  name="table_restaurant"
                  className="text-4xl text-wine/40 block mx-auto"
                />
                <h3 className="font-serif text-lg text-wine font-medium">
                  No Tables Added Yet
                </h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  Begin orchestrating your floor plan by adding banquet, round,
                  or head tables.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-wine text-ivory text-xs font-semibold"
                >
                  Create First Table
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.tables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    onUnseatGuest={(guestId) =>
                      executeSeatChange(guestId, null)
                    }
                    onEditTable={(t) => {
                      setEditingTable(t);
                      setIsModalOpen(true);
                    }}
                    onDeleteTable={handleDeleteTable}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4 sticky top-6">
            <UnseatedGuestList
              guests={data.unseatedGuests}
              tables={data.tables}
              onAssignTable={(guestId, tableId) =>
                executeSeatChange(guestId, tableId)
              }
            />
          </div>
        </div>

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

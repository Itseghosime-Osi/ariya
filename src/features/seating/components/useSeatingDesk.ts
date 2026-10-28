import { useState } from "react";
import {
  assignSeatAction,
  createTableAction,
  updateTableAction,
  deleteTableAction,
} from "../actions";
import type {
  SeatingDeskData,
  Table,
  TableShape,
  TableWithGuests,
} from "../types";

export function useSeatingDesk(eventId: string, initialData: SeatingDeskData) {
  const [data, setData] = useState<SeatingDeskData>(initialData);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  const executeSeatChange = async (guestId: string, tableId: string | null) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    // Save previous snapshot for optimistic rollback
    const previousSnapshot = JSON.parse(
      JSON.stringify(data)
    ) as SeatingDeskData;

    // Apply optimistic local update
    setData((prev) => {
      let movedGuest = prev.unseatedGuests.find((g) => g.id === guestId);
      let fromTableId: string | null = null;

      if (!movedGuest) {
        for (const t of prev.tables) {
          const found = t.guests.find((g) => g.id === guestId);
          if (found) {
            movedGuest = found;
            fromTableId = t.id;
            break;
          }
        }
      }

      if (!movedGuest) return prev;

      const updatedGuest = { ...movedGuest, table_id: tableId };
      const updatedTables = prev.tables.map((t) => {
        let newGuests = t.guests;
        if (fromTableId && t.id === fromTableId) {
          newGuests = t.guests.filter((g) => g.id !== guestId);
        }
        if (tableId && t.id === tableId) {
          newGuests = [
            ...newGuests.filter((g) => g.id !== guestId),
            updatedGuest,
          ];
        }
        const occupied = newGuests.reduce(
          (acc, g) => acc + g.attending_count,
          0
        );
        return { ...t, guests: newGuests, occupiedSeats: occupied };
      });

      let updatedUnseated = prev.unseatedGuests.filter((g) => g.id !== guestId);
      if (tableId === null) {
        updatedUnseated = [...updatedUnseated, updatedGuest];
      }

      const seatedTotal = updatedTables.reduce(
        (acc, t) => acc + t.occupiedSeats,
        0
      );
      const unseatedTotal = updatedUnseated.reduce(
        (acc, g) => acc + g.attending_count,
        0
      );
      const total = seatedTotal + unseatedTotal;

      return {
        tables: updatedTables,
        unseatedGuests: updatedUnseated,
        stats: {
          totalCapacity: prev.stats.totalCapacity,
          seatedAttendees: seatedTotal,
          unseatedAttendees: unseatedTotal,
          readinessPct:
            total > 0
              ? Math.min(100, Math.round((seatedTotal / total) * 100))
              : 0,
        },
      };
    });

    const res = await assignSeatAction(eventId, guestId, tableId);
    if (!res.ok) {
      setData(previousSnapshot);
      setErrorMsg(res.error || "Unable to assign guest to this table.");
    } else {
      setSuccessMsg("Seating chart updated.");
    }
  };

  const handleSaveTable = async (input: {
    name: string;
    capacity: number;
    shape: TableShape;
  }) => {
    if (editingTable) {
      const res = await updateTableAction(eventId, editingTable.id, input);
      if (!res.ok) throw new Error(res.error);
      setData((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.id === editingTable.id ? { ...t, ...input } : t
        ),
      }));
    } else {
      const res = await createTableAction(eventId, {
        ...input,
        position_x: 0,
        position_y: 0,
      });
      if (!res.ok || !res.data) throw new Error(res.error);
      const newTable: TableWithGuests = {
        id: res.data.id,
        event_id: eventId,
        name: input.name,
        capacity: input.capacity,
        shape: input.shape,
        position_x: 0,
        position_y: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        guests: [],
        occupiedSeats: 0,
      };
      setData((prev) => ({
        ...prev,
        tables: [...prev.tables, newTable],
        stats: {
          ...prev.stats,
          totalCapacity: prev.stats.totalCapacity + input.capacity,
        },
      }));
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this table? Assigned guests will become unseated."
      )
    ) {
      return;
    }
    const res = await deleteTableAction(eventId, tableId);
    if (!res.ok) {
      setErrorMsg(res.error || "Failed to delete table");
      return;
    }
    setData((prev) => {
      const target = prev.tables.find((t) => t.id === tableId);
      const remainingTables = prev.tables.filter((t) => t.id !== tableId);
      const newlyUnseated = target
        ? target.guests.map((g) => ({ ...g, table_id: null }))
        : [];
      return {
        ...prev,
        tables: remainingTables,
        unseatedGuests: [...prev.unseatedGuests, ...newlyUnseated],
      };
    });
  };

  return {
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
  };
}

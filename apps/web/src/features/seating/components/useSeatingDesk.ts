import { useState } from "react";
import {
  assignSeatAction,
  bulkAssignSeatsAction,
  createTableAction,
  createTablesBulkAction,
  updateTableAction,
  deleteTableAction,
  saveTablePositionsAction,
} from "../actions";
import type { CreateTableInput } from "../schemas";
import type {
  SeatingDeskData,
  SeatingGuest,
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

  /** Asking first: the page shows a dialog for the table waiting here. */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const handleDeleteTable = (tableId: string) => setPendingDelete(tableId);
  const cancelDelete = () => setPendingDelete(null);
  const confirmDelete = async () => {
    const id = pendingDelete;
    setPendingDelete(null);
    if (id && (await removeTable(id))) setSuccessMsg("Table deleted.");
  };

  /** Remove several tables at once (shrinking a crowded hall), without asking for each. */
  const deleteTables = async (ids: string[]) => {
    setErrorMsg(null);
    let removed = 0;
    for (const id of ids) if (await removeTable(id)) removed += 1;
    if (removed)
      setSuccessMsg(
        `${removed} ${removed === 1 ? "table" : "tables"} removed from the hall.`
      );
    return removed;
  };

  const removeTable = async (tableId: string) => {
    const res = await deleteTableAction(eventId, tableId);
    if (!res.ok) {
      setErrorMsg(res.error || "Failed to delete table");
      return false;
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
        stats: {
          ...prev.stats,
          totalCapacity: prev.stats.totalCapacity - (target?.capacity ?? 0),
          seatedAttendees:
            prev.stats.seatedAttendees - (target?.occupiedSeats ?? 0),
          unseatedAttendees:
            prev.stats.unseatedAttendees + (target?.occupiedSeats ?? 0),
        },
      };
    });
    return true;
  };

  /** Change a table's name, seats or shape straight from the hall studio (optimistic). */
  const updateTable = async (
    tableId: string,
    patch: { name?: string; capacity?: number; shape?: TableShape }
  ) => {
    setErrorMsg(null);
    const before = data.tables.find((t) => t.id === tableId);
    if (!before) return;
    const apply = (t: TableWithGuests) =>
      setData((prev) => {
        const tables = prev.tables.map((x) => (x.id === tableId ? t : x));
        return {
          ...prev,
          tables,
          stats: {
            ...prev.stats,
            totalCapacity: tables.reduce((a, x) => a + x.capacity, 0),
          },
        };
      });
    apply({ ...before, ...patch });
    const res = await updateTableAction(eventId, tableId, patch);
    if (!res.ok) {
      apply(before);
      setErrorMsg(res.error || "Could not update the table.");
    }
  };

  /** Add many tables at once, each already placed in the hall (positions in centimetres). */
  const addTables = async (items: CreateTableInput[]) => {
    setErrorMsg(null);
    const res = await createTablesBulkAction(eventId, items);
    if (!res.ok || !res.data) {
      setErrorMsg(res.error || "Could not add the tables.");
      return [];
    }
    const now = new Date().toISOString();
    const created: TableWithGuests[] = res.data.map((row, i) => ({
      id: row.id,
      event_id: eventId,
      name: row.name,
      capacity: items[i].capacity,
      shape: items[i].shape,
      position_x: items[i].position_x,
      position_y: items[i].position_y,
      created_at: now,
      updated_at: now,
      guests: [],
      occupiedSeats: 0,
    }));
    setData((prev) => ({
      ...prev,
      tables: [...prev.tables, ...created].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      ),
      stats: {
        ...prev.stats,
        totalCapacity:
          prev.stats.totalCapacity +
          created.reduce((acc, t) => acc + t.capacity, 0),
      },
    }));
    setSuccessMsg(`${created.length} tables added to the hall.`);
    return created;
  };

  /** Move tables in the hall (centimetres). Applied at once; saved in the background. */
  const setTablePositions = async (
    items: { id: string; x: number; y: number }[],
    persist = true
  ) => {
    if (items.length === 0) return;
    const byId = new Map(items.map((i) => [i.id, i]));
    setData((prev) => ({
      ...prev,
      tables: prev.tables.map((t) => {
        const p = byId.get(t.id);
        return p ? { ...t, position_x: p.x, position_y: p.y } : t;
      }),
    }));
    if (!persist) return;
    const res = await saveTablePositionsAction(eventId, items);
    if (!res.ok) setErrorMsg(res.error || "Could not save table positions.");
  };

  /** Seat many guests at once (auto-seat). Optimistic, then reconciled with what the server accepted. */
  const bulkAssign = async (pairs: { guestId: string; tableId: string }[]) => {
    if (pairs.length === 0) return { seated: 0, failed: 0 };
    setErrorMsg(null);
    setSuccessMsg(null);
    const previous = data;
    const target = new Map(pairs.map((p) => [p.guestId, p.tableId]));
    const apply = (prev: SeatingDeskData, keep: (id: string) => boolean) => {
      const moving: SeatingGuest[] = [];
      const unseated = prev.unseatedGuests.filter((g) => {
        if (target.has(g.id) && keep(g.id)) {
          moving.push({ ...g, table_id: target.get(g.id) ?? null });
          return false;
        }
        return true;
      });
      const tables = prev.tables.map((t) => {
        const add = moving.filter((g) => g.table_id === t.id);
        if (add.length === 0) return t;
        const guests = [...t.guests, ...add];
        return {
          ...t,
          guests,
          occupiedSeats: guests.reduce((a, g) => a + g.attending_count, 0),
        };
      });
      const seated = tables.reduce((a, t) => a + t.occupiedSeats, 0);
      const waiting = unseated.reduce((a, g) => a + g.attending_count, 0);
      return {
        tables,
        unseatedGuests: unseated,
        stats: {
          totalCapacity: prev.stats.totalCapacity,
          seatedAttendees: seated,
          unseatedAttendees: waiting,
          readinessPct:
            seated + waiting > 0
              ? Math.min(100, Math.round((seated / (seated + waiting)) * 100))
              : 0,
        },
      };
    };
    setData((prev) => apply(prev, () => true));
    const res = await bulkAssignSeatsAction(eventId, pairs);
    if (!res.ok || !res.data) {
      setData(previous);
      setErrorMsg(res.error || "Could not seat the guests.");
      return { seated: 0, failed: pairs.length };
    }
    const failed = new Set(res.data.failed);
    if (failed.size > 0) setData(apply(previous, (id) => !failed.has(id)));
    setSuccessMsg(
      failed.size > 0
        ? `Seated ${res.data.seated}; ${failed.size} could not be seated.`
        : `Seating chart updated: ${res.data.seated} guests seated.`
    );
    return { seated: res.data.seated, failed: failed.size };
  };

  return {
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
    pendingDelete,
    cancelDelete,
    confirmDelete,
    deleteTables,
  };
}

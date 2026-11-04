import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SeatingDeskData, SeatingGuest, TableWithGuests } from "./types";

export async function getEventSeatingData(
  eventId: string
): Promise<SeatingDeskData> {
  const cleanId = eventId?.trim();
  if (!cleanId || cleanId === "default") {
    return {
      tables: [],
      unseatedGuests: [],
      stats: {
        totalCapacity: 0,
        seatedAttendees: 0,
        unseatedAttendees: 0,
        readinessPct: 0,
      },
    };
  }

  const supabase = await createClient();

  const [tablesRes, guestsRes] = await Promise.all([
    supabase
      .from("tables")
      .select("*")
      .eq("event_id", eventId)
      .order("name", { ascending: true }),
    supabase
      .from("guests")
      .select(
        `
        id,
        name,
        side,
        group_name,
        is_vip,
        seating_conflict_at,
        party_size,
        plus_ones_allowed,
        rsvps (
          status,
          attending_count,
          plus_one_name,
          dietary
        ),
        seat_assignments (
          table_id
        )
      `
      )
      .eq("event_id", eventId)
      .order("name", { ascending: true }),
  ]);

  if (tablesRes.error) {
    console.error("[getEventSeatingData] Failed to load tables:", {
      code: tablesRes.error.code,
      message: tablesRes.error.message,
    });
    throw new Error(
      `Failed to load seating tables: ${tablesRes.error.message}`
    );
  }

  if (guestsRes.error) {
    console.error("[getEventSeatingData] Failed to load guests:", {
      code: guestsRes.error.code,
      message: guestsRes.error.message,
    });
    throw new Error(
      `Failed to load seating guests: ${guestsRes.error.message}`
    );
  }

  const rawTables = tablesRes.data || [];
  const rawGuests = guestsRes.data || [];

  const allSeatingGuests: SeatingGuest[] = [];

  for (const g of rawGuests) {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const seat = Array.isArray(g.seat_assignments)
      ? g.seat_assignments[0]
      : g.seat_assignments;

    const status =
      (rsvp?.status as "accepted" | "declined" | "pending") || "pending";

    // Exclude declined guests from seating charts
    if (status === "declined") {
      continue;
    }

    const attendingCount =
      status === "accepted" ? rsvp?.attending_count || 1 : g.party_size || 1;

    allSeatingGuests.push({
      id: g.id,
      name: g.name,
      side: g.side || "Guest",
      group_name: g.group_name || null,
      is_vip: Boolean(g.is_vip),
      party_size: g.party_size || 1,
      attending_count: attendingCount,
      status,
      plus_one_name: rsvp?.plus_one_name || null,
      dietary: rsvp?.dietary || null,
      table_id: seat?.table_id || null,
      seating_conflict_at: (g as Record<string, unknown>).seating_conflict_at
        ? String((g as Record<string, unknown>).seating_conflict_at)
        : null,
    });
  }

  const tableMap = new Map<string, TableWithGuests>();
  for (const t of rawTables) {
    tableMap.set(t.id, {
      ...t,
      guests: [],
      occupiedSeats: 0,
    });
  }

  const unseatedGuests: SeatingGuest[] = [];
  let seatedAttendees = 0;
  let unseatedAttendees = 0;

  for (const guest of allSeatingGuests) {
    if (guest.table_id && tableMap.has(guest.table_id)) {
      const table = tableMap.get(guest.table_id)!;
      table.guests.push(guest);
      table.occupiedSeats += guest.attending_count;
      seatedAttendees += guest.attending_count;
    } else {
      unseatedGuests.push(guest);
      unseatedAttendees += guest.attending_count;
    }
  }

  // Prioritize guests with seating conflicts (e.g. party size changed on RSVP) at the top
  unseatedGuests.sort((a, b) => {
    if (a.seating_conflict_at && !b.seating_conflict_at) return -1;
    if (!a.seating_conflict_at && b.seating_conflict_at) return 1;
    if (a.seating_conflict_at && b.seating_conflict_at) {
      return (
        new Date(b.seating_conflict_at).getTime() -
        new Date(a.seating_conflict_at).getTime()
      );
    }
    return a.name.localeCompare(b.name);
  });

  // "Table 2" before "Table 10".
  const tables = Array.from(tableMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
  const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);
  const totalAttendees = seatedAttendees + unseatedAttendees;
  const readinessPct =
    totalAttendees > 0
      ? Math.min(100, Math.round((seatedAttendees / totalAttendees) * 100))
      : 0;

  return {
    tables,
    unseatedGuests,
    stats: {
      totalCapacity,
      seatedAttendees,
      unseatedAttendees,
      readinessPct,
    },
  };
}

/**
 * The hall studio's room document for an event. `available` is false when the database has not
 * been migrated yet, so the studio can fall back to keeping the layout on the device.
 */
export async function getHallLayout(
  eventId: string
): Promise<{ layout: unknown; available: boolean }> {
  const cleanId = eventId?.trim();
  if (!cleanId || cleanId === "default")
    return { layout: null, available: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("hall_layout")
    .eq("id", cleanId)
    .maybeSingle();
  if (error) {
    console.warn("[getHallLayout] hall_layout unavailable:", error.code);
    return { layout: null, available: false };
  }
  return { layout: data?.hall_layout ?? null, available: true };
}

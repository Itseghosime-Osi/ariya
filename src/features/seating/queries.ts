import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SeatingDeskData, SeatingGuest, TableWithGuests } from "./types";

export async function getEventSeatingData(
  eventId: string
): Promise<SeatingDeskData> {
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

  const tables = Array.from(tableMap.values());
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

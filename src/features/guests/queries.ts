import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  GuestFilterState,
  GuestListResponse,
  GuestWithRsvpAndSeat,
} from "./types";

export { getGuestOverviewStats } from "./stats";

export async function getEventGuests(
  eventId: string,
  filters: GuestFilterState
): Promise<GuestListResponse> {
  const supabase = await createClient();
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.max(5, Math.min(100, filters.pageSize || 15));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("guests")
    .select(
      `
      id,
      event_id,
      name,
      phone,
      email,
      side,
      group_name,
      party_size,
      plus_ones_allowed,
      is_vip,
      rsvp_token,
      notes,
      invited_at,
      created_at,
      updated_at,
      rsvps (id, status, attending_count, plus_one_name, dietary, note, responded_at),
      seat_assignments (table_id, tables (name))
    `,
      { count: "exact" }
    )
    .eq("event_id", eventId);

  const search = filters.search?.trim();
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (filters.side && filters.side !== "all") {
    query = query.ilike("side", filters.side);
  }

  if (filters.group && filters.group !== "all") {
    query = query.eq("group_name", filters.group);
  }

  if (typeof filters.isVip === "boolean") {
    query = query.eq("is_vip", filters.isVip);
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error || !data) {
    return {
      guests: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const mapped: GuestWithRsvpAndSeat[] = data.map((row) => {
    const rawRsvps = row.rsvps as unknown;
    const rsvpItem = Array.isArray(rawRsvps)
      ? rawRsvps[0]
      : (rawRsvps as Record<string, unknown> | null);

    const rawSeats = row.seat_assignments as unknown;
    const seatItem = Array.isArray(rawSeats)
      ? rawSeats[0]
      : (rawSeats as {
          table_id?: string;
          tables?: { name?: string | null } | null;
        } | null);

    return {
      id: row.id,
      event_id: row.event_id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      side: row.side,
      group_name: row.group_name,
      party_size: row.party_size,
      plus_ones_allowed: row.plus_ones_allowed,
      is_vip: row.is_vip,
      rsvp_token: row.rsvp_token,
      notes: row.notes,
      invited_at: row.invited_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      rsvp: rsvpItem
        ? {
            id: String(rsvpItem.id ?? ""),
            status:
              (rsvpItem.status as "accepted" | "declined" | "pending") ??
              "pending",
            attending_count: Number(rsvpItem.attending_count ?? row.party_size),
            plus_one_name: (rsvpItem.plus_one_name as string | null) ?? null,
            dietary: (rsvpItem.dietary as string | null) ?? null,
            note: (rsvpItem.note as string | null) ?? null,
            responded_at: (rsvpItem.responded_at as string | null) ?? null,
          }
        : null,
      seat: seatItem
        ? {
            table_id: seatItem.table_id,
            table_name: seatItem.tables?.name ?? null,
          }
        : null,
    };
  });

  let filtered = mapped;
  if (filters.rsvpStatus && filters.rsvpStatus !== "all") {
    filtered = filtered.filter((g) => {
      const status = g.rsvp?.status ?? "pending";
      return status === filters.rsvpStatus;
    });
  }

  if (filters.seatedStatus && filters.seatedStatus !== "all") {
    filtered = filtered.filter((g) => {
      const isSeated = Boolean(g.seat?.table_id);
      return filters.seatedStatus === "seated" ? isSeated : !isSeated;
    });
  }

  const totalCount = count ?? filtered.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    guests: filtered,
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

export async function getGuestFilterOptions(
  eventId: string
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guests")
    .select("group_name")
    .eq("event_id", eventId)
    .not("group_name", "is", null);

  if (!data) return [];
  const groups = new Set<string>();
  data.forEach((r) => {
    if (r.group_name?.trim()) groups.add(r.group_name.trim());
  });
  return Array.from(groups).sort();
}

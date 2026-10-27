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
  const pageSize = Math.max(5, Math.min(100, filters.pageSize || 25));
  const offset = (page - 1) * pageSize;

  const { data, error } = await supabase.rpc("search_guests", {
    p_event_id: eventId,
    p_search: filters.search?.trim() || undefined,
    p_side:
      filters.side && filters.side !== "all"
        ? filters.side.toLowerCase()
        : undefined,
    p_group:
      filters.group && filters.group !== "all" ? filters.group : undefined,
    p_rsvp_status:
      filters.rsvpStatus && filters.rsvpStatus !== "all"
        ? filters.rsvpStatus
        : undefined,
    p_seated_status:
      filters.seatedStatus && filters.seatedStatus !== "all"
        ? filters.seatedStatus
        : undefined,
    p_is_vip: typeof filters.isVip === "boolean" ? filters.isVip : undefined,
    p_limit: pageSize,
    p_offset: offset,
  });

  if (error || !data || data.length === 0) {
    return {
      guests: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const totalCount = Number(data[0]?.total_count ?? 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  const mapped: GuestWithRsvpAndSeat[] = data.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    email_collected_via_rsvp: false,
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
    rsvp: row.rsvp_id
      ? {
          id: row.rsvp_id,
          status:
            (row.rsvp_status as "accepted" | "declined" | "pending") ??
            "pending",
          attending_count: row.rsvp_attending_count,
          plus_one_name: row.rsvp_plus_one_name,
          dietary: row.rsvp_dietary,
          note: row.rsvp_note,
          responded_at: row.rsvp_responded_at,
        }
      : null,
    seat: row.seat_table_id
      ? {
          table_id: row.seat_table_id,
          table_name: row.seat_table_name,
        }
      : null,
  }));

  return {
    guests: mapped,
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

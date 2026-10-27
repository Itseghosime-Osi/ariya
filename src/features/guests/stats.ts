import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { GuestOverviewStats } from "./types";

export async function getGuestOverviewStats(
  eventId: string
): Promise<GuestOverviewStats> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guests")
    .select(
      `
      id,
      party_size,
      is_vip,
      rsvps (status, attending_count),
      seat_assignments (id)
    `
    )
    .eq("event_id", eventId);

  if (!data) {
    return {
      totalCount: 0,
      totalAttendees: 0,
      acceptedCount: 0,
      acceptedGuests: 0,
      pendingCount: 0,
      declinedCount: 0,
      seatedCount: 0,
      unassignedCount: 0,
      vipCount: 0,
    };
  }

  let totalAttendees = 0;
  let acceptedCount = 0;
  let acceptedGuests = 0;
  let pendingCount = 0;
  let declinedCount = 0;
  let seatedCount = 0;
  let vipCount = 0;

  for (const g of data) {
    totalAttendees += g.party_size;
    if (g.is_vip) vipCount += 1;

    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const status = (rsvp as { status?: string })?.status ?? "pending";
    const attendees =
      (rsvp as { attending_count?: number })?.attending_count ?? g.party_size;

    if (status === "accepted") {
      acceptedCount += 1;
      acceptedGuests += attendees;
    } else if (status === "declined") {
      declinedCount += 1;
    } else {
      pendingCount += 1;
    }

    const hasSeat = Array.isArray(g.seat_assignments)
      ? g.seat_assignments.length > 0
      : Boolean(g.seat_assignments);
    if (hasSeat) {
      seatedCount += status === "accepted" ? attendees : g.party_size;
    }
  }

  return {
    totalCount: data.length,
    totalAttendees,
    acceptedCount,
    acceptedGuests,
    pendingCount,
    declinedCount,
    seatedCount,
    unassignedCount: Math.max(0, acceptedGuests - seatedCount),
    vipCount,
  };
}

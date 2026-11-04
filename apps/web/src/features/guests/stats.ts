import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCelebrationMetrics,
  type GuestMetricItem,
} from "@/lib/metrics";
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

  if (!data || data.length === 0) {
    return {
      totalCount: 0,
      totalAttendees: 0,
      acceptedCount: 0,
      acceptedGuests: 0,
      pendingCount: 0,
      declinedCount: 0,
      declinedGuests: 0,
      seatedCount: 0,
      unassignedCount: 0,
      vipCount: 0,
    };
  }

  const m = calculateCelebrationMetrics(data as unknown as GuestMetricItem[]);

  return {
    totalCount: m.invitedParties,
    totalAttendees: m.totalAttendees,
    acceptedCount: m.acceptedParties,
    acceptedGuests: m.expectedPeople,
    pendingCount: m.awaitingParties,
    declinedCount: m.declinedParties,
    declinedGuests: m.declinedGuests,
    seatedCount: m.seatedPeople,
    unassignedCount: m.unassignedPeople,
    vipCount: m.vipParties,
  };
}

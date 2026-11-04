import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CheckInDeskData, RecentCheckIn, CheckInStats } from "./types";

export async function getCheckInDeskData(
  eventId: string
): Promise<CheckInDeskData> {
  const cleanId = eventId?.trim();
  if (!cleanId || cleanId === "default") {
    return {
      stats: {
        totalExpected: 0,
        checkedIn: 0,
        remaining: 0,
        attendanceRate: 0,
      },
      recentCheckIns: [],
    };
  }

  const supabase = await createClient();

  const [expectedRes, checkInsRes, tablesRes] = await Promise.all([
    supabase
      .from("rsvps")
      .select("attending_count, guests!inner(event_id)")
      .eq("guests.event_id", cleanId)
      .eq("status", "accepted"),
    supabase
      .from("check_ins")
      .select("id, guest_id, checked_in_count, checked_in_at, guests(name)")
      .eq("event_id", cleanId)
      .order("checked_in_at", { ascending: false })
      .limit(20),
    supabase
      .from("seat_assignments")
      .select("guest_id, tables(name)")
      .eq("tables.event_id", cleanId),
  ]);

  if (expectedRes.error) {
    console.error("[getCheckInDeskData] Failed to load RSVPs:", {
      code: expectedRes.error.code,
      message: expectedRes.error.message,
    });
    throw new Error(
      `Failed to load check-in RSVPs: ${expectedRes.error.message}`
    );
  }
  if (checkInsRes.error) {
    console.error("[getCheckInDeskData] Failed to load check-ins:", {
      code: checkInsRes.error.code,
      message: checkInsRes.error.message,
    });
    throw new Error(`Failed to load check-ins: ${checkInsRes.error.message}`);
  }
  if (tablesRes.error) {
    console.error("[getCheckInDeskData] Failed to load seating assignments:", {
      code: tablesRes.error.code,
      message: tablesRes.error.message,
    });
    throw new Error(
      `Failed to load check-in tables: ${tablesRes.error.message}`
    );
  }

  const rawExpected = expectedRes.data || [];
  const totalExpected = rawExpected.reduce(
    (sum, r) => sum + (r.attending_count || 1),
    0
  );

  const rawCheckIns = (checkInsRes.data || []) as unknown as Array<{
    id: string;
    guest_id: string;
    checked_in_count: number;
    checked_in_at: string;
    guests: {
      display_name?: string | null;
      first_name?: string | null;
      name: string;
    } | null;
  }>;

  const totalCheckedIn = rawCheckIns.reduce(
    (sum, c) => sum + (c.checked_in_count || 1),
    0
  );

  const remaining = Math.max(0, totalExpected - totalCheckedIn);
  const attendanceRate =
    totalExpected > 0
      ? Math.min(100, Math.round((totalCheckedIn / totalExpected) * 100))
      : 0;

  const stats: CheckInStats = {
    totalExpected,
    checkedIn: totalCheckedIn,
    remaining,
    attendanceRate,
  };

  const tableByGuest = new Map<string, string>();
  for (const item of (tablesRes.data || []) as unknown as Array<{
    guest_id: string;
    tables: { name: string } | null;
  }>) {
    if (item.tables?.name) {
      tableByGuest.set(item.guest_id, item.tables.name);
    }
  }

  const recentCheckIns: RecentCheckIn[] = rawCheckIns.map((c) => {
    const guestName =
      c.guests?.display_name ||
      c.guests?.name ||
      c.guests?.first_name ||
      "Honoured Guest";
    return {
      id: c.id,
      guest_name: guestName,
      count: c.checked_in_count || 1,
      checked_in_at: c.checked_in_at,
      table_name: tableByGuest.get(c.guest_id) || null,
    };
  });

  return { stats, recentCheckIns };
}

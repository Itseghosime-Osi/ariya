import "server-only";
import { getPartyDisplaySeats } from "@/lib/metrics";
import { createClient } from "@/lib/supabase/server";
import type { EventWithMetrics } from "../types";
import type { ComingUpVendorTaskInput } from "../lib/coming-up";

export interface RecentReplyItem {
  id: string;
  guestName: string;
  status: "accepted" | "declined";
  partySize: number;
  eventId: string;
  eventTitle: string;
  updatedAt: string;
}

export interface CrossEventHomeData {
  vendorTasks: ComingUpVendorTaskInput[];
  invitedCountByEventId: Record<string, number>;
  recentReplies: RecentReplyItem[];
}

export async function getRecentRepliesAcrossEvents(
  activeEventIds: string[]
): Promise<RecentReplyItem[]> {
  if (activeEventIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("rsvps")
    .select(
      `
      id,
      status,
      attending_count,
      responded_at,
      updated_at,
      guests!inner (
        id,
        name,
        party_size,
        event_id,
        events!inner (
          id,
          title
        )
      )
    `
    )
    .in("status", ["accepted", "declined"])
    .in("guests.event_id", activeEventIds)
    .order("updated_at", { ascending: false })
    .limit(6);

  return (data ?? []).map((row) => {
    const guest = Array.isArray(row.guests) ? row.guests[0] : row.guests;
    const event = Array.isArray(guest?.events)
      ? guest?.events[0]
      : guest?.events;
    const status = row.status === "declined" ? "declined" : "accepted";
    const partySize = getPartyDisplaySeats({
      party_size: guest?.party_size ?? 1,
      rsvp: { status, attending_count: row.attending_count },
    });
    return {
      id: row.id,
      guestName: guest?.name ?? "Guest",
      status,
      partySize,
      eventId: event?.id ?? guest?.event_id ?? "",
      eventTitle: event?.title ?? "Celebration",
      updatedAt: row.responded_at ?? row.updated_at,
    };
  });
}

export async function getCrossEventHomeData(
  events: EventWithMetrics[]
): Promise<CrossEventHomeData> {
  const activeEventIds = events
    .filter((item) => item.event.status !== "archived")
    .map((item) => item.event.id);

  if (activeEventIds.length === 0) {
    return { vendorTasks: [], invitedCountByEventId: {}, recentReplies: [] };
  }

  const unpaidEventIds = events
    .filter((item) => item.event.status !== "archived" && !item.event.paid_at)
    .map((item) => item.event.id);

  const supabase = await createClient();

  const tasksPromise = supabase
    .from("vendor_tasks")
    .select(
      `
      id,
      event_id,
      task,
      due_date,
      is_done,
      vendors (name, category)
    `
    )
    .in("event_id", activeEventIds)
    .eq("is_done", false)
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  const invitesPromise =
    unpaidEventIds.length > 0
      ? supabase
          .from("guests")
          .select("id, event_id")
          .in("event_id", unpaidEventIds)
          .not("invited_at", "is", null)
      : Promise.resolve({ data: [], error: null });

  const [tasksRes, invitesRes, recentReplies] = await Promise.all([
    tasksPromise,
    invitesPromise,
    getRecentRepliesAcrossEvents(activeEventIds),
  ]);

  const vendorTasks: ComingUpVendorTaskInput[] = (tasksRes.data ?? []).map(
    (row) => {
      const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
      return {
        id: row.id,
        eventId: row.event_id,
        task: row.task,
        dueDate: row.due_date,
        isDone: row.is_done,
        vendorName: vendor?.name ?? null,
        vendorCategory: vendor?.category ?? null,
      };
    }
  );

  const invitedCountByEventId: Record<string, number> = {};
  for (const id of unpaidEventIds) {
    invitedCountByEventId[id] = 0;
  }
  for (const guest of invitesRes.data ?? []) {
    invitedCountByEventId[guest.event_id] =
      (invitedCountByEventId[guest.event_id] ?? 0) + 1;
  }

  return { vendorTasks, invitedCountByEventId, recentReplies };
}

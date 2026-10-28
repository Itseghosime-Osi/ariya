import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EventWithMetrics } from "../types";
import type { ComingUpVendorTaskInput } from "../lib/coming-up";

export interface CrossEventHomeData {
  vendorTasks: ComingUpVendorTaskInput[];
  invitedCountByEventId: Record<string, number>;
}

/**
 * Queries open vendor tasks with due dates and free-plan invited guest counts
 * across all of the user's upcoming events in parallel using the existing RLS client.
 */
export async function getCrossEventHomeData(
  events: EventWithMetrics[]
): Promise<CrossEventHomeData> {
  const activeEventIds = events
    .filter((item) => item.event.status !== "archived")
    .map((item) => item.event.id);

  if (activeEventIds.length === 0) {
    return { vendorTasks: [], invitedCountByEventId: {} };
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

  const [tasksRes, invitesRes] = await Promise.all([
    tasksPromise,
    invitesPromise,
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

  return { vendorTasks, invitedCountByEventId };
}

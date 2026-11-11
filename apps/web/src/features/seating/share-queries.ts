import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseLayout, type HallLayout } from "./hall/model";
import { shareOf } from "./hall/share";

export interface SharedPlan {
  title: string;
  date: string;
  venue: string;
  layout: HallLayout;
  tables: {
    id: string;
    name: string;
    shape: string;
    capacity: number;
    /** Centimetres from the hall's top-left corner. */
    x: number;
    y: number;
  }[];
}

/**
 * The floor plan behind a view-only link, or null when the link is wrong or was stopped.
 *
 * Read with the service role because the person opening it is not a member, so it returns only
 * what a venue manager needs: the event's name, date and venue, the room and its tables. No guest
 * names, no contacts, no seating. The token must match the one stored beside the hall exactly.
 */
export async function getSharedPlan(token: string): Promise<SharedPlan | null> {
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return null;
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, date, venue, hall_layout")
    .eq("hall_layout->share->>token", token)
    .maybeSingle();
  if (!event) return null;
  // Belt and braces: the filter matched, but compare the stored token itself before showing anything.
  if (shareOf(event.hall_layout)?.token !== token) return null;
  const layout = normaliseLayout(event.hall_layout);
  if (!layout) return null;

  const { data: tables } = await admin
    .from("tables")
    .select("id, name, shape, capacity, position_x, position_y")
    .eq("event_id", event.id)
    .order("name");

  return {
    title: event.title,
    date: event.date,
    venue: event.venue,
    layout,
    tables: (tables ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      shape: t.shape,
      capacity: t.capacity,
      x: Number(t.position_x) || 0,
      y: Number(t.position_y) || 0,
    })),
  };
}

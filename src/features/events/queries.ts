import "server-only";
import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/format";
import type {
  EventMetrics,
  EventWithMetrics,
  MilestoneItem,
  RecentGuestResponse,
} from "./types";

export async function getUserEvents(): Promise<EventWithMetrics[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  // Single aggregated query via RPC: eliminates N+1 queries across events, guests, rsvps and tables
  const { data, error } = await supabase.rpc("get_user_events_with_metrics");
  if (error || !data || !Array.isArray(data)) {
    return [];
  }

  return data.map((item) => {
    const raw = item as Record<string, unknown>;
    return {
      event: raw.event as EventWithMetrics["event"],
      role: raw.role as EventWithMetrics["role"],
      metrics: raw.metrics as EventWithMetrics["metrics"],
    };
  });
}

export async function getEventById(
  eventId: string
): Promise<EventWithMetrics | null> {
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) {
    return null;
  }

  const metrics = await getEventMetrics(event.id, event.date);

  return {
    event,
    role: "owner",
    metrics,
  };
}

export async function getEventMetrics(
  eventId: string,
  eventDate: string
): Promise<EventMetrics> {
  const supabase = await createClient();

  // Query guests and RSVPs for this event
  const { data: rawGuests } = await supabase
    .from("guests")
    .select("id, party_size, rsvps (status, attending_count)")
    .eq("event_id", eventId);

  const guests = rawGuests ?? [];

  // Query seating assignments count for this event
  const { count: seatedCount } = await supabase
    .from("seat_assignments")
    .select("id, tables!inner(event_id)", { count: "exact", head: true })
    .eq("tables.event_id", eventId);

  const daysAway = Math.max(0, daysUntil(eventDate));

  if (guests.length === 0) {
    return {
      totalParties: 0,
      totalAttendees: 0,
      acceptedParties: 0,
      acceptedGuests: 0,
      awaitingParties: 0,
      awaitingGuests: 0,
      declinedParties: 0,
      declinedGuests: 0,
      seatedGuests: 0,
      unassignedGuests: 0,
      readinessPercentage: 0,
      daysAway,
    };
  }

  const totalParties = guests.length;
  let totalAttendees = 0;
  let acceptedParties = 0;
  let acceptedGuests = 0;
  let awaitingParties = 0;
  let awaitingGuests = 0;
  let declinedParties = 0;
  let declinedGuests = 0;

  for (const g of guests) {
    totalAttendees += g.party_size;
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const status = rsvp?.status ?? "pending";
    const count = rsvp?.attending_count ?? g.party_size;

    if (status === "accepted") {
      acceptedParties += 1;
      acceptedGuests += count;
    } else if (status === "declined") {
      declinedParties += 1;
      declinedGuests += count;
    } else {
      awaitingParties += 1;
      awaitingGuests += count;
    }
  }

  const seated = seatedCount ?? 0;
  const unassigned = Math.max(0, acceptedGuests - seated);
  const readiness =
    totalAttendees > 0
      ? Math.round((acceptedGuests / totalAttendees) * 1000) / 10
      : 0;

  return {
    totalParties,
    totalAttendees,
    acceptedParties,
    acceptedGuests,
    awaitingParties,
    awaitingGuests,
    declinedParties,
    declinedGuests,
    seatedGuests: seated,
    unassignedGuests: unassigned,
    readinessPercentage: readiness,
    daysAway,
  };
}

export async function getEventRecentResponses(
  eventId: string
): Promise<RecentGuestResponse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .select(
      "id, name, side, group_name, rsvps (status, attending_count, updated_at, dietary), seat_assignments (tables (name))"
    )
    .eq("event_id", eventId)
    .limit(10);

  if (error || !data || data.length === 0) {
    return [];
  }

  return data
    .filter((g) => {
      const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
      return rsvp && rsvp.status !== "pending";
    })
    .map((g) => {
      const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
      const initials = g.name
        .split(" ")
        .filter(Boolean)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const assignment = Array.isArray(g.seat_assignments)
        ? g.seat_assignments[0]
        : g.seat_assignments;
      const tableName = assignment?.tables?.name ?? null;

      return {
        id: g.id,
        guestName: g.name,
        initials: initials || "G",
        side: g.side ?? "Celebration Guest",
        groupName: g.group_name ?? null,
        status:
          (rsvp?.status as "accepted" | "declined" | "pending") ?? "accepted",
        attendingCount: rsvp?.attending_count ?? 1,
        tableName,
        timeAgo: "Recently",
      };
    });
}

export async function getEventMilestones(
  eventId: string
): Promise<MilestoneItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_tasks")
    .select("id, task, due_date, is_done")
    .eq("event_id", eventId)
    .order("due_date", { ascending: true })
    .limit(5);

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map((t) => ({
    id: t.id,
    title: t.task,
    description: t.is_done ? "Completed task" : "Pending vendor task",
    category: "Vendor",
    dueDate: t.due_date
      ? new Date(t.due_date).toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
        })
      : "TBD",
    daysAway: t.due_date ? Math.max(0, daysUntil(t.due_date)) : 0,
    eventTitle: "",
  }));
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/format";
import {
  calculateCelebrationMetrics,
  type GuestMetricItem,
} from "@/lib/metrics";
import type {
  EventMetrics,
  EventWithMetrics,
  MilestoneItem,
  RecentGuestResponse,
} from "./types";
import type {
  ConstellationGuest,
  PlanningTask,
  PlanningVendor,
} from "./lib/overview-insights";

export interface ScheduleSlot {
  time: string;
  title: string;
  location?: string;
}

export interface PublicCelebration {
  id: string;
  slug: string;
  title: string;
  couple: string;
  date: string;
  venue: string;
  area: string | null;
  dressCode: string | null;
  rsvpBy: string | null;
  status: string;
  isPublic?: boolean;
  description?: string | null;
  coverImageUrl?: string | null;
  schedule?: ScheduleSlot[];
}

export async function getPublicEventBySlug(
  slug: string
): Promise<PublicCelebration | null> {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_event", {
    p_slug: cleanSlug,
  });

  if (error) {
    console.error("[getPublicEventBySlug] Database error:", {
      code: error.code,
      message: error.message,
    });
    throw new Error(`Database error loading public event: ${error.message}`);
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  if (!raw.id || !raw.slug) {
    return null;
  }

  return {
    id: String(raw.id),
    slug: String(raw.slug),
    title: String(raw.title),
    couple: String(raw.couple),
    date: String(raw.date),
    venue: String(raw.venue),
    area: raw.area ? String(raw.area) : null,
    dressCode: raw.dress_code ? String(raw.dress_code) : null,
    rsvpBy: raw.rsvp_by ? String(raw.rsvp_by) : null,
    status: String(raw.status),
    isPublic: Boolean(raw.is_public),
    description: raw.description ? String(raw.description) : null,
    coverImageUrl: raw.cover_image_url ? String(raw.cover_image_url) : null,
    schedule: Array.isArray(raw.schedule)
      ? (raw.schedule as ScheduleSlot[])
      : [],
  };
}

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
  if (error) {
    console.error("[getUserEvents] Database error:", {
      code: error.code,
      message: error.message,
    });
    throw new Error(`Database error loading user events: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map((item) => {
    const raw = item as Record<string, unknown>;
    const rawMetrics = (raw.metrics as Record<string, unknown>) || {};
    const totalParties = Number(rawMetrics.totalParties || 0);
    const acceptedParties = Number(rawMetrics.acceptedParties || 0);
    const declinedParties = Number(rawMetrics.declinedParties || 0);
    const respondedParties = acceptedParties + declinedParties;
    const rsvpRate =
      totalParties > 0
        ? Math.round((respondedParties / totalParties) * 100)
        : 0;
    const acceptedPartiesPct =
      totalParties > 0 ? Math.round((acceptedParties / totalParties) * 100) : 0;
    const declinedPartiesPct =
      totalParties > 0 ? Math.round((declinedParties / totalParties) * 100) : 0;
    const awaitingPartiesPct =
      totalParties > 0
        ? Math.max(0, 100 - acceptedPartiesPct - declinedPartiesPct)
        : 0;

    const metrics: EventWithMetrics["metrics"] = {
      ...(rawMetrics as unknown as EventWithMetrics["metrics"]),
      totalParties,
      acceptedParties,
      declinedParties,
      rsvpRate,
      acceptedPartiesPct,
      declinedPartiesPct,
      awaitingPartiesPct,
    };

    return {
      event: raw.event as EventWithMetrics["event"],
      role: raw.role as EventWithMetrics["role"],
      metrics,
    };
  });
}

export async function getEventById(
  eventId: string
): Promise<EventWithMetrics | null> {
  const cleanId = eventId?.trim();
  if (!cleanId || cleanId === "default") {
    return null;
  }

  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", cleanId)
    .maybeSingle();

  if (error) {
    console.error("[getEventById] Database error loading event:", {
      code: error.code,
      message: error.message,
    });
    throw new Error(`Database error loading event: ${error.message}`);
  }

  if (!event) {
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

  const { data: rawGuests, error: guestsError } = await supabase
    .from("guests")
    .select(
      "id, party_size, is_vip, seating_conflict_at, rsvps (status, attending_count), seat_assignments (id)"
    )
    .eq("event_id", eventId);

  if (guestsError) {
    console.error("[getEventMetrics] Database error loading guests:", {
      code: guestsError.code,
      message: guestsError.message,
    });
    throw new Error(`Database error loading guests: ${guestsError.message}`);
  }

  const guests = rawGuests ?? [];
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
      conflictedParties: 0,
      acceptedPartiesPct: 0,
      declinedPartiesPct: 0,
      awaitingPartiesPct: 0,
      rsvpRate: 0,
    };
  }

  const m = calculateCelebrationMetrics(guests as unknown as GuestMetricItem[]);
  const readiness = m.rsvpRate;

  return {
    totalParties: m.invitedParties,
    totalAttendees: m.totalAttendees,
    acceptedParties: m.acceptedParties,
    acceptedGuests: m.expectedPeople,
    awaitingParties: m.awaitingParties,
    awaitingGuests: m.awaitingGuests,
    declinedParties: m.declinedParties,
    declinedGuests: m.declinedGuests,
    seatedGuests: m.seatedPeople,
    unassignedGuests: m.unassignedPeople,
    readinessPercentage: readiness,
    daysAway,
    conflictedParties: m.conflictedParties,
    acceptedPartiesPct: m.acceptedPartiesPct,
    declinedPartiesPct: m.declinedPartiesPct,
    awaitingPartiesPct: m.awaitingPartiesPct,
    rsvpRate: m.rsvpRate,
  };
}

export async function getEventRecentResponses(
  eventId: string
): Promise<RecentGuestResponse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .select(
      "id, name, side, group_name, party_size, rsvps (status, attending_count, updated_at, dietary), seat_assignments (tables (name))"
    )
    .eq("event_id", eventId)
    .limit(10);

  if (error) {
    console.error("[getEventRecentResponses] Database error:", {
      code: error.code,
      message: error.message,
    });
    throw new Error(
      `Database error loading recent responses: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
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
      const partySize = g.party_size && g.party_size > 0 ? g.party_size : 1;
      const isAccepted = rsvp?.status === "accepted";
      const attendingCount = isAccepted
        ? typeof rsvp?.attending_count === "number" && rsvp.attending_count > 0
          ? rsvp.attending_count
          : partySize
        : 0;

      return {
        id: g.id,
        guestName: g.name,
        initials: initials || "G",
        side: g.side ?? "Celebration Guest",
        groupName: g.group_name ?? null,
        status:
          (rsvp?.status as "accepted" | "declined" | "pending") ?? "accepted",
        partySize,
        attendingCount,
        tableName,
        timeAgo: "Recently",
      };
    });
}

export async function getEventMilestones(
  eventId: string
): Promise<MilestoneItem[]> {
  const cleanId = eventId?.trim();
  if (!cleanId || cleanId === "default") {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_tasks")
    .select("id, task, due_date, is_done")
    .eq("event_id", eventId)
    .order("due_date", { ascending: true })
    .limit(5);

  if (error) {
    console.error("[getEventMilestones] Database error:", {
      code: error.code,
      message: error.message,
    });
    throw new Error(`Database error loading milestones: ${error.message}`);
  }

  if (!data || data.length === 0) {
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

export interface EventPlanningSnapshot {
  vendors: PlanningVendor[];
  tasks: PlanningTask[];
  guests: ConstellationGuest[];
  checkedInPeople: number;
}

/**
 * Everything the celebration desk draws beyond the headline metrics: vendors and their costs, vendor
 * tasks, one row per guest party for the constellation, and how many people have checked in today.
 * A failed side query degrades to empty rather than taking the page down.
 */
export async function getEventPlanningSnapshot(
  eventId: string
): Promise<EventPlanningSnapshot> {
  const supabase = await createClient();
  const [vendorsRes, tasksRes, guestsRes, checkInsRes] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, category, cost_kobo, deposit_kobo, status")
      .eq("event_id", eventId),
    supabase
      .from("vendor_tasks")
      .select("id, task, due_date, is_done, vendors (name)")
      .eq("event_id", eventId),
    supabase
      .from("guests")
      .select("id, name, side, party_size, rsvps (status)")
      .eq("event_id", eventId)
      .limit(1200),
    supabase
      .from("check_ins")
      .select("checked_in_count")
      .eq("event_id", eventId),
  ]);

  for (const [label, res] of [
    ["vendors", vendorsRes],
    ["vendor_tasks", tasksRes],
    ["guests", guestsRes],
    ["check_ins", checkInsRes],
  ] as const) {
    if (res.error) {
      console.error(`[getEventPlanningSnapshot] Could not load ${label}:`, {
        code: res.error.code,
        message: res.error.message,
      });
    }
  }

  const vendors: PlanningVendor[] = (vendorsRes.data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    costKobo: Number(v.cost_kobo) || 0,
    depositKobo: Number(v.deposit_kobo) || 0,
    status: v.status,
  }));

  const tasks: PlanningTask[] = (tasksRes.data ?? []).map((t) => {
    const vendor = Array.isArray(t.vendors) ? t.vendors[0] : t.vendors;
    return {
      id: t.id,
      task: t.task,
      dueDate: t.due_date,
      isDone: t.is_done,
      vendorName: vendor?.name ?? null,
    };
  });

  const guests: ConstellationGuest[] = (guestsRes.data ?? []).map((g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const status =
      rsvp?.status === "accepted" || rsvp?.status === "declined"
        ? rsvp.status
        : "pending";
    return {
      id: g.id,
      name: g.name,
      side: g.side,
      partySize: g.party_size ?? 1,
      status,
    };
  });

  const checkedInPeople = (checkInsRes.data ?? []).reduce(
    (sum, c) => sum + (c.checked_in_count ?? 1),
    0
  );

  return { vendors, tasks, guests, checkedInPeople };
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistInput } from "@ariya/studio";
import type { HallLayout } from "@/features/seating/hall/model";
import type { Phase } from "@ariya/studio";
import {
  PHASE_ORDER,
  RISK_KEY_PREFIX,
  type ChecklistData,
  type ChecklistTask,
  type ChecklistTaskSource,
  type TaskStatus,
} from "./types";

/**
 * The rule ids that already have a live checklist row, so the risk panel can show "on the
 * checklist" after a reload rather than offering to add the same one twice.
 */
export async function getAddedRiskIds(eventId: string): Promise<string[]> {
  const cleanId = eventId?.trim();
  if (!cleanId || cleanId === "default") return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("source_key")
    .eq("event_id", cleanId)
    .like("source_key", `${RISK_KEY_PREFIX}%`)
    .is("deleted_at", null);

  if (error) {
    console.error("[getAddedRiskIds] Database error loading tasks:", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return (data ?? [])
    .map((t) => t.source_key?.slice(RISK_KEY_PREFIX.length))
    .filter((id): id is string => Boolean(id));
}

/**
 * The checklist page's rows, the event it belongs to, and the plan facts the generator reads.
 *
 * `seeded` is false when the event has never been seeded: the page then offers the first run,
 * rather than an empty panel that could be empty, loading or broken.
 */
export async function getChecklistData(
  eventId: string
): Promise<ChecklistData | null> {
  const cleanId = eventId?.trim();
  if (!cleanId || cleanId === "default") return null;

  const supabase = await createClient();

  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, title, couple, date, hall_layout")
    .eq("id", cleanId)
    .maybeSingle();

  if (eventErr) {
    console.error("[getChecklistData] Database error loading event:", {
      code: eventErr.code,
      message: eventErr.message,
    });
    throw new Error(`Database error loading event: ${eventErr.message}`);
  }
  if (!event) return null;

  const [tasksResult, guestsResult, tablesResult, membersResult] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, detail, phase, due_date, status, owner_id, source, source_key, derivation, sort, completed_at, template_version"
        )
        .eq("event_id", cleanId)
        .is("deleted_at", null)
        .order("phase", { ascending: true })
        .order("sort", { ascending: true }),
      supabase
        .from("guests")
        .select("id, party_size, rsvps(status, attending_count)")
        .eq("event_id", cleanId),
      supabase
        .from("tables")
        .select("id", { count: "exact", head: true })
        .eq("event_id", cleanId),
      supabase
        .from("event_members")
        .select("user_id, role, profiles(full_name)")
        .eq("event_id", cleanId),
    ]);

  if (tasksResult.error) {
    console.error("[getChecklistData] Database error loading tasks:", {
      code: tasksResult.error.code,
      message: tasksResult.error.message,
    });
    throw new Error(
      `Database error loading tasks: ${tasksResult.error.message}`
    );
  }

  const layout = (event.hall_layout ?? null) as HallLayout | null;
  const guests = (guestsResult.data ?? []).reduce((sum, g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const attending =
      rsvp?.status === "accepted"
        ? rsvp.attending_count || 1
        : (g.party_size ?? 1);
    return sum + attending;
  }, 0);

  const tasks: ChecklistTask[] = (tasksResult.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    detail: t.detail,
    phase: asPhase(t.phase),
    dueDate: t.due_date,
    status: asStatus(t.status),
    ownerId: t.owner_id,
    source: asSource(t.source),
    sourceKey: t.source_key,
    derivation: t.derivation as ChecklistTask["derivation"],
    sort: t.sort,
    completedAt: t.completed_at,
  }));

  const members = (membersResult.data ?? []).map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      userId: m.user_id,
      role: m.role,
      name: profile?.full_name ?? "A teammate",
    };
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      couple: event.couple,
      date: event.date,
    },
    tasks,
    members,
    seeded: tasks.length > 0,
    input: layout
      ? checklistInput(layout, guests, tablesResult.count ?? 0, event.date)
      : null,
    guests,
    tables: tablesResult.count ?? 0,
  };
}

/**
 * The generator's request for this plan. Mirrors the risk mapper: the hall supplies the room, the
 * counts come from the database, and the month comes from the event date rather than the clock.
 *
 * AC units and the service style are not on the stored layout — they are worked out in the studio
 * and never written back — so those two rows wait until the host records them.
 */
const STATUS_VALUES: readonly TaskStatus[] = [
  "todo",
  "waiting",
  "done",
  "skipped",
];

/** The column is a check constraint, not a Postgres enum, so the generated type is `string`. */
function asPhase(value: string): Phase {
  return (PHASE_ORDER as readonly string[]).includes(value)
    ? (value as Phase)
    : "foundations";
}

function asStatus(value: string): TaskStatus {
  return (STATUS_VALUES as readonly string[]).includes(value)
    ? (value as TaskStatus)
    : "todo";
}

const SOURCE_VALUES: readonly ChecklistTaskSource[] = [
  "template",
  "generated",
  "manual",
];

function asSource(value: string): ChecklistTaskSource {
  return (SOURCE_VALUES as readonly string[]).includes(value)
    ? (value as ChecklistTaskSource)
    : "manual";
}

export function checklistInput(
  layout: HallLayout,
  guests: number,
  tables: number,
  eventDate: string | null
): ChecklistInput {
  const { venue } = layout;
  return {
    eventDate,
    guests,
    venue: venue.type,
    environment: venue.environment,
    tables,
    zoneKinds: layout.zones.map((z) => z.kind),
    month: monthOf(eventDate),
    power: venue.services?.power ?? null,
    acUnits: false,
    service: null,
  };
}

function monthOf(date: string | null): number | null {
  const m = date ? /^\d{4}-(\d{2})/.exec(date) : null;
  if (!m) return null;
  const month = Number(m[1]);
  return month >= 1 && month <= 12 ? month : null;
}

"use server";

import { revalidatePath } from "next/cache";
import type { ChecklistPlan, Reconciliation } from "@ariya/studio";
import { createClient } from "@/lib/supabase/server";
import { RISK_KEY_PREFIX, type TaskStatus } from "./types";

export interface SeedResult {
  success?: boolean;
  error?: string;
  inserted?: number;
  updated?: number;
  retired?: number;
}

const PHASES = [
  "foundations",
  "book",
  "build",
  "detail",
  "final",
  "day",
  "after",
] as const;
type PhaseValue = (typeof PHASES)[number];

function asPhase(value: string): PhaseValue {
  return (PHASES as readonly string[]).includes(value)
    ? (value as PhaseValue)
    : "foundations";
}

/**
 * Write the generator's plan into this event's checklist.
 *
 * The engine is pure, so it runs where the wasm is (the browser or the MCP path) and hands its
 * plan here. This action re-reads the rows and reconciles them itself rather than trusting the
 * caller: the caller may be a page that has been open for an hour.
 */
export async function seedChecklistAction(
  eventId: string,
  plan: ChecklistPlan,
  reconciliation: Reconciliation
): Promise<SeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again." };

  // The caller only says which rows to touch; this decides what they become.
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "This celebration could not be found." };

  const taskByKey = new Map(plan.tasks.map((t) => [t.sourceKey, t]));

  const inserts = reconciliation.insert
    .map((t) => taskByKey.get(t.sourceKey) ?? t)
    .map((t) => ({
      event_id: eventId,
      title: t.title,
      detail: t.detail ?? null,
      phase: asPhase(t.phase),
      due_date: t.dueDate ?? null,
      source: "template" as const,
      source_key: t.sourceKey,
      mitigation: t.mitigation ?? null,
      advice_source: t.adviceSource ?? null,
      time_slot: t.when ?? null,
      derivation: {
        kind: t.riskId ? "risk" : "plan",
        count: t.daysBefore ?? undefined,
        why: t.derivation,
      },
      template_version: plan.templateVersion,
      sort: t.sort,
    }));

  if (inserts.length > 0) {
    const { error } = await supabase.from("tasks").insert(inserts);
    if (error) {
      console.error("[seedChecklistAction] insert failed:", error);
      return { error: `Could not write the checklist: ${error.message}` };
    }
  }

  for (const change of reconciliation.update) {
    const task = taskByKey.get(change.sourceKey);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: change.title,
        derivation: task
          ? { kind: task.riskId ? "risk" : "plan", why: task.derivation }
          : undefined,
        // A reworded rule refreshes the advice on every row that answers it.
        mitigation: task?.mitigation ?? null,
        advice_source: task?.adviceSource ?? null,
        time_slot: task?.when ?? null,
        due_date: change.dueDate,
        template_version: plan.templateVersion,
      })
      .eq("id", change.id)
      .eq("event_id", eventId);
    if (error) {
      console.error("[seedChecklistAction] update failed:", error);
      return { error: `Could not update a task: ${error.message}` };
    }
  }

  for (const id of reconciliation.retire) {
    const { error } = await supabase
      .from("tasks")
      .update({ status: "skipped" })
      .eq("id", id)
      .eq("event_id", eventId);
    if (error) {
      console.error("[seedChecklistAction] retire failed:", error);
      return { error: `Could not retire a task: ${error.message}` };
    }
  }

  revalidatePath(`/events/${eventId}/checklist`);
  return {
    success: true,
    inserted: inserts.length,
    updated: reconciliation.update.length,
    retired: reconciliation.retire.length,
  };
}

/**
 * Turn one risk row into a checklist task (5.2.3).
 *
 * The key is derived from the rule's own id, so asking twice is a no-op rather than a duplicate,
 * and a row the host deleted stays deleted: the tombstone keeps the key, the partial unique index
 * covers live rows only, and this never resurrects one.
 */
export async function addRiskToChecklistAction(
  eventId: string,
  risk: {
    id: string;
    title: string;
    mitigation: string;
    derivation: string;
    source: string;
    due: string | null;
  }
): Promise<{ success?: boolean; error?: string; already?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again." };

  const ruleId = risk.id?.trim();
  if (!ruleId) return { error: "That risk has no rule key to remember it by." };
  const title = risk.title?.trim();
  if (!title) return { error: "That risk has no title to make a task from." };

  // Same read as the seed, so the action sees the event rather than trusting the caller.
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { error: "This celebration could not be found." };

  const sourceKey = `${RISK_KEY_PREFIX}${ruleId}`;

  const { data: existing } = await supabase
    .from("tasks")
    .select("id, deleted_at")
    .eq("event_id", eventId)
    .eq("source_key", sourceKey)
    .maybeSingle();
  if (existing) {
    return {
      success: true,
      already: true,
    };
  }

  const { error } = await supabase.from("tasks").insert({
    event_id: eventId,
    title,
    // The advice goes where advice belongs, and says where it came from. It used to be written to
    // `detail` with its source dropped, which left the host unable to tell advice from a decision.
    detail: null,
    mitigation: risk.mitigation ?? null,
    advice_source: risk.source ?? null,
    // A risk is reader-facing advice, so it belongs with the detail that shapes the day.
    phase: "detail",
    due_date: risk.due ?? null,
    source: "generated" as const,
    source_key: sourceKey,
    derivation: { kind: "risk", rule: ruleId, why: risk.derivation },
    sort: 0,
  });
  if (error) {
    console.error("[addRiskToChecklistAction] insert failed:", error);
    return { error: `Could not add the task: ${error.message}` };
  }

  revalidatePath(`/events/${eventId}/checklist`);
  revalidatePath(`/events/${eventId}/seating`);
  return { success: true };
}

export interface StatusResult {
  success?: boolean;
  error?: string;
  previous?: TaskStatus;
}

/**
 * Move one task between statuses. Returns the previous status so the UI can undo without having
 * to remember it, and so an undo that races a teammate's change does not silently win.
 */
export async function setTaskStatusAction(
  eventId: string,
  taskId: string,
  status: TaskStatus
): Promise<StatusResult> {
  if (!["todo", "waiting", "done", "skipped"].includes(status)) {
    return { error: "That is not a status a task can have." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again." };

  const { data: current, error: readError } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (readError || !current) {
    return { error: "That task could not be found." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("event_id", eventId);
  if (error) {
    console.error("[setTaskStatusAction] update failed:", error);
    return { error: `Could not change the task: ${error.message}` };
  }

  revalidatePath(`/events/${eventId}/checklist`);
  return { success: true, previous: current.status as TaskStatus };
}

/** Delete a task. A generated row is tombstoned, so regeneration will not bring it back. */
export async function deleteTaskAction(
  eventId: string,
  taskId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again." };

  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("event_id", eventId);
  if (error) {
    console.error("[deleteTaskAction] update failed:", error);
    return { error: `Could not delete the task: ${error.message}` };
  }

  revalidatePath(`/events/${eventId}/checklist`);
  return { success: true };
}

/**
 * Take back a delete inside the undo window. Clearing the tombstone restores the row as it was —
 * status, title and derivation are untouched by the delete — and the partial unique index lets
 * its key live again because the row is no longer tombstoned.
 */
export async function restoreTaskAction(
  eventId: string,
  taskId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again." };

  // `.select()` so a no-op update is visible: without it Supabase reports success for a row the
  // policy filtered out, and the host is told the task came back when it did not.
  const { data, error } = await supabase
    .from("tasks")
    .update({ deleted_at: null })
    .eq("id", taskId)
    .eq("event_id", eventId)
    .select("id");
  if (error) {
    console.error("[restoreTaskAction] update failed:", error);
    return { error: `Could not undo the delete: ${error.message}` };
  }
  if (!data || data.length === 0) {
    console.error("[restoreTaskAction] no row matched", { eventId, taskId });
    return { error: "That task is no longer there to bring back." };
  }

  revalidatePath(`/events/${eventId}/checklist`);
  return { success: true };
}

const DAY_MS = 86_400_000;

/**
 * Move the open work into the week ahead (6.3.5).
 *
 * Only todo and waiting rows move, and only when their date is missing or beyond the window. A
 * task already due tomorrow is left where it is — pulling it forward would lose the date someone
 * chose — and the window is capped at a week from now so a stale tab cannot drag the list into
 * the past.
 */
export async function moveOpenToThisWeekAction(
  eventId: string,
  weekEnd: string
): Promise<{ success?: boolean; error?: string; moved?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again." };

  const target = weekEnd.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) {
    return { error: "That is not a date we can move a task to." };
  }
  const horizon = new Date(Date.now() + 7 * DAY_MS).toISOString().slice(0, 10);
  const date = target < horizon ? target : horizon;

  const { data: open, error: readError } = await supabase
    .from("tasks")
    .select("id, due_date")
    .eq("event_id", eventId)
    .is("deleted_at", null)
    .in("status", ["todo", "waiting"]);
  if (readError) {
    console.error("[moveOpenToThisWeekAction] read failed:", readError);
    return { error: `Could not read the list: ${readError.message}` };
  }

  const ids = (open ?? [])
    .filter((t) => !t.due_date || t.due_date > date)
    .map((t) => t.id);
  if (ids.length === 0) return { success: true, moved: 0 };

  const { error } = await supabase
    .from("tasks")
    .update({ due_date: date })
    .eq("event_id", eventId)
    .in("id", ids);
  if (error) {
    console.error("[moveOpenToThisWeekAction] update failed:", error);
    return { error: `Could not move the tasks: ${error.message}` };
  }

  revalidatePath(`/events/${eventId}/checklist`);
  return { success: true, moved: ids.length };
}

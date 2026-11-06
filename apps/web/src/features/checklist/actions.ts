"use server";

import { revalidatePath } from "next/cache";
import type { ChecklistPlan, Reconciliation } from "@ariya/studio";
import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "./types";

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

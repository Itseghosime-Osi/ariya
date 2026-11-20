import type { ChecklistPlan } from "@ariya/studio";

export type PlanTask = ChecklistPlan["tasks"][number];

/**
 * The template rows a checklist does not have yet.
 *
 * A checklist built before the hall was drawn has no venue rows (power, tents, weather). Once a
 * hall plan exists, those rows are added — and only those: a row the host already has keeps their
 * edits, and a row they deleted stays deleted, because `knownKeys` includes deleted rows' keys.
 */
export function missingPlanTasks(
  planTasks: PlanTask[],
  knownKeys: Iterable<string>
): PlanTask[] {
  const known = new Set(knownKeys);
  return planTasks.filter((t) => !known.has(t.sourceKey));
}

import type { ChecklistTask } from "./types";

/**
 * A host who starts their checklist close to the day gets template rows whose due dates were
 * already behind them ("Fix the date", due ten months out, for an event tomorrow). Those are not
 * overdue work the host fell behind on; most were handled before Àríyá was involved. They are kept
 * apart so the list leads with what is still ahead.
 */
export function wasPastWhenAdded(task: ChecklistTask): boolean {
  if (task.status !== "todo" && task.status !== "waiting") return false;
  if (!task.dueDate || !task.createdAt) return false;
  const addedKey = task.createdAt.slice(0, 10);
  return task.dueDate < addedKey;
}

export function splitLateStart(tasks: ChecklistTask[]): {
  ahead: ChecklistTask[];
  pastWhenAdded: ChecklistTask[];
} {
  const ahead: ChecklistTask[] = [];
  const pastWhenAdded: ChecklistTask[] = [];
  for (const t of tasks) (wasPastWhenAdded(t) ? pastWhenAdded : ahead).push(t);
  return { ahead, pastWhenAdded };
}

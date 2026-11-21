import { wasPastWhenAdded } from "./late-start";
import type { ChecklistTask } from "./types";

/**
 * The checklist read as time, not stages: what is late, what is this week, this month, later,
 * undated, and done. A host asks "what do I do now?", and the order of these answers it.
 */
export type BucketKey =
  "overdue" | "week" | "month" | "later" | "undated" | "done";

export const BUCKETS: { key: BucketKey; label: string; hint?: string }[] = [
  { key: "overdue", label: "Overdue", hint: "Past their date and still open" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "later", label: "Later" },
  { key: "undated", label: "No date" },
  { key: "done", label: "Done" },
];

export interface Grouped {
  /** Open rows already past due when the list was built: kept apart, set aside together. */
  earlier: ChecklistTask[];
  buckets: Record<BucketKey, ChecklistTask[]>;
}

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * A task's working date: its own; or, when it has none, the event day for a day-of row and the day
 * after for an after-the-event row, so those read as "on the day" and "afterwards", not "no date".
 */
export function whenDue(
  task: ChecklistTask,
  eventKey: string | null
): string | null {
  if (task.dueDate) return task.dueDate;
  if (!eventKey) return null;
  if (task.phase === "day") return eventKey;
  if (task.phase === "after") return addDays(eventKey, 1);
  return null;
}

export function groupTasks(
  tasks: ChecklistTask[],
  todayKey: string,
  eventKey: string | null
): Grouped {
  const buckets: Record<BucketKey, ChecklistTask[]> = {
    overdue: [],
    week: [],
    month: [],
    later: [],
    undated: [],
    done: [],
  };
  const earlier: ChecklistTask[] = [];
  const weekEnd = addDays(todayKey, 7);
  const monthEnd = addDays(todayKey, 31);

  for (const t of tasks) {
    if (t.status === "skipped") continue;
    if (t.status === "done") {
      buckets.done.push(t);
      continue;
    }
    if (wasPastWhenAdded(t)) {
      earlier.push(t);
      continue;
    }
    const due = whenDue(t, eventKey);
    if (!due) buckets.undated.push(t);
    else if (due < todayKey) buckets.overdue.push(t);
    else if (due <= weekEnd) buckets.week.push(t);
    else if (due <= monthEnd) buckets.month.push(t);
    else buckets.later.push(t);
  }

  const byDue = (a: ChecklistTask, b: ChecklistTask) => {
    const da = whenDue(a, eventKey) ?? "9999";
    const db = whenDue(b, eventKey) ?? "9999";
    return da < db ? -1 : da > db ? 1 : a.sort - b.sort;
  };
  for (const key of Object.keys(buckets) as BucketKey[]) {
    if (key === "done") {
      // Most recently finished first.
      buckets.done.sort((a, b) =>
        (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
      );
    } else buckets[key].sort(byDue);
  }
  earlier.sort(byDue);
  return { earlier, buckets };
}

/** "Today", "Tomorrow", "In 5 days", "Fri 6 Feb", "3 days late". */
export function dueWords(due: string, todayKey: string): string {
  const days = Math.round(
    (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${todayKey}T00:00:00Z`)) /
      86_400_000
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "1 day late";
  if (days < 0) return `${-days} days late`;
  if (days < 7) return `In ${days} days`;
  return new Date(`${due}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

import { z } from "zod";
import { getLagosDateKey } from "@/lib/format";
import { PHASE_ORDER } from "./types";

/**
 * When a host's task is due:
 * - none: no date;
 * - date: a fixed day that stays put;
 * - before / after: a number of days before (or after) the event, which moves when the event does.
 */
export type TaskDue =
  | { kind: "none" }
  | { kind: "date"; date: string }
  | { kind: "before"; days: number }
  | { kind: "after"; days: number };

const ymd = /^\d{4}-\d{2}-\d{2}$/;

export const taskInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Give the task a name.")
    .max(200, "Keep the name under 200 characters."),
  detail: z
    .string()
    .trim()
    .max(2000, "Keep the notes under 2,000 characters.")
    .optional()
    .transform((v) => (v ? v : null)),
  phase: z.enum(PHASE_ORDER as [string, ...string[]], {
    message: "Choose when in the plan this belongs.",
  }),
  due: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("none") }),
    z.object({
      kind: z.literal("date"),
      date: z.string().regex(ymd, "Choose a date."),
    }),
    z.object({
      kind: z.literal("before"),
      days: z.number().int().min(0).max(730, "Two years before is the most."),
    }),
    z.object({
      kind: z.literal("after"),
      days: z.number().int().min(1).max(365, "A year after is the most."),
    }),
  ]),
});

export type TaskInput = z.input<typeof taskInputSchema>;
export type CleanTaskInput = z.output<typeof taskInputSchema>;

/**
 * The stored due date and offset for a due choice. A relative choice without an event date keeps
 * its offset and gets a date as soon as the event has one.
 */
export function resolveDue(
  due: TaskDue,
  eventDate: string | null
): { due_date: string | null; days_before: number | null } {
  if (due.kind === "none") return { due_date: null, days_before: null };
  if (due.kind === "date") return { due_date: due.date, days_before: null };
  const daysBefore = due.kind === "before" ? due.days : -due.days;
  const eventKey = getLagosDateKey(eventDate);
  if (!eventKey) return { due_date: null, days_before: daysBefore };
  const d = new Date(`${eventKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysBefore);
  return { due_date: d.toISOString().slice(0, 10), days_before: daysBefore };
}

/** The due choice a stored task stands for, to fill the edit form. */
export function dueOf(task: {
  dueDate: string | null;
  daysBefore: number | null;
}): TaskDue {
  if (task.daysBefore !== null) {
    return task.daysBefore >= 0
      ? { kind: "before", days: task.daysBefore }
      : { kind: "after", days: -task.daysBefore };
  }
  if (task.dueDate) return { kind: "date", date: task.dueDate };
  return { kind: "none" };
}

/** "3 weeks before", "2 days after", "on the day". */
export function describeRelative(daysBefore: number): string {
  if (daysBefore === 0) return "On the day";
  const n = Math.abs(daysBefore);
  const unit =
    n % 7 === 0
      ? `${n / 7} ${n / 7 === 1 ? "week" : "weeks"}`
      : `${n} ${n === 1 ? "day" : "days"}`;
  return `${unit} ${daysBefore > 0 ? "before" : "after"}`;
}

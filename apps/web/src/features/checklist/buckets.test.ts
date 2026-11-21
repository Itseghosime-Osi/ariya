import { describe, expect, it } from "vitest";
import { dueWords, groupTasks, whenDue } from "./buckets";
import type { ChecklistTask } from "./types";

const TODAY = "2026-11-21";
const EVENT = "2026-12-20";

const task = (over: Partial<ChecklistTask> = {}): ChecklistTask => ({
  id: over.title ?? "t",
  title: "Task",
  detail: null,
  phase: "book",
  dueDate: null,
  status: "todo",
  ownerId: null,
  source: "template",
  sourceKey: null,
  derivation: null,
  mitigation: null,
  adviceSource: null,
  timeSlot: null,
  sort: 0,
  completedAt: null,
  createdAt: "2026-11-01T10:00:00Z",
  daysBefore: null,
  editedAt: null,
  ...over,
});

describe("groupTasks", () => {
  it("sorts open tasks into overdue, this week, this month, later and no date", () => {
    const { buckets } = groupTasks(
      [
        task({ title: "late", dueDate: "2026-11-15" }),
        task({ title: "today", dueDate: TODAY }),
        task({ title: "in a week", dueDate: "2026-11-28" }),
        task({ title: "in three weeks", dueDate: "2026-12-12" }),
        task({ title: "next year", dueDate: "2027-02-01" }),
        task({ title: "whenever" }),
      ],
      TODAY,
      EVENT
    );
    expect(buckets.overdue.map((t) => t.title)).toEqual(["late"]);
    expect(buckets.week.map((t) => t.title)).toEqual(["today", "in a week"]);
    expect(buckets.month.map((t) => t.title)).toEqual(["in three weeks"]);
    expect(buckets.later.map((t) => t.title)).toEqual(["next year"]);
    expect(buckets.undated.map((t) => t.title)).toEqual(["whenever"]);
  });

  it("keeps done tasks together, newest first, and leaves set-aside ones out", () => {
    const { buckets } = groupTasks(
      [
        task({
          title: "a",
          status: "done",
          completedAt: "2026-11-10T00:00:00Z",
        }),
        task({
          title: "b",
          status: "done",
          completedAt: "2026-11-20T00:00:00Z",
        }),
        task({ title: "c", status: "skipped", dueDate: TODAY }),
      ],
      TODAY,
      EVENT
    );
    expect(buckets.done.map((t) => t.title)).toEqual(["b", "a"]);
    expect(
      Object.values(buckets)
        .flat()
        .map((t) => t.title)
    ).not.toContain("c");
  });

  it("puts rows that were already past due when the list began apart", () => {
    const { earlier, buckets } = groupTasks(
      [
        task({
          title: "fix the date",
          dueDate: "2026-01-25",
          createdAt: "2026-11-20T10:00:00Z",
        }),
      ],
      TODAY,
      EVENT
    );
    expect(earlier.map((t) => t.title)).toEqual(["fix the date"]);
    expect(buckets.overdue).toEqual([]);
  });

  it("treats an undated after-the-event row as due the day after", () => {
    expect(whenDue(task({ phase: "after" }), EVENT)).toBe("2026-12-21");
    expect(whenDue(task({ phase: "after" }), null)).toBeNull();
  });

  it("treats an undated day-of row as due on the day", () => {
    const row = task({ title: "brief the team", phase: "day" });
    expect(whenDue(row, EVENT)).toBe(EVENT);
    const { buckets } = groupTasks([row], TODAY, EVENT);
    expect(buckets.month.map((t) => t.title)).toEqual(["brief the team"]);
  });
});

describe("dueWords", () => {
  it("says when, in plain words", () => {
    expect(dueWords(TODAY, TODAY)).toBe("Today");
    expect(dueWords("2026-11-22", TODAY)).toBe("Tomorrow");
    expect(dueWords("2026-11-25", TODAY)).toBe("In 4 days");
    expect(dueWords("2026-11-20", TODAY)).toBe("1 day late");
    expect(dueWords("2026-11-18", TODAY)).toBe("3 days late");
    expect(dueWords("2027-02-06", TODAY)).toBe("Sat 6 Feb");
  });
});

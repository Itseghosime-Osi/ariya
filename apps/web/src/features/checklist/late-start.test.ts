import { describe, expect, it } from "vitest";
import { splitLateStart, wasPastWhenAdded } from "./late-start";
import type { ChecklistTask } from "./types";

const task = (over: Partial<ChecklistTask> = {}): ChecklistTask => ({
  id: "t",
  title: "Task",
  detail: null,
  phase: "foundations",
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
  createdAt: "2026-11-20T10:00:00Z",
  ...over,
});

describe("late start", () => {
  it("sets aside a row that was already past due when the list was built", () => {
    // The 21 Nov review: "Fix the date and the second date", due 25 January, for an event tomorrow.
    expect(wasPastWhenAdded(task({ dueDate: "2026-01-25" }))).toBe(true);
  });

  it("keeps rows due on or after the day they were added", () => {
    expect(wasPastWhenAdded(task({ dueDate: "2026-11-20" }))).toBe(false);
    expect(wasPastWhenAdded(task({ dueDate: "2026-11-21" }))).toBe(false);
  });

  it("keeps undated, finished and set-aside rows where they are", () => {
    expect(wasPastWhenAdded(task())).toBe(false);
    expect(
      wasPastWhenAdded(task({ dueDate: "2026-01-25", status: "done" }))
    ).toBe(false);
    expect(
      wasPastWhenAdded(task({ dueDate: "2026-01-25", status: "skipped" }))
    ).toBe(false);
    expect(
      wasPastWhenAdded(task({ dueDate: "2026-01-25", createdAt: null }))
    ).toBe(false);
  });

  it("splits a list into what is ahead and what was past when added", () => {
    const { ahead, pastWhenAdded } = splitLateStart([
      task({ id: "a", dueDate: "2026-01-25" }),
      task({ id: "b", dueDate: "2026-11-21" }),
    ]);
    expect(ahead.map((t) => t.id)).toEqual(["b"]);
    expect(pastWhenAdded.map((t) => t.id)).toEqual(["a"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  describeRelative,
  dueOf,
  resolveDue,
  taskInputSchema,
} from "./task-input";

// 12 Dec 2026, 2 PM in Lagos.
const EVENT = "2026-12-12T13:00:00.000Z";

describe("resolveDue", () => {
  it("leaves a task with no date undated", () => {
    expect(resolveDue({ kind: "none" }, EVENT)).toEqual({
      due_date: null,
      days_before: null,
    });
  });

  it("keeps a fixed date as it is", () => {
    expect(resolveDue({ kind: "date", date: "2026-11-30" }, EVENT)).toEqual({
      due_date: "2026-11-30",
      days_before: null,
    });
  });

  it("works out a relative date from the event's day in Lagos", () => {
    expect(resolveDue({ kind: "before", days: 21 }, EVENT)).toEqual({
      due_date: "2026-11-21",
      days_before: 21,
    });
    expect(resolveDue({ kind: "after", days: 3 }, EVENT)).toEqual({
      due_date: "2026-12-15",
      days_before: -3,
    });
    // 23:30 UTC on the 12th is already the 13th in Lagos.
    expect(
      resolveDue({ kind: "before", days: 0 }, "2026-12-12T23:30:00.000Z")
    ).toEqual({ due_date: "2026-12-13", days_before: 0 });
  });

  it("keeps the offset when the event has no date yet", () => {
    expect(resolveDue({ kind: "before", days: 7 }, null)).toEqual({
      due_date: null,
      days_before: 7,
    });
  });
});

describe("dueOf", () => {
  it("reads a stored task back into the form's choice", () => {
    expect(dueOf({ dueDate: "2026-11-21", daysBefore: 21 })).toEqual({
      kind: "before",
      days: 21,
    });
    expect(dueOf({ dueDate: "2026-12-15", daysBefore: -3 })).toEqual({
      kind: "after",
      days: 3,
    });
    expect(dueOf({ dueDate: "2026-11-30", daysBefore: null })).toEqual({
      kind: "date",
      date: "2026-11-30",
    });
    expect(dueOf({ dueDate: null, daysBefore: null })).toEqual({
      kind: "none",
    });
  });
});

describe("describeRelative", () => {
  it("speaks in weeks when it can", () => {
    expect(describeRelative(21)).toBe("3 weeks before");
    expect(describeRelative(7)).toBe("1 week before");
    expect(describeRelative(10)).toBe("10 days before");
    expect(describeRelative(-1)).toBe("1 day after");
    expect(describeRelative(0)).toBe("On the day");
  });
});

describe("taskInputSchema", () => {
  it("accepts a sensible task and tidies the notes", () => {
    const parsed = taskInputSchema.parse({
      title: "  Book the talking drummer ",
      detail: "  ",
      phase: "book",
      due: { kind: "before", days: 42 },
    });
    expect(parsed.title).toBe("Book the talking drummer");
    expect(parsed.detail).toBeNull();
  });

  it("refuses an empty name, an unknown phase and an out-of-range offset", () => {
    expect(
      taskInputSchema.safeParse({
        title: " ",
        phase: "book",
        due: { kind: "none" },
      }).success
    ).toBe(false);
    expect(
      taskInputSchema.safeParse({
        title: "Drummer",
        phase: "someday",
        due: { kind: "none" },
      }).success
    ).toBe(false);
    expect(
      taskInputSchema.safeParse({
        title: "Drummer",
        phase: "book",
        due: { kind: "before", days: 1000 },
      }).success
    ).toBe(false);
  });
});

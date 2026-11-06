import { describe, expect, it } from "vitest";
import {
  daysInMonth,
  formatDisplay,
  formatLocal,
  monthGrid,
  parseLocal,
  shiftMonth,
  to24,
} from "./calendar";

describe("parseLocal / formatLocal", () => {
  it("round-trips a datetime-local value", () => {
    const parts = parseLocal("2026-12-12T14:05");
    expect(parts).toEqual({
      year: 2026,
      month: 12,
      day: 12,
      hour: 14,
      minute: 5,
    });
    expect(formatLocal(parts!, true)).toBe("2026-12-12T14:05");
    expect(formatLocal(parts!, false)).toBe("2026-12-12");
  });
  it("reads a date-only value and refuses impossible dates", () => {
    expect(parseLocal("2026-02-03")).toMatchObject({ hour: 0, minute: 0 });
    expect(parseLocal("2026-02-30")).toBeNull();
    expect(parseLocal("2026-13-01")).toBeNull();
    expect(parseLocal("2026-01-01T25:00")).toBeNull();
    expect(parseLocal("")).toBeNull();
    expect(parseLocal(null)).toBeNull();
  });
});

describe("monthGrid", () => {
  it("is six Monday-first weeks", () => {
    const grid = monthGrid(2026, 12); // 1 Dec 2026 is a Tuesday
    expect(grid).toHaveLength(42);
    expect(grid[0]).toMatchObject({ month: 11, day: 30, inMonth: false });
    expect(grid[1]).toMatchObject({ month: 12, day: 1, inMonth: true });
    expect(grid.filter((c) => c.inMonth)).toHaveLength(31);
  });
  it("handles leap years and year edges", () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe("display and 12-hour clock", () => {
  it("formats the way the rest of the app reads dates", () => {
    expect(formatDisplay(parseLocal("2026-12-12T14:00"), true)).toBe(
      "Sat 12 Dec 2026, 2:00 PM"
    );
    expect(formatDisplay(parseLocal("2026-12-12T00:30"), true)).toBe(
      "Sat 12 Dec 2026, 12:30 AM"
    );
    expect(formatDisplay(parseLocal("2026-12-12"), false)).toBe(
      "Sat 12 Dec 2026"
    );
    expect(formatDisplay(null, true)).toBe("");
  });
  it("converts 12-hour to 24-hour", () => {
    expect(to24(12, false)).toBe(0);
    expect(to24(12, true)).toBe(12);
    expect(to24(2, true)).toBe(14);
    expect(to24(11, false)).toBe(11);
  });
});

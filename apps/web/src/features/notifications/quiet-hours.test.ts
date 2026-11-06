import { describe, expect, it } from "vitest";
import { isQuiet, minutesOf, nextSendableMinute } from "./quiet-hours";

const at = (h: number, m = 0) => h * 60 + m;

describe("minutesOf", () => {
  it("reads a wall-clock time, with or without seconds", () => {
    expect(minutesOf("21:00")).toBe(1260);
    expect(minutesOf("21:00:00")).toBe(1260);
    expect(minutesOf("00:00")).toBe(0);
    expect(minutesOf("23:59")).toBe(1439);
  });

  it("returns null for anything that is not a time", () => {
    expect(minutesOf(null)).toBeNull();
    expect(minutesOf(undefined)).toBeNull();
    expect(minutesOf("")).toBeNull();
    expect(minutesOf("24:00")).toBeNull();
    expect(minutesOf("9am")).toBeNull();
  });
});

describe("isQuiet", () => {
  it("covers the evening side of a window that wraps midnight", () => {
    expect(isQuiet(at(21), "21:00", "07:00")).toBe(true);
    expect(isQuiet(at(23, 30), "21:00", "07:00")).toBe(true);
  });

  it("covers the morning side of the same window", () => {
    expect(isQuiet(at(0, 30), "21:00", "07:00")).toBe(true);
    expect(isQuiet(at(6, 59), "21:00", "07:00")).toBe(true);
  });

  it("does not cover the day between the two ends", () => {
    expect(isQuiet(at(7), "21:00", "07:00")).toBe(false);
    expect(isQuiet(at(12), "21:00", "07:00")).toBe(false);
    expect(isQuiet(at(20, 59), "21:00", "07:00")).toBe(false);
  });

  it("handles a window that does not wrap midnight", () => {
    expect(isQuiet(at(13), "12:00", "14:00")).toBe(true);
    expect(isQuiet(at(11), "12:00", "14:00")).toBe(false);
    expect(isQuiet(at(14), "12:00", "14:00")).toBe(false);
  });

  it("treats a window with equal ends as empty rather than all day", () => {
    expect(isQuiet(at(3), "09:00", "09:00")).toBe(false);
    expect(isQuiet(at(9), "09:00", "09:00")).toBe(false);
  });

  it("never silences anything when the hours are missing", () => {
    expect(isQuiet(at(3), null, "07:00")).toBe(false);
    expect(isQuiet(at(3), "21:00", null)).toBe(false);
    expect(isQuiet(at(3), null, null)).toBe(false);
  });
});

describe("nextSendableMinute", () => {
  it("sends now when the moment is outside quiet hours", () => {
    expect(nextSendableMinute(at(9), "21:00", "07:00")).toBe(at(9));
  });

  it("holds a night-time digest until quiet hours end", () => {
    expect(nextSendableMinute(at(3), "21:00", "07:00")).toBe(at(7));
    expect(nextSendableMinute(at(22), "21:00", "07:00")).toBe(at(7));
  });

  it("sends immediately when there are no quiet hours", () => {
    expect(nextSendableMinute(at(3), null, null)).toBe(at(3));
  });
});

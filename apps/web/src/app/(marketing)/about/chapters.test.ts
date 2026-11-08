import { describe, expect, it } from "vitest";
import { CHAPTERS, countdownLabel, daysAt } from "./chapters";

describe("the About story", () => {
  it("counts down from the first chapter to the day itself", () => {
    const days = CHAPTERS.map((c) => c.day);
    expect(days[0]).toBeGreaterThan(days[1]);
    expect([...days].sort((a, b) => b - a)).toEqual(days);
    expect(days.at(-1)).toBe(0);
  });

  it("has unique ids and numerals", () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
    expect(new Set(CHAPTERS.map((c) => c.n)).size).toBe(CHAPTERS.length);
  });

  it("moves smoothly between chapters and never goes below zero", () => {
    expect(daysAt(0, 0)).toBe(CHAPTERS[0].day);
    expect(daysAt(0, 1)).toBe(CHAPTERS[1].day);
    expect(daysAt(1, 0.5)).toBe(
      Math.round((CHAPTERS[1].day + CHAPTERS[2].day) / 2)
    );
    expect(daysAt(CHAPTERS.length - 1, 0.7)).toBe(0);
    expect(daysAt(0, -3)).toBe(CHAPTERS[0].day);
    expect(daysAt(0, 9)).toBe(CHAPTERS[1].day);
  });

  it("words the countdown", () => {
    expect(countdownLabel(0)).toBe("The day itself");
    expect(countdownLabel(1)).toBe("1 day to go");
    expect(countdownLabel(45)).toBe("45 days to go");
  });
});

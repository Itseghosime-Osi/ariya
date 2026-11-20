import { describe, expect, it } from "vitest";
import { isClockTime, orderRunSheet, slotMinutes } from "./order";

const row = (title: string, timeSlot: string | null) => ({ title, timeSlot });

describe("run sheet order", () => {
  it("reads exact times and worded slots", () => {
    expect(slotMinutes("14:30")).toBe(14 * 60 + 30);
    expect(slotMinutes("Morning, before load-in")).toBe(9 * 60);
    expect(slotMinutes("All day")).toBe(-1);
    expect(slotMinutes("Before the guests arrive")).toBeNull();
    expect(slotMinutes(null)).toBeNull();
    expect(isClockTime("09:00")).toBe(true);
    expect(isClockTime("9am")).toBe(false);
  });

  it("puts a host's exact times in clock order among the template's words", () => {
    const ordered = orderRunSheet([
      row("Keep to the fixed times", "All day"),
      row("Load in the decor", "Morning, before load-in"),
      row("Check the generator", null),
      row("Guests arrive", "14:00"),
      row("Caterer arrives", "10:00"),
      row("Last dance", "Evening"),
    ]);
    expect(ordered.map((r) => r.title)).toEqual([
      "Keep to the fixed times",
      "Load in the decor",
      "Check the generator",
      "Caterer arrives",
      "Guests arrive",
      "Last dance",
    ]);
  });

  it("keeps template order where nothing better is known", () => {
    const rows = [row("a", null), row("b", null), row("c", null)];
    expect(orderRunSheet(rows).map((r) => r.title)).toEqual(["a", "b", "c"]);
  });
});

import { describe, expect, it } from "vitest";
import { clearanceOf, gapText } from "./clearance";
import { footprint, MAIN_AISLE } from "./model";

describe("clearanceOf", () => {
  const hall = { width: 30, length: 20 };

  it("measures to the nearest table and wall, and flags a squeezed aisle", () => {
    const me = footprint("round", 10, 10, 10, 0);
    const near = footprint("round", 10, 11.7, 10, 0); // edges ~0.18 m apart
    const c = clearanceOf(me, [{ name: "Table 02", f: near }], [], hall);
    expect(c.table?.name).toBe("Table 02");
    expect(c.table!.gap).toBeLessThan(MAIN_AISLE);
    expect(c.tooNarrow).toBe(true);
  });

  it("is roomy in the middle of an empty hall", () => {
    const me = footprint("round", 10, 15, 10, 0);
    const c = clearanceOf(me, [], [], hall);
    expect(c.table).toBeNull();
    expect(c.wall).toBeGreaterThan(MAIN_AISLE);
    expect(c.tooNarrow).toBe(false);
  });

  it("writes gaps for people", () => {
    expect(gapText(1.234)).toBe("1.2 m");
    expect(gapText(-0.1)).toBe("touching");
  });
});

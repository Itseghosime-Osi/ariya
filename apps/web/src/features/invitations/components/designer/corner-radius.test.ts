import { describe, it, expect } from "vitest";
import { radiusDragDelta } from "./corner-radius";
describe("corner radius pointer projection", () => {
  it.each([
    ["tl", 20, 20],
    ["tr", -20, 20],
    ["br", -20, -20],
    ["bl", 20, -20],
  ] as const)(
    "moves %s inward at the same rate as the pointer",
    (corner, dx, dy) => {
      expect(radiusDragDelta(dx, dy, 0, corner)).toBeCloseTo(20);
    }
  );
  it("uses the shape axes after a quarter turn", () => {
    expect(radiusDragDelta(-20, 20, 90, "tl")).toBeCloseTo(20);
    expect(radiusDragDelta(20, -20, 90, "tl")).toBeCloseTo(-20);
  });
  it("ignores motion perpendicular to the radius diagonal", () => {
    expect(radiusDragDelta(20, -20, 0, "tl")).toBeCloseTo(0);
  });
});

import { describe, it, expect } from "vitest";
import { resizeInLocalAxes } from "./resize-transform";
const start = { x: 20, y: 30, width: 40, height: 20 };
const card = { width: 1000, height: 1400 };
describe("resizing rotated layers", () => {
  it("keeps the opposite visual edge fixed after a quarter turn", () => {
    const next = resizeInLocalAxes(start, "e", 0, 100, card, 90, false);
    expect(next.width).toBeCloseTo(50);
    expect(next.height).toBe(20);
    expect(next.x).toBeCloseTo(15);
    expect(next.y).toBeCloseTo(30 + (50 / 1400) * 100);
  });
  it("uses local height when dragging a rotated side", () => {
    const next = resizeInLocalAxes(start, "s", -140, 0, card, 90, false);
    expect(next.width).toBe(40);
    expect(next.height).toBeCloseTo(30);
    expect(next.x).toBeCloseTo(13);
    expect(next.y).toBeCloseTo(25);
  });
  it("preserves ordinary unrotated resizing", () => {
    const next = resizeInLocalAxes(start, "se", 100, 140, card, 0, false);
    expect(next).toEqual({ x: 20, y: 30, width: 50, height: 30 });
  });
});

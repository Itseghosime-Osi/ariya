import { describe, expect, it } from "vitest";
import { drawBox } from "./draw-box";
describe("shape drawing", () => {
  for (const x of [-30, 30])
    for (const y of [-20, 20]) {
      it(`draws toward ${x},${y} without negative dimensions`, () => {
        const box = drawBox({ x: 100, y: 100 }, { x: 100 + x, y: 100 + y });
        expect(box).toEqual({
          left: Math.min(100, 100 + x),
          top: Math.min(100, 100 + y),
          width: 30,
          height: 20,
        });
      });
      it(`constrains from the centre toward ${x},${y}`, () => {
        expect(
          drawBox({ x: 100, y: 100 }, { x: 100 + x, y: 100 + y }, true, true)
        ).toEqual({ left: 70, top: 70, width: 60, height: 60 });
      });
    }
  it("preserves the starting corner when constraining", () =>
    expect(drawBox({ x: 100, y: 100 }, { x: 130, y: 120 }, true)).toEqual({
      left: 100,
      top: 100,
      width: 30,
      height: 30,
    }));
  it("allows a zero-size preview before movement", () =>
    expect(drawBox({ x: 100, y: 100 }, { x: 100, y: 100 })).toEqual({
      left: 100,
      top: 100,
      width: 0,
      height: 0,
    }));
});

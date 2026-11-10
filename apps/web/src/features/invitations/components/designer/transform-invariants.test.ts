import { describe, expect, it } from "vitest";
import { resizeInLocalAxes, cursorForHandle } from "./resize-transform";
import type { Box, Handle } from "../../layer-ops";
const handles: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const opposites: Record<Handle, [number, number]> = {
  nw: [1, 1],
  n: [0.5, 1],
  ne: [0, 1],
  e: [0, 0.5],
  se: [0, 0],
  s: [0.5, 0],
  sw: [1, 0],
  w: [1, 0.5],
};
const card = { width: 1080, height: 1512 };
const start = { x: 20, y: 30, width: 40, height: 20 };
function point(box: Box, u: number, v: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  const dx = (((u - 0.5) * box.width) / 100) * card.width;
  const dy = (((v - 0.5) * box.height) / 100) * card.height;
  return [
    ((box.x + box.width / 2) / 100) * card.width +
      dx * Math.cos(rad) -
      dy * Math.sin(rad),
    ((box.y + box.height / 2) / 100) * card.height +
      dx * Math.sin(rad) +
      dy * Math.cos(rad),
  ];
}
describe("transform geometry invariants", () => {
  for (const angle of [0, 30, 90, 135, 270])
    for (const handle of handles)
      for (const locked of [false, true]) {
        it(`${handle} at ${angle}° ${locked ? "locked" : "free"} keeps its opposite visual anchor`, () => {
          const result = resizeInLocalAxes(
            start,
            handle,
            31,
            -17,
            card,
            angle,
            locked
          );
          const [u, v] = opposites[handle];
          const before = point(start, u, v, angle),
            after = point(result, u, v, angle);
          expect(after[0]).toBeCloseTo(before[0], 7);
          expect(after[1]).toBeCloseTo(before[1], 7);
          expect(result.width).toBeGreaterThan(0);
          expect(result.height).toBeGreaterThan(0);
          if (locked)
            expect(result.width / result.height).toBeCloseTo(
              start.width / start.height,
              8
            );
        });
        it(`${handle} at ${angle}° supports centre resize`, () => {
          const result = resizeInLocalAxes(
            start,
            handle,
            31,
            -17,
            card,
            angle,
            locked,
            true
          );
          expect(point(result, 0.5, 0.5, angle)).toEqual(
            point(start, 0.5, 0.5, angle)
          );
        });
      }
  it.each(handles)("%s clamps when crossing its opposite edge", (handle) => {
    const result = resizeInLocalAxes(
      start,
      handle,
      50000,
      -50000,
      card,
      0,
      false
    );
    expect(result.width).toBeGreaterThanOrEqual(5);
    expect(result.height).toBeGreaterThanOrEqual(1);
    expect(result.width).toBeLessThanOrEqual(1000);
    expect(result.height).toBeLessThanOrEqual(1000);
  });
  it.each(handles)(
    "%s cursor follows a quarter turn and normalizes full rotations",
    (handle) => {
      expect(cursorForHandle(handle, 0)).toBe(cursorForHandle(handle, 360));
      expect(cursorForHandle(handle, 0)).not.toBe(cursorForHandle(handle, 90));
    }
  );
});

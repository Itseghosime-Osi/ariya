import { describe, it, expect } from "vitest";
import {
  createInvitationDesign,
  createLayerOfKind,
  THEME_PALETTES,
} from "./design";
import { constrainEntrySeals } from "./pass-layout";
import type { InvitationDesign } from "./types";
function fixture(ratio: number): InvitationDesign {
  return {
    ...createInvitationDesign({ couple: "Ada & Kunle" }),
    canvas: { ratio, widthPx: 1080, heightPx: Math.round(1080 / ratio) },
    layers: [createLayerOfKind("code", 0)],
  };
}
describe("entry seal paper boundaries", () => {
  it.each([0.4, 5 / 7, 1, 1.4, 2.5])(
    "keeps every rotated corner inside paper at ratio %s",
    (ratio) => {
      for (const rotation of [0, 15, 45, 90, 135, 270])
        for (const width of [1, 16, 50, 1000])
          for (const [x, y] of [
            [-500, -500],
            [67, 83.5],
            [500, 500],
            [0, 0],
          ])
            for (const rounded of [false, true]) {
              const d = fixture(ratio);
              if (rounded)
                d.canvas = {
                  ...d.canvas!,
                  edgeStyle: "rounded",
                  cornerRadiusPx: 500,
                };
              Object.assign(d.layers[0], { x, y, width, rotation });
              const next = constrainEntrySeals(d),
                seal = next.layers[0];
              expect(seal.width).toBeGreaterThanOrEqual(16);
              expect(constrainEntrySeals(next)).toBe(next);
              const w = 1080,
                h = w / ratio,
                angle = (rotation * Math.PI) / 180;
              const centre = {
                x: ((seal.x + seal.width / 2) * w) / 100,
                y: ((seal.y + (seal.width * ratio) / 2) * h) / 100,
              };
              for (const sx of [-1, 1])
                for (const sy of [-1, 1]) {
                  const side = (seal.width * w) / 200;
                  const point = {
                    x:
                      centre.x +
                      sx * side * Math.cos(angle) -
                      sy * side * Math.sin(angle),
                    y:
                      centre.y +
                      sx * side * Math.sin(angle) +
                      sy * side * Math.cos(angle),
                  };
                  expect(point.x).toBeGreaterThanOrEqual(-1e-5);
                  expect(point.x).toBeLessThanOrEqual(w + 1e-5);
                  expect(point.y).toBeGreaterThanOrEqual(-1e-5);
                  expect(point.y).toBeLessThanOrEqual(h + 1e-5);
                  if (rounded) {
                    const r = Math.min(500, w / 2, h / 2);
                    const dx = Math.max(0, r - point.x, point.x - (w - r)),
                      dy = Math.max(0, r - point.y, point.y - (h - r));
                    expect(dx * dx + dy * dy).toBeLessThanOrEqual(r * r + 1e-3);
                  }
                }
            }
    }
  );
  it("preserves valid house layouts and all decorative bleed", () => {
    const d = fixture(5 / 7);
    expect(constrainEntrySeals(d)).toBe(d);
    d.layers.push({
      ...createLayerOfKind("text", 1),
      x: -400,
      y: 400,
      width: 500,
    });
    const next = constrainEntrySeals(d);
    expect(next).toBe(d);
    expect(next.layers[1]).toBe(d.layers[1]);
    for (const palette of Object.values(THEME_PALETTES)) {
      const themed = { ...d, palette };
      expect(constrainEntrySeals(themed)).toBe(themed);
    }
  });
});

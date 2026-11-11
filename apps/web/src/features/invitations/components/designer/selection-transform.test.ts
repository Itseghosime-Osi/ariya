import { describe, expect, it } from "vitest";
import { createInvitationDesign } from "../../design";
import { transformSelection } from "./selection-transform";
const first = () => ({
  ...createInvitationDesign({ couple: "Ada & Kunle" }).layers[1],
  id: "first",
  x: 10,
  y: 10,
  width: 20,
  height: 10,
  size: 3,
  radius: 2,
  strokeWidth: 0.4,
});
const second = () => ({ ...first(), id: "second", x: 40, y: 30 });
const bounds = { x: 10, y: 10, width: 50, height: 30 };
const origins = {
  first: { x: 10, y: 10, width: 20, height: 10 },
  second: { x: 40, y: 30, width: 20, height: 10 },
};
describe("selection transforms", () => {
  it("scales child positions, dimensions, type and styling together", () => {
    const result = transformSelection([first(), second()], origins, bounds, {
      x: 10,
      y: 10,
      width: 100,
      height: 60,
    });
    expect(result.first).toMatchObject({
      x: 10,
      y: 10,
      width: 40,
      height: 20,
      size: 6,
      radius: 4,
      strokeWidth: 0.8,
    });
    expect(result.second).toMatchObject({
      x: 70,
      y: 50,
      width: 40,
      height: 20,
    });
  });
  it("retains the opposite anchor when resizing from the top-left", () => {
    const result = transformSelection([first(), second()], origins, bounds, {
      x: -40,
      y: -20,
      width: 100,
      height: 60,
    });
    expect(result.first).toMatchObject({
      x: -40,
      y: -20,
      width: 40,
      height: 20,
    });
    expect(result.second).toMatchObject({ x: 20, y: 20 });
  });
  it("never edits locked members", () => {
    const result = transformSelection(
      [first(), { ...second(), locked: true }],
      origins,
      bounds,
      { x: 10, y: 10, width: 100, height: 60 }
    );
    expect(result.second).toBeUndefined();
  });
  it("constrains the entire selection before a style exceeds its validator limit", () => {
    const result = transformSelection(
      [{ ...first(), radius: 1500 }, second()],
      origins,
      bounds,
      { x: 10, y: 10, width: 100, height: 60 }
    );
    expect(result.first.radius).toBeCloseTo(2000);
    expect(result.second.width).toBeCloseTo((20 * 4) / 3);
  });
  it("keeps protected entry seals large enough to scan", () => {
    const layer = { ...first(), kind: "code" as const, width: 20 };
    const result = transformSelection([layer], origins, bounds, {
      x: 10,
      y: 10,
      width: 5,
      height: 3,
    });
    expect(result.first.width).toBeGreaterThanOrEqual(16);
  });
});

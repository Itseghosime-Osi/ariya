import { describe, expect, it } from "vitest";

import { defaultLayout, type HallLayout } from "./model";
import {
  DEFAULT_UNIT_HP,
  dancingFor,
  defaultCooling,
  thermalRequest,
  unitId,
  unitsOf,
} from "./thermal";

function layout(overrides: Partial<HallLayout> = {}): HallLayout {
  return { ...defaultLayout(30, 20), ...overrides };
}

describe("dancingFor", () => {
  it("counts the dance floor at about 1.3 people a square metre", () => {
    const l = layout({
      zones: [
        {
          id: "dance",
          kind: "dance",
          label: "Dance floor",
          x: 10,
          y: 6,
          w: 8,
          h: 8,
          shape: "rect",
          rot: 0,
        },
      ],
    });
    // 64 m² × 1.3 = 83.2, rounded.
    expect(dancingFor(l, 300)).toBe(83);
  });

  it("never puts more dancers on the floor than there are guests", () => {
    const l = layout({
      zones: [
        {
          id: "dance",
          kind: "dance",
          label: "Dance floor",
          x: 0,
          y: 0,
          w: 20,
          h: 20,
          shape: "rect",
          rot: 0,
        },
      ],
    });
    expect(dancingFor(l, 40)).toBe(40);
  });

  it("is zero when no dance floor is drawn", () => {
    expect(dancingFor(layout({ zones: [] }), 300)).toBe(0);
  });
});

describe("thermalRequest", () => {
  it("carries the room, the crowd and the cooling the host has planned", () => {
    const l = layout({
      venue: {
        ...defaultLayout().venue,
        cooling: {
          units: [
            {
              id: "ac-1",
              x: 4,
              y: 5,
              hp: 2.5,
              mount: "wall",
              inverter: true,
            },
          ],
          ach: 4,
          targetC: 23,
        },
      },
    });
    const req = thermalRequest(l, 300);
    expect(req.width).toBe(30);
    expect(req.length).toBe(20);
    expect(req.height).toBe(l.ceiling);
    expect(req.venue).toBe(l.venue.type);
    expect(req.headcount).toBe(300);
    expect(req.ach).toBe(4);
    expect(req.targetC).toBe(23);
    expect(req.units).toHaveLength(1);
    expect(req.units[0].inverter).toBe(true);
    expect(req.zones).toHaveLength(l.zones.length);
  });

  it("asks a sensible question when the plan has no cooling yet", () => {
    const req = thermalRequest(layout(), 120);
    expect(req.ach).toBeNull();
    expect(req.targetC).toBeNull();
    expect(req.units).toEqual([]);
  });
});

describe("cooling helpers", () => {
  it("starts with nothing answered", () => {
    expect(defaultCooling()).toEqual({ units: [], ach: null, targetC: null });
  });

  it("reads the units off the venue profile", () => {
    expect(unitsOf(layout())).toEqual([]);
  });

  it("gives every unit a distinct id", () => {
    const ids = new Set(Array.from({ length: 20 }, () => unitId()));
    expect(ids.size).toBe(20);
  });

  it("starts a new unit at the size a hall needs", () => {
    expect(DEFAULT_UNIT_HP).toBe(2.5);
  });
});

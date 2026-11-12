import { describe, expect, it } from "vitest";
import {
  AUTO_PILLAR_PREFIX,
  defaultLayout,
  defaultZones,
  withVenueType,
  type HallLayout,
} from "./model";

const hall = (): HallLayout => ({
  ...defaultLayout(30, 20),
  zones: defaultZones(30, 20),
});
const pillars = (l: HallLayout) => l.zones.filter((z) => z.kind === "pillar");

describe("withVenueType", () => {
  it("gives a pillared hall two rows of columns clear of the other areas", () => {
    const l = withVenueType(hall(), "pillared-hall");
    const p = pillars(l);
    expect(p.length).toBeGreaterThanOrEqual(4);
    expect(new Set(p.map((z) => z.x))).toEqual(new Set([7.5, 22.5]));
    for (const c of p) {
      expect(c.id.startsWith(AUTO_PILLAR_PREFIX)).toBe(true);
      for (const z of l.zones.filter((z) => z.kind !== "pillar")) {
        const apart =
          Math.abs(z.x - c.x) > (z.w + c.w) / 2 ||
          Math.abs(z.y - c.y) > (z.h + c.h) / 2;
        expect(apart).toBe(true);
      }
    }
    expect(l.venue.type).toBe("pillared-hall");
    expect(l.venue.environment).toBe("indoor");
  });

  it("puts a pole tent's centre poles down the middle of the long side", () => {
    const l = withVenueType(hall(), "pole-tent");
    const p = pillars(l);
    expect(p.length).toBe(2);
    for (const c of p) {
      expect(c.y).toBe(10);
      expect(c.label).toBe("Tent pole");
    }
    expect(l.venue.environment).toBe("covered");
  });

  it("takes away its own columns on another venue, and keeps the host's", () => {
    const withCols = withVenueType(hall(), "pillared-hall");
    const host = {
      id: "host-pillar",
      kind: "pillar" as const,
      label: "Pillar",
      x: 3,
      y: 15,
      w: 0.6,
      h: 0.6,
    };
    const plain = withVenueType(
      { ...withCols, zones: [...withCols.zones, host] },
      "hall"
    );
    expect(pillars(plain).map((z) => z.id)).toEqual(["host-pillar"]);
  });

  it("does not add columns when the host already placed pillars", () => {
    const host = {
      id: "host-pillar",
      kind: "pillar" as const,
      label: "Pillar",
      x: 3,
      y: 15,
      w: 0.6,
      h: 0.6,
    };
    const l = withVenueType({ ...hall(), zones: [host] }, "pillared-hall");
    expect(pillars(l)).toHaveLength(1);
  });

  it("keeps the columns when the venue does not change", () => {
    const once = withVenueType(hall(), "pillared-hall");
    const moved = {
      ...once,
      zones: once.zones.map((z) =>
        z.kind === "pillar" ? { ...z, x: z.x + 1 } : z
      ),
    };
    expect(withVenueType(moved, "pillared-hall").zones).toEqual(moved.zones);
  });
});

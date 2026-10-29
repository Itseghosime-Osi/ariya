import { describe, expect, it } from "vitest";
import {
  chairPositions,
  footprint,
  gapBetween,
  normaliseLayout,
  tableTop,
  type Zone,
} from "./model";
import { canPlace, findFreeSpot, fitTables } from "./fit";
import { planSeating } from "./autoseat";

describe("table geometry", () => {
  it("uses real table sizes", () => {
    expect(tableTop("round", 10).w).toBeCloseTo(1.52);
    expect(tableTop("round", 12).w).toBeCloseTo(1.83);
    expect(tableTop("rectangular", 8).w).toBeCloseTo(2.4);
    expect(chairPositions("round", 10)).toHaveLength(10);
    expect(chairPositions("head", 6).every((c) => c.y < 0)).toBe(true);
  });

  it("measures gaps and overlaps", () => {
    const a = footprint("round", 10, 0, 0);
    const b = footprint("round", 10, 3.5, 0);
    expect(gapBetween(a, b)).toBeCloseTo(3.5 - 2 * (0.76 + 0.5), 1);
    const c = footprint("rectangular", 8, 0.5, 0, 90);
    expect(gapBetween(a, c)).toBeLessThan(0);
  });
});

describe("fitTables", () => {
  const zones: Zone[] = [
    { id: "s", kind: "stage", label: "Stage", x: 15, y: 2.2, w: 9, h: 3.6 },
    { id: "d", kind: "dance", label: "Dance", x: 15, y: 9, w: 8, h: 6 },
  ];

  it("packs a 30 x 20 m hall around its zones, and every table is legal", () => {
    const t0 = performance.now();
    const res = fitTables({
      width: 30,
      length: 20,
      zones,
      shape: "round",
      capacity: 10,
      gap: 0.6,
    });
    const ms = performance.now() - t0;
    expect(res.count).toBeGreaterThan(20);
    expect(res.count).toBeLessThan(70);
    expect(ms).toBeLessThan(500);
    for (const p of res.placements) {
      const f = footprint("round", 10, p.x, p.y);
      expect(
        canPlace(f, {
          width: 30,
          length: 20,
          zones,
          shape: "round",
          capacity: 10,
          gap: 0.6,
        })
      ).toBe(true);
    }
    // No two tables closer than the requested gap.
    for (let i = 0; i < res.placements.length; i++)
      for (let j = i + 1; j < res.placements.length; j++) {
        const a = res.placements[i],
          b = res.placements[j];
        expect(
          gapBetween(
            footprint("round", 10, a.x, a.y),
            footprint("round", 10, b.x, b.y)
          )
        ).toBeGreaterThanOrEqual(0.6 - 0.02);
      }
  });

  it("an aisle and more space mean fewer tables", () => {
    const base = fitTables({
      width: 30,
      length: 20,
      zones: [],
      shape: "round",
      capacity: 10,
      gap: 0.6,
    }).count;
    const aisle = fitTables({
      width: 30,
      length: 20,
      zones: [],
      shape: "round",
      capacity: 10,
      gap: 0.6,
      aisle: true,
    }).count;
    const roomy = fitTables({
      width: 30,
      length: 20,
      zones: [],
      shape: "round",
      capacity: 10,
      gap: 0.9,
    }).count;
    expect(aisle).toBeLessThanOrEqual(base);
    expect(roomy).toBeLessThanOrEqual(base);
  });

  it("finds a free spot clear of existing tables", () => {
    const existing = footprint("round", 10, 15, 10);
    const spot = findFreeSpot(
      {
        width: 30,
        length: 20,
        zones: [],
        obstacles: [existing],
        shape: "round",
        capacity: 10,
        gap: 0.6,
      },
      { x: 15, y: 10 }
    );
    expect(spot).not.toBeNull();
    expect(
      gapBetween(existing, footprint("round", 10, spot!.x, spot!.y))
    ).toBeGreaterThanOrEqual(0.58);
  });
});

describe("planSeating", () => {
  const tables = [
    {
      id: "h",
      name: "High table",
      capacity: 6,
      occupied: 0,
      shape: "head",
      x: 15,
      y: 5,
    },
    {
      id: "a",
      name: "Table 1",
      capacity: 10,
      occupied: 0,
      shape: "round",
      x: 10,
      y: 8,
    },
    {
      id: "b",
      name: "Table 2",
      capacity: 10,
      occupied: 6,
      shape: "round",
      x: 20,
      y: 14,
    },
  ];

  it("keeps families together, VIPs up front, and respects capacity", () => {
    const plan = planSeating(
      [
        {
          id: "v1",
          name: "Couple's parents",
          seats: 2,
          group: "Family",
          vip: true,
        },
        { id: "g1", name: "Ada", seats: 2, group: "Okafor family", vip: false },
        { id: "g2", name: "Obi", seats: 3, group: "Okafor family", vip: false },
        { id: "g3", name: "Tunde", seats: 4, group: "Friends", vip: false },
        { id: "g4", name: "Big party", seats: 12, group: "Choir", vip: false },
      ],
      tables,
      { x: 15, y: 2 }
    );
    const at = (id: string) =>
      plan.assignments.find((a) => a.guestId === id)?.tableId;
    expect(at("v1")).toBe("h");
    expect(at("g1")).toBe(at("g2"));
    expect(plan.unplaced.map((u) => u.id)).toEqual(["g4"]);
    const load: Record<string, number> = { h: 0, a: 0, b: 6 };
    const seats: Record<string, number> = { v1: 2, g1: 2, g2: 3, g3: 4 };
    for (const a of plan.assignments) load[a.tableId] += seats[a.guestId];
    expect(load.h).toBeLessThanOrEqual(6);
    expect(load.a).toBeLessThanOrEqual(10);
    expect(load.b).toBeLessThanOrEqual(10);
  });
});

describe("normaliseLayout", () => {
  it("fills in defaults and rejects junk", () => {
    expect(normaliseLayout(null)).toBeNull();
    expect(normaliseLayout([])).toBeNull();
    const l = normaliseLayout({ width: 500, length: 2 });
    expect(l?.width).toBe(120);
    expect(l?.length).toBe(6);
    expect(l?.zones.length).toBeGreaterThan(0);
  });
});

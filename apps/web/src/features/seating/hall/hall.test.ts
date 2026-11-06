import { describe, expect, it } from "vitest";
import {
  areaPerDiner,
  chairAfterDrop,
  chairPlacement,
  nextStageSpot,
  stageItemPlacement,
  STAGE_ACROSS_LIMIT,
  type StageItem,
  type StageItemKind,
  chairPositions,
  footprint,
  defaultLayout,
  gapBetween,
  gapToWalls,
  normaliseLayout,
  normaliseVenue,
  tableTop,
  styleOf,
  type Zone,
} from "./model";
import { canPlace, findFreeSpot, fitTables } from "./fit";
import { planSeating } from "./autoseat";
import { autoArrange } from "./arrange";

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

describe("normaliseLayout for the 3D studio", () => {
  it("upgrades a first-version layout", () => {
    const old = {
      version: 1,
      width: 30,
      length: 20,
      spacing: "snug",
      zones: [{ id: "z1", kind: "stage", label: "", x: 15, y: 2, w: 9, h: 4 }],
      decor: { linen: "#6e1426", sash: "#e9c98a", chair: "clear" },
      rotations: {},
    };
    const l = normaliseLayout(old);
    expect(l?.decor.chair).toBe("ghost");
    expect(l?.decor.cover).toBeTruthy();
    expect(l?.tableStyles).toEqual({});
    expect(l?.chairs).toEqual([]);
    expect(l?.mood).toBe("day");
    expect(l?.ceiling).toBe(5);
    expect(l?.zones[0].label).toBe("Stage & band");
  });

  it("lets a table's own style win over the hall décor", () => {
    const l = normaliseLayout({
      width: 20,
      length: 15,
      tableStyles: { t1: { cloth: "#000000", chair: "gold" } },
    })!;
    expect(styleOf(l, "t1").cloth).toBe("#000000");
    expect(styleOf(l, "t1").chair).toBe("chiavari-gold");
    expect(styleOf(l, "t2").cloth).toBe(l.decor.linen);
  });
});

describe("venue profile", () => {
  it("gives a first-version layout a plain hall", () => {
    const l = normaliseLayout({ version: 1, width: 30, length: 20 })!;
    expect(l.version).toBe(2);
    expect(l.venue.type).toBe("hall");
    expect(l.venue.environment).toBe("indoor");
    expect(l.venue.structure).toBeNull();
  });

  it("keeps a venue it already knows", () => {
    const l = normaliseLayout({
      width: 30,
      length: 20,
      venue: { type: "marquee", environment: "covered" },
    })!;
    expect(l.venue.type).toBe("marquee");
    expect(l.venue.environment).toBe("covered");
  });

  it("falls back to a hall for an unknown type", () => {
    expect(normaliseVenue({ type: "spaceship" }).type).toBe("hall");
    expect(normaliseVenue(null).type).toBe("hall");
  });

  it("gives each venue its own floor area per guest", () => {
    expect(areaPerDiner({ type: "church" })).toBeCloseTo(0.65);
    expect(areaPerDiner({ type: "field" })).toBeCloseTo(1.5);
    expect(areaPerDiner({ type: "hall" })).toBeCloseTo(1.4);
    expect(areaPerDiner(undefined)).toBeCloseTo(1.4);
  });
});

describe("autoArrange", () => {
  const tables = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `t${i}`,
      shape: "round",
      capacity: 10,
      occupied: i % 3,
    }));

  it("places every table without overlaps in a medium hall", () => {
    const layout = defaultLayout(30, 20);
    const all = [
      { id: "h", shape: "head", capacity: 8, occupied: 8 },
      ...tables(14),
    ];
    const r = autoArrange(layout, all, 0.6);
    expect(r.unplaced).toEqual([]);
    const fps = all.map((t) => {
      const p = r.positions[t.id];
      return footprint(t.shape, t.capacity, p.x, p.y, p.rot);
    });
    for (let i = 0; i < fps.length; i++)
      for (let j = i + 1; j < fps.length; j++)
        expect(gapBetween(fps[i], fps[j])).toBeGreaterThan(0.5);
    for (const f of fps) expect(gapToWalls(f, 30, 20)).toBeGreaterThan(0);
  });

  it("puts the stage at the front and the entrance at the back", () => {
    const r = autoArrange(defaultLayout(30, 20), [], 0.6);
    const stage = r.zones.find((z) => z.kind === "stage")!;
    const entrance = r.zones.find((z) => z.kind === "entrance")!;
    expect(stage.y).toBeLessThan(4);
    expect(entrance.y).toBeGreaterThan(18);
  });

  it("reports tables that do not fit", () => {
    const r = autoArrange(defaultLayout(12, 10), tables(40), 0.6);
    expect(r.unplaced.length).toBeGreaterThan(0);
  });
});

describe("chairPlacement", () => {
  const stage: Zone = {
    id: "st",
    kind: "stage",
    label: "Stage",
    x: 15,
    y: 2,
    w: 8,
    h: 4,
    rot: 0,
    height: 0.9,
  };

  it("leaves a chair on the floor exactly where it is stored", () => {
    const at = chairPlacement({ id: "c", x: 3, y: 4, rot: 45 }, [stage]);
    expect(at).toEqual({ x: 3, y: 4, yaw: 45, lift: 0 });
  });

  it("places a staged chair from the stage's own centre and lifts it to the deck", () => {
    // The middle of the stage, stored as metres from its top-left.
    const at = chairPlacement({ id: "c", x: 4, y: 2, rot: 0, stageId: "st" }, [
      stage,
    ]);
    expect(at.x).toBeCloseTo(15);
    expect(at.y).toBeCloseTo(2);
    expect(at.lift).toBe(0.9);
  });

  it("carries a staged chair with the stage when it rotates", () => {
    // A quarter turn puts a chair stored to the right of centre at the bottom instead.
    const turned = { ...stage, rot: 90 };
    const at = chairPlacement({ id: "c", x: 6, y: 2, rot: 0, stageId: "st" }, [
      turned,
    ]);
    expect(at.x).toBeCloseTo(15);
    expect(at.y).toBeCloseTo(4);
    // The chair turns with the room, so it still faces the audience.
    expect(at.yaw).toBe(90);
  });

  it("falls back to the stored position when the stage is gone", () => {
    const at = chairPlacement(
      { id: "c", x: 4, y: 2, rot: 0, stageId: "missing" },
      [stage]
    );
    expect(at).toEqual({ x: 4, y: 2, yaw: 0, lift: 0 });
  });
});

describe("stage fixtures", () => {
  const stage: Zone = {
    id: "st",
    kind: "stage",
    label: "Stage",
    x: 15,
    y: 2.4,
    w: 9,
    h: 4,
    rot: 0,
    height: 0.8,
  };
  const KINDS: StageItemKind[] = [
    "couch",
    "table",
    "cake",
    "screen",
    "podium",
    "lectern",
    "arch",
  ];

  /** Add `kinds` one after another the way the studio does. */
  function fill(kinds: StageItemKind[]): StageItem[] {
    const items: StageItem[] = [];
    kinds.forEach((kind, i) => {
      items.push({
        id: `i${i}`,
        stageId: "st",
        kind,
        ...nextStageSpot(kind, items),
      });
    });
    return items;
  }

  it("never puts two fixtures on the same spot", () => {
    // The bug this guards: a couch, a table and a cake table all landing at across 0, depth 0.6.
    const items = fill(["couch", "table", "cake", "screen"]);
    const spots = items.map((i) => `${i.across}/${i.depth}`);
    expect(new Set(spots).size).toBe(items.length);
    const at = items.map((i) => stageItemPlacement(i, stage));
    for (let a = 0; a < at.length; a++)
      for (let b = a + 1; b < at.length; b++)
        expect(
          Math.hypot(at[a].x - at[b].x, at[a].y - at[b].y)
        ).toBeGreaterThanOrEqual(0.99);
  });

  it("keeps every spot inside the stage's width and depth", () => {
    for (const i of fill([...KINDS, ...KINDS])) {
      expect(Math.abs(i.across)).toBeLessThanOrEqual(STAGE_ACROSS_LIMIT);
      expect(i.depth).toBeGreaterThan(0);
      expect(i.depth).toBeLessThan(1);
      const at = stageItemPlacement(i, stage);
      expect(at.x).toBeGreaterThanOrEqual(stage.x - stage.w / 2);
      expect(at.x).toBeLessThanOrEqual(stage.x + stage.w / 2);
      expect(at.y).toBeGreaterThanOrEqual(stage.y - stage.h / 2);
      expect(at.y).toBeLessThanOrEqual(stage.y + stage.h / 2);
    }
  });

  it("keeps a fifth item on the row, and sends a sixth to the next one, inside the stage", () => {
    // Five places fit along the front row without touching.
    const five = fill(Array(5).fill("couch"));
    expect(new Set(five.map((i) => i.depth)).size).toBe(1);
    const across = five.map((i) => i.across).sort((a, b) => a - b);
    for (let k = 1; k < across.length; k++)
      expect(across[k] - across[k - 1]).toBeGreaterThanOrEqual(0.14);
    for (const i of five)
      expect(Math.abs(i.across)).toBeLessThanOrEqual(STAGE_ACROSS_LIMIT);
    // The row is full: the next one moves to another row rather than onto a neighbour.
    const sixth = nextStageSpot("couch", five);
    expect(sixth.depth).not.toBe(five[0].depth);
    expect(Math.abs(sixth.across)).toBeLessThanOrEqual(STAGE_ACROSS_LIMIT);
  });

  it("puts a podium left, a lectern right and a backdrop at the back", () => {
    expect(nextStageSpot("podium", []).across).toBeLessThan(0);
    expect(nextStageSpot("lectern", []).across).toBeGreaterThan(0);
    expect(nextStageSpot("arch", []).depth).toBeGreaterThan(
      nextStageSpot("couch", []).depth
    );
  });

  it("stands an item on the deck at the stage's own height", () => {
    const at = stageItemPlacement({ across: 0, depth: 0.5 }, stage);
    expect(at.x).toBeCloseTo(15);
    expect(at.y).toBeCloseTo(2.4);
    expect(at.lift).toBe(0.8);
  });

  it("carries an item with the stage when it turns", () => {
    // Right of centre, on the middle line. A quarter turn puts it below the centre instead,
    // the same place a staged chair at the same offset lands.
    const turned = { ...stage, rot: 90 };
    const item = { across: 0.25, depth: 0.5 };
    const at = stageItemPlacement(item, turned);
    expect(at.x).toBeCloseTo(15);
    expect(at.y).toBeCloseTo(2.4 + 0.25 * 9);
    expect(at.yaw).toBe(90);
    const chair = chairPlacement(
      { id: "c", x: 4.5 + 0.25 * 9, y: 2, rot: 0, stageId: "st" },
      [turned]
    );
    expect(at.x).toBeCloseTo(chair.x);
    expect(at.y).toBeCloseTo(chair.y);
  });
});

describe("chairAfterDrop", () => {
  const stage: Zone = {
    id: "st",
    kind: "stage",
    label: "Stage",
    x: 15,
    y: 2,
    w: 8,
    h: 4,
    rot: 0,
    height: 0.8,
  };
  const chair = { id: "c", x: 3, y: 9, rot: 0 };

  it("attaches a chair dropped on a stage, stored from the stage's top-left", () => {
    const on = chairAfterDrop(chair, { x: 16, y: 2.5 }, [stage]);
    expect(on.stageId).toBe("st");
    expect(on.x).toBeCloseTo(5);
    expect(on.y).toBeCloseTo(2.5);
    // And it round-trips: the placement reader puts it back where it was dropped.
    const at = chairPlacement(on, [stage]);
    expect(at.x).toBeCloseTo(16);
    expect(at.y).toBeCloseTo(2.5);
    expect(at.lift).toBe(0.8);
  });

  it("clears the stage when the chair is dropped back on the floor", () => {
    const on = chairAfterDrop(chair, { x: 16, y: 2.5 }, [stage]);
    const off = chairAfterDrop(on, { x: 10, y: 12 }, [stage]);
    expect("stageId" in off).toBe(false);
    expect(off.x).toBe(10);
    expect(off.y).toBe(12);
    expect(chairPlacement(off, [stage]).lift).toBe(0);
  });

  it("keeps the way it faces in the room across a stage that is turned", () => {
    const turned = { ...stage, rot: 90 };
    const on = chairAfterDrop({ ...chair, rot: 30 }, { x: 15, y: 3 }, [turned]);
    expect(on.stageId).toBe("st");
    expect(chairPlacement(on, [turned]).yaw).toBeCloseTo(30);
    const at = chairPlacement(on, [turned]);
    expect(at.x).toBeCloseTo(15);
    expect(at.y).toBeCloseTo(3);
  });

  it("ignores a drop beside the stage and any area that is not a stage", () => {
    const beside = chairAfterDrop(chair, { x: 20, y: 2 }, [stage]);
    expect(beside.stageId).toBeUndefined();
    const dance: Zone = { ...stage, id: "d", kind: "dance" };
    expect(chairAfterDrop(chair, { x: 15, y: 2 }, [dance]).stageId).toBe(
      undefined
    );
  });
});

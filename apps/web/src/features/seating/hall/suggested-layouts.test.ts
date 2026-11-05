import { describe, expect, it } from "vitest";
import type { LayoutOption } from "@ariya/studio";
import { defaultLayout } from "./model";
import {
  applyOption,
  optionSeats,
  seedFrom,
  toArrangeRequest,
  type SuggestTable,
} from "./suggested-layouts";

const tables: SuggestTable[] = [
  { id: "t0", shape: "round", capacity: 8, occupied: 0 },
  { id: "t1", shape: "round", capacity: 10, occupied: 0 },
];

function option(overrides: Partial<LayoutOption> = {}): LayoutOption {
  return {
    archetype: "rounds-rows",
    archetype_label: "Rounds in rows",
    strategy: "stage-short-wall",
    strategy_label: "Stage on the short wall",
    placements: [
      { table: 0, x: 5, y: 6, rot: 0 },
      { table: 1, x: 9, y: 6, rot: 90 },
    ],
    chairs: [],
    zones: [],
    unplaced: [],
    score: { total: 0.8, terms: [] },
    tradeoff: "Weakest on sightlines.",
    ...overrides,
  };
}

describe("seedFrom", () => {
  it("is stable for the same event and version", () => {
    expect(seedFrom("evt-1", 2)).toBe(seedFrom("evt-1", 2));
  });

  it("changes with the event or the version", () => {
    expect(seedFrom("evt-1", 2)).not.toBe(seedFrom("evt-2", 2));
    expect(seedFrom("evt-1", 2)).not.toBe(seedFrom("evt-1", 3));
  });

  it("stays a non-negative 32-bit integer", () => {
    const seed = seedFrom("a-long-event-identifier", 2);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

describe("toArrangeRequest", () => {
  it("carries the room, the tables and the seed", () => {
    const layout = defaultLayout();
    const req = toArrangeRequest(layout, tables, 0.6, 1234);
    expect(req.width).toBe(layout.width);
    expect(req.length).toBe(layout.length);
    expect(req.gap).toBe(0.6);
    expect(req.keep).toBe(3);
    expect(req.seed).toBe(1234n);
    expect(req.tables).toEqual([
      { id: "t0", shape: "round", capacity: 8, occupied: 0 },
      { id: "t1", shape: "round", capacity: 10, occupied: 0 },
    ]);
  });

  it("passes the venue's certified capacity, or null when it is unknown", () => {
    const layout = defaultLayout();
    expect(toArrangeRequest(layout, tables, 0.6, 1).capacity).toBeNull();

    const certified = {
      ...layout,
      venue: {
        ...layout.venue,
        capacity: { certified: 240, source: "Venue licence" },
      },
    };
    expect(toArrangeRequest(certified, tables, 0.6, 1).capacity).toBe(240);
  });

  it("sends zones with null shape and rotation when the hall leaves them out", () => {
    const layout = defaultLayout();
    const req = toArrangeRequest(layout, tables, 0.6, 1);
    expect(req.zones).toHaveLength(layout.zones.length);
    for (const z of req.zones) {
      expect(z.shape === null || typeof z.shape === "string").toBe(true);
      expect(z.rot === null || typeof z.rot === "number").toBe(true);
    }
  });
});

describe("applyOption", () => {
  it("maps placements onto the event's table ids in order", () => {
    const layout = defaultLayout();
    const applied = applyOption(option(), ["t0", "t1"], layout);
    expect(applied.positions).toEqual([
      { id: "t0", x: 5, y: 6, rot: 0 },
      { id: "t1", x: 9, y: 6, rot: 90 },
    ]);
  });

  it("drops a placement whose table index is out of range", () => {
    const layout = defaultLayout();
    const applied = applyOption(option(), ["t0"], layout);
    expect(applied.positions).toHaveLength(1);
    expect(applied.positions[0].id).toBe("t0");
  });

  it("moves a zone's geometry but keeps its styling", () => {
    const layout = defaultLayout();
    const stage = layout.zones.find((z) => z.kind === "stage");
    expect(stage).toBeDefined();
    const styled = { ...stage!, color: "#123456" };
    const withStyled = { ...layout, zones: [styled] };
    const applied = applyOption(
      option({
        zones: [
          {
            id: styled.id,
            kind: styled.kind,
            label: styled.label,
            x: 1,
            y: 2,
            w: 3,
            h: 4,
            shape: null,
            rot: null,
          },
        ],
      }),
      ["t0", "t1"],
      withStyled
    );
    const moved = applied.zones.find((z) => z.id === styled.id)!;
    expect(moved.x).toBe(1);
    expect(moved.y).toBe(2);
    expect(moved.w).toBe(3);
    expect(moved.h).toBe(4);
    expect(moved.color).toBe("#123456");
  });

  it("leaves zones the option does not mention untouched", () => {
    const layout = defaultLayout();
    const applied = applyOption(option({ zones: [] }), ["t0", "t1"], layout);
    expect(applied.zones).toEqual(layout.zones);
  });
});

describe("optionSeats", () => {
  it("sums the capacity of the tables an option places", () => {
    expect(optionSeats(option(), tables)).toBe(18);
  });

  it("ignores placements with no matching table", () => {
    expect(optionSeats(option(), [tables[0]])).toBe(8);
  });
});

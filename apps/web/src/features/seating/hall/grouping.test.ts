import { describe, expect, it } from "vitest";
import { defaultLayout, type HallLayout, type ItemGroup } from "./model";
import {
  chairRow,
  copyChair,
  copyZone,
  expandSelection,
  forgetItems,
  groupHolding,
  makeGroup,
  tableRowSlots,
} from "./grouping";

const layout = (p: Partial<HallLayout> = {}): HallLayout => ({
  ...defaultLayout(30, 20),
  ...p,
});

describe("expandSelection", () => {
  const groups: ItemGroup[] = [
    {
      id: "g1",
      name: "Head table",
      items: [
        { type: "table", id: "t1" },
        { type: "chair", id: "c1" },
        { type: "chair", id: "c2" },
      ],
    },
  ];

  it("selects a whole group from any member", () => {
    expect(expandSelection([{ type: "chair", id: "c2" }], groups)).toEqual([
      { type: "table", id: "t1" },
      { type: "chair", id: "c1" },
      { type: "chair", id: "c2" },
    ]);
  });

  it("leaves an ungrouped item alone", () => {
    expect(expandSelection([{ type: "table", id: "t9" }], groups)).toEqual([
      { type: "table", id: "t9" },
    ]);
  });

  it("does not repeat an item picked twice", () => {
    expect(
      expandSelection(
        [
          { type: "chair", id: "c1" },
          { type: "chair", id: "c2" },
        ],
        groups
      )
    ).toHaveLength(3);
  });
});

describe("makeGroup", () => {
  it("takes items out of an older group so each item has one home", () => {
    const l = layout({
      groups: [
        {
          id: "old",
          name: "Old",
          items: [
            { type: "table", id: "t1" },
            { type: "table", id: "t2" },
          ],
        },
      ],
    });
    const { groups } = makeGroup(l, [{ type: "table", id: "t1" }], "New");
    expect(groups.find((g) => g.id === "old")?.items).toEqual([
      { type: "table", id: "t2" },
    ]);
    expect(groups.at(-1)?.name).toBe("New");
  });

  it("names an empty group rather than storing a blank", () => {
    const { group } = makeGroup(layout(), [{ type: "table", id: "t1" }], "   ");
    expect(group.name).toBe("Group");
  });
});

describe("groupHolding", () => {
  const groups: ItemGroup[] = [
    {
      id: "g1",
      name: "Set",
      items: [
        { type: "table", id: "t1" },
        { type: "chair", id: "c1" },
      ],
    },
  ];

  it("finds the group that holds the whole selection", () => {
    expect(
      groupHolding(
        [
          { type: "table", id: "t1" },
          { type: "chair", id: "c1" },
        ],
        groups
      )?.id
    ).toBe("g1");
  });

  it("returns nothing when the selection is only part of a group", () => {
    expect(groupHolding([{ type: "table", id: "t1" }], groups)).toBeNull();
  });
});

describe("forgetItems", () => {
  it("drops deleted ids and forgets groups too small to be a group", () => {
    const groups: ItemGroup[] = [
      {
        id: "g1",
        name: "Two",
        items: [
          { type: "table", id: "t1" },
          { type: "chair", id: "c1" },
        ],
      },
    ];
    expect(forgetItems(groups, new Set(["c1"]))).toEqual([]);
  });
});

describe("copies", () => {
  it("puts a copied chair beside the original, inside the hall", () => {
    const l = layout();
    const copy = copyChair({ id: "c1", x: 29.9, y: 19.9, rot: 0 }, l);
    expect(copy.id).not.toBe("c1");
    expect(copy.x).toBeLessThanOrEqual(l.width);
    expect(copy.y).toBeLessThanOrEqual(l.length);
  });

  it("keeps a copied zone fully inside the hall", () => {
    const l = layout();
    const copy = copyZone(
      { id: "z1", kind: "stage", label: "Stage", x: 29.5, y: 19.5, w: 4, h: 2 },
      l
    );
    expect(copy.x).toBeLessThanOrEqual(l.width - 2);
    expect(copy.y).toBeLessThanOrEqual(l.length - 1);
  });
});

describe("chairRow", () => {
  it("spaces chairs evenly around the centre", () => {
    const row = chairRow(3, 0.6, 10, 5);
    expect(row.map((c) => c.x)).toEqual([9.4, 10, 10.6]);
    expect(new Set(row.map((c) => c.id)).size).toBe(3);
  });

  it("makes a couch seat two people", () => {
    expect(chairRow(1, 0, 10, 5, 0, "couch")[0].seats).toBe(2);
  });
});

describe("tableRowSlots", () => {
  it("lays out three tables in one row", () => {
    const slots = tableRowSlots(3, 3, { width: 30, length: 20 }, 15, 10);
    expect(slots).toHaveLength(3);
    expect(new Set(slots.map((s) => s.y)).size).toBe(1);
    expect(slots[0].x).toBeLessThan(slots[1].x);
    expect(slots[1].x).toBeLessThan(slots[2].x);
  });

  it("wraps onto a second row when the row is full", () => {
    const slots = tableRowSlots(5, 3, { width: 30, length: 20 }, 15, 10);
    expect(new Set(slots.map((s) => s.y)).size).toBe(2);
  });

  it("never places a table outside the hall", () => {
    for (const s of tableRowSlots(20, 8, { width: 30, length: 20 }, 2, 2, 3)) {
      expect(s.x).toBeGreaterThanOrEqual(1);
      expect(s.x).toBeLessThanOrEqual(29);
      expect(s.y).toBeGreaterThanOrEqual(1);
      expect(s.y).toBeLessThanOrEqual(19);
    }
  });
});

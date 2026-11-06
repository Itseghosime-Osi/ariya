import { describe, expect, it } from "vitest";
import {
  buildLayers,
  chairDefaultName,
  cleanLayerName,
  filterLayers,
  moveLayer,
  nudgeLayer,
  renameLayer,
  setLayersHidden,
  setLayersLocked,
} from "./layers";
import { defaultLayout, type HallLayout } from "./model";

const tables = [
  { id: "t1", name: "Table 01", capacity: 10, occupiedSeats: 4 },
  { id: "t2", name: "Head table", capacity: 8, occupiedSeats: 0 },
];

function layoutWith(extra: Partial<HallLayout> = {}): HallLayout {
  return { ...defaultLayout(), ...extra };
}

describe("buildLayers", () => {
  it("groups the hall into areas, tables, chairs and cooling, leaving out empty groups", () => {
    const groups = buildLayers(layoutWith(), tables);
    expect(groups.map((g) => g.key)).toEqual(["areas", "tables"]);
    const t = groups.find((g) => g.key === "tables")!;
    expect(t.rows.map((r) => r.name)).toEqual(["Table 01", "Head table"]);
    expect(t.rows[0].detail).toBe("4 of 10 seated");
  });

  it("numbers unnamed chairs by kind, and keeps the host's own names", () => {
    const layout = layoutWith({
      chairs: [
        { id: "a", x: 1, y: 1, rot: 0 },
        { id: "b", x: 2, y: 1, rot: 0, seat: "couple" },
        { id: "c", x: 3, y: 1, rot: 0 },
        { id: "d", x: 4, y: 1, rot: 0, label: "Grandmother" },
      ],
    });
    const chairs = buildLayers(layout, []).find((g) => g.key === "chairs")!;
    expect(chairs.rows.map((r) => r.name)).toEqual([
      "Guest chair 1",
      "Couple’s chair 1",
      "Guest chair 2",
      "Grandmother",
    ]);
    expect(chairs.rows.map((r) => r.named)).toEqual([
      false,
      false,
      false,
      true,
    ]);
    expect(chairDefaultName({ seat: undefined }, 3)).toBe("Guest chair 3");
  });

  it("lists a stage's fixtures right under it, pointing back at the stage", () => {
    const base = layoutWith();
    const stage = base.zones.find((z) => z.kind === "stage")!;
    const layout = {
      ...base,
      stageItems: [
        {
          id: "i1",
          stageId: stage.id,
          kind: "couch" as const,
          across: 0,
          depth: 0.6,
        },
      ],
    };
    const areas = buildLayers(layout, []).find((g) => g.key === "areas")!.rows;
    const at = areas.findIndex((r) => r.id === stage.id);
    expect(areas[at + 1]).toMatchObject({
      kind: "stageItem",
      name: "Couch",
      stageId: stage.id,
    });
  });
});

describe("filterLayers", () => {
  it("keeps matching rows and drops groups with none", () => {
    const groups = buildLayers(layoutWith(), tables);
    const hit = filterLayers(groups, "head");
    expect(hit).toHaveLength(1);
    expect(hit[0].rows.map((r) => r.name)).toEqual(["Head table"]);
    expect(filterLayers(groups, "zzz")).toEqual([]);
    expect(filterLayers(groups, "  ")).toBe(groups);
  });
});

describe("renameLayer", () => {
  it("renames an area and puts the default back on an empty name", () => {
    const layout = layoutWith();
    const stage = layout.zones.find((z) => z.kind === "stage")!;
    const named = renameLayer(
      layout,
      { kind: "zone", id: stage.id },
      "  Main   stage "
    );
    expect(named.zones.find((z) => z.id === stage.id)!.label).toBe(
      "Main stage"
    );
    const back = renameLayer(named, { kind: "zone", id: stage.id }, "");
    expect(back.zones.find((z) => z.id === stage.id)!.label).toBe(
      "Stage & band"
    );
  });

  it("names a chair and clears the name again", () => {
    const layout = layoutWith({ chairs: [{ id: "a", x: 1, y: 1, rot: 0 }] });
    const named = renameLayer(layout, { kind: "chair", id: "a" }, "Bride");
    expect(named.chairs[0].label).toBe("Bride");
    const cleared = renameLayer(named, { kind: "chair", id: "a" }, " ");
    expect("label" in cleared.chairs[0]).toBe(false);
  });

  it("names a stage fixture, and leaves tables to the database", () => {
    const layout = layoutWith({
      stageItems: [
        { id: "i", stageId: "s", kind: "arch", across: 0, depth: 0.8 },
      ],
    });
    expect(
      renameLayer(layout, { kind: "stageItem", id: "i" }, "Flower arch")
        .stageItems[0].label
    ).toBe("Flower arch");
    expect(renameLayer(layout, { kind: "table", id: "t1" }, "x")).toBe(layout);
  });

  it("cleans a name to one line within the schema's limit", () => {
    expect(cleanLayerName("a\n b\t c")).toBe("a b c");
    expect(cleanLayerName("x".repeat(100))).toHaveLength(60);
  });
});

describe("hiding, locking and ordering", () => {
  const rows = (layout: HallLayout, group: "tables" | "chairs" | "areas") =>
    buildLayers(layout, tables).find((g) => g.key === group)!.rows;

  it("hides and shows layers, and the rows say so", () => {
    const hidden = setLayersHidden(layoutWith(), ["table:t1"], true);
    expect(rows(hidden, "tables").map((r) => r.hidden)).toEqual([true, false]);
    const shown = setLayersHidden(hidden, ["table:t1"], false);
    expect(shown.layers.hidden).toEqual([]);
  });

  it("hides a stage's fixtures with it, and says they follow the stage", () => {
    const base = layoutWith();
    const stage = base.zones.find((z) => z.kind === "stage")!;
    const layout = {
      ...base,
      stageItems: [
        {
          id: "i",
          stageId: stage.id,
          kind: "arch" as const,
          across: 0,
          depth: 0.8,
        },
      ],
    };
    const gone = setLayersHidden(layout, [`zone:${stage.id}`], true);
    const fixture = rows(gone, "areas").find((r) => r.id === "i")!;
    expect(fixture).toMatchObject({ hidden: true, hiddenByStage: true });
    // A fixture hidden on its own is not "by stage".
    const own = setLayersHidden(layout, ["stageItem:i"], true);
    expect(rows(own, "areas").find((r) => r.id === "i")).toMatchObject({
      hidden: true,
      hiddenByStage: false,
    });
  });

  it("locks and unlocks, without repeating a key", () => {
    const once = setLayersLocked(layoutWith(), ["table:t1", "table:t1"], true);
    expect(once.layers.locked).toEqual(["table:t1"]);
    expect(rows(once, "tables")[0].locked).toBe(true);
    expect(setLayersLocked(once, ["table:t1"], false).layers.locked).toEqual(
      []
    );
  });

  it("moves a row onto another's place, and lists it there", () => {
    const keys = ["table:t1", "table:t2"];
    const moved = moveLayer(layoutWith(), keys, "table:t2", "table:t1");
    expect(rows(moved, "tables").map((r) => r.id)).toEqual(["t2", "t1"]);
    expect(
      moveLayer(layoutWith(), keys, "table:t1", "table:t1").layers.order
    ).toEqual([]);
    expect(
      moveLayer(layoutWith(), keys, "table:t1", "table:zz").layers.order
    ).toEqual([]);
  });

  it("drags down to land after the target and up to land before", () => {
    const layout = layoutWith({
      chairs: ["a", "b", "c"].map((id, i) => ({ id, x: i, y: 0, rot: 0 })),
    });
    const keys = ["chair:a", "chair:b", "chair:c"];
    const down = moveLayer(layout, keys, "chair:a", "chair:c");
    expect(rows(down, "chairs").map((r) => r.id)).toEqual(["b", "c", "a"]);
    const up = moveLayer(layout, keys, "chair:c", "chair:a");
    expect(rows(up, "chairs").map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("keeps a chair's name when it is moved, because the number follows the chair not the row", () => {
    const layout = layoutWith({
      chairs: ["a", "b"].map((id, i) => ({ id, x: i, y: 0, rot: 0 })),
    });
    const moved = moveLayer(
      layout,
      ["chair:a", "chair:b"],
      "chair:b",
      "chair:a"
    );
    expect(rows(moved, "chairs").map((r) => r.name)).toEqual([
      "Guest chair 2",
      "Guest chair 1",
    ]);
  });

  it("nudges one step and stops at the ends", () => {
    const layout = layoutWith();
    const keys = ["table:t1", "table:t2"];
    expect(nudgeLayer(layout, keys, "table:t1", -1)).toBe(layout);
    expect(nudgeLayer(layout, keys, "table:t2", 1)).toBe(layout);
    const down = nudgeLayer(layout, keys, "table:t1", 1);
    expect(rows(down, "tables").map((r) => r.id)).toEqual(["t2", "t1"]);
  });
});

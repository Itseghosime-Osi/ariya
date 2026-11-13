import { describe, expect, it } from "vitest";
import { createInvitationDesign } from "./design";
import {
  applyTextStyle,
  createTextStyle,
  deleteTextStyle,
  detachTextStyle,
  stackLayers,
  updateTextStyle,
} from "./layer-ops";
import { invitationDesignSchema } from "./schemas";

const base = () =>
  createInvitationDesign({
    title: "A celebration",
    couple: "Ada & Kunle",
    date: "2026-12-12",
    venue: "The Hall",
    area: "Lagos",
    dressCode: "Aso-ebi",
    rsvpBy: null,
    theme: "royal_gold",
  });
const byKind = (d: ReturnType<typeof base>, kind: string) =>
  d.layers.find((l) => l.kind === kind)!;

describe("brand styles", () => {
  it("saves a layer's look as a named style and the layer follows it", () => {
    const d = base();
    const date = byKind(d, "date");
    const next = createTextStyle(d, date.id, "  Detail line  ", "s1");
    expect(next.textStyles).toHaveLength(1);
    expect(next.textStyles![0]).toMatchObject({
      id: "s1",
      name: "Detail line",
      font: date.font,
      size: date.size,
      weight: date.weight,
    });
    expect(byKind(next, "date").styleId).toBe("s1");
    expect(invitationDesignSchema.safeParse(next).success).toBe(true);
  });

  it("changing one style updates every layer that follows it, in one new design", () => {
    let d = base();
    d = createTextStyle(d, byKind(d, "date").id, "Detail", "s1");
    d = applyTextStyle(
      d,
      [byKind(d, "venue").id, byKind(d, "dressCode").id],
      "s1"
    );
    // Restyle one of them, then pass that look to the style.
    const dateId = byKind(d, "date").id;
    d = {
      ...d,
      layers: d.layers.map((l) =>
        l.id === dateId
          ? { ...l, size: 5, italic: true, weight: 700 as const }
          : l
      ),
    };
    const before = d;
    const after = updateTextStyle(d, "s1", dateId);
    for (const kind of ["date", "venue", "dressCode"]) {
      expect(byKind(after, kind)).toMatchObject({
        size: 5,
        italic: true,
        weight: 700,
        styleId: "s1",
      });
    }
    expect(after.textStyles![0]).toMatchObject({
      size: 5,
      italic: true,
      weight: 700,
    });
    // Layers outside the style are untouched, and the input design was not changed.
    expect(byKind(after, "names")).toEqual(byKind(before, "names"));
    expect(byKind(before, "venue").size).not.toBe(5);
  });

  it("detaching stops following but keeps the look; deleting a style does the same for all", () => {
    let d = base();
    d = createTextStyle(d, byKind(d, "date").id, "Detail", "s1");
    d = applyTextStyle(d, [byKind(d, "venue").id], "s1");
    const detached = detachTextStyle(d, [byKind(d, "venue").id]);
    expect(byKind(detached, "venue").styleId).toBeUndefined();
    expect(byKind(detached, "venue").size).toBe(byKind(d, "venue").size);
    const gone = deleteTextStyle(d, "s1");
    expect(gone.textStyles).toBeUndefined();
    expect(gone.layers.every((l) => l.styleId === undefined)).toBe(true);
    expect(byKind(gone, "date").size).toBe(byKind(d, "date").size);
  });

  it("refuses an empty name and an unknown style", () => {
    const d = base();
    expect(createTextStyle(d, byKind(d, "date").id, "   ", "s1")).toBe(d);
    expect(applyTextStyle(d, [byKind(d, "date").id], "missing")).toBe(d);
    expect(updateTextStyle(d, "missing", byKind(d, "date").id)).toBe(d);
  });
});

describe("stackLayers", () => {
  it("lays layers top to bottom with one gap, keeping the highest where it is", () => {
    const d = base();
    const ids = [
      byKind(d, "date"),
      byKind(d, "venue"),
      byKind(d, "dressCode"),
    ].map((l) => l.id);
    const measured = {
      ...d,
      layers: d.layers.map((l) =>
        ids.includes(l.id) ? { ...l, height: 3 } : l
      ),
    };
    const top = Math.min(
      ...ids.map((id) => measured.layers.find((l) => l.id === id)!.y)
    );
    const out = stackLayers(measured, ids, 2);
    const ys = ids
      .map((id) => out.layers.find((l) => l.id === id)!.y)
      .sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(top, 2);
    expect(ys[1] - ys[0]).toBeCloseTo(5, 1);
    expect(ys[2] - ys[1]).toBeCloseTo(5, 1);
  });

  it("does nothing for a single layer", () => {
    const d = base();
    expect(stackLayers(d, [byKind(d, "date").id], 2)).toBe(d);
  });
});

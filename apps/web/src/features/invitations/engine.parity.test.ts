// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  addImage,
  addLayerOfKind,
  addShape,
  align,
  designEngineName,
  duplicate,
  importCard,
  removeCard,
  resizeBoxFast,
  snapRotationFast,
  stack,
  useDesignEngineBytes,
  withEntrySeal,
  resizeCanvasPxFast,
  setPaperEdgeFast,
  nudgeFast,
  flipFast,
  pxToPctFast,
  pctToPxFast,
  alignSelection,
  distributeLayers,
  groupLayers,
  ungroupLayers,
} from "./engine";
import { createInvitationDesign } from "./design";
import { normaliseDesign } from "./design";
import type { InvitationDesign, InvitationLayer } from "./types";

/**
 * The committed Rust artifact against the TypeScript fallback, on the same inputs. If a change to
 * `crates/design-core` is not mirrored in `layer-ops.ts` (or the other way round), this fails.
 */

const wasm = readFileSync(
  path.resolve(__dirname, "../../../public/wasm/ariya_design.wasm")
);

const house = (): InvitationDesign =>
  createInvitationDesign({
    title: "Ade & Bisi's Wedding",
    couple: "Ade & Bisi",
    venue: "Eko Hotel",
    area: "Victoria Island",
    dressCode: "Aso-ebi",
    theme: "royal_gold",
  });

/**
 * Ids are made on the way in (`kind-time-count[-random]`), so compare with those mapped to one
 * name. The TypeScript twin writes `fill: null` where Rust leaves the field out; both mean "no
 * fill", so empty fill and stroke are dropped before comparing.
 */
function stable(d: unknown): unknown {
  return JSON.parse(JSON.stringify(d), (k, v) => {
    if (
      k === "id" &&
      typeof v === "string" &&
      /^[a-z]+-[a-z0-9]+-\d+(-[a-z0-9]+)?$/.test(v)
    ) {
      return "new";
    }
    return (k === "fill" || k === "stroke") && v === null ? undefined : v;
  });
}

/** Runs one scenario on the TypeScript path, then on the Rust path. */
async function both<T>(run: () => T): Promise<{ ts: T; rust: T }> {
  await useDesignEngineBytes(null);
  expect(designEngineName()).toBe("typescript");
  const ts = run();
  expect(await useDesignEngineBytes(wasm)).toBe(true);
  expect(designEngineName()).toBe("rust");
  const rust = run();
  return { ts, rust };
}

beforeAll(async () => {
  expect(await useDesignEngineBytes(wasm)).toBe(true);
});

describe("the Rust design engine and its TypeScript fallback agree", () => {
  it("adds shapes, text, seals and pictures the same way", async () => {
    for (const shape of ["rect", "ellipse", "line"] as const) {
      const { ts, rust } = await both(() => addShape(house(), shape));
      expect(stable(rust!.design)).toEqual(stable(ts!.design));
    }
    for (const kind of ["text", "seal", "code"] as const) {
      const { ts, rust } = await both(() => addLayerOfKind(house(), kind));
      expect(stable(rust!.design)).toEqual(stable(ts!.design));
    }
    const { ts, rust } = await both(() =>
      addImage(house(), "https://example.com/a.png", 1.5)
    );
    expect(stable(rust!.design)).toEqual(stable(ts!.design));
  });

  it("duplicates, reorders and aligns the same way", async () => {
    const id = "names";
    const dup = await both(() => duplicate(house(), id));
    expect(stable(dup.rust!.design)).toEqual(stable(dup.ts!.design));
    for (const how of ["front", "back", "up", "down"] as const) {
      const r = await both(() => stack(house(), id, how));
      expect(r.rust).toEqual(r.ts);
    }
    for (const how of [
      "left",
      "centre",
      "right",
      "top",
      "middle",
      "bottom",
    ] as const) {
      const r = await both(() => align(house(), id, how));
      expect(r.rust).toEqual(r.ts);
    }
  });

  it("imports and removes a card the same way", async () => {
    const on = await both(() =>
      importCard(house(), "https://example.com/c.png", 0.8)
    );
    expect(stable(on.rust)).toEqual(stable(on.ts));
    const off = await both(() => removeCard(on.ts));
    expect(off.rust).toEqual(off.ts);
    const weird = await both(() =>
      importCard(house(), "https://example.com/c.png", 9)
    );
    expect(stable(weird.rust)).toEqual(stable(weird.ts));
  });

  it("puts the pass on the card the same way, and leaves a placed seal alone", async () => {
    const plain = await both(() => withEntrySeal(house()));
    expect(stable(plain.rust)).toEqual(stable(plain.ts));
    const placed = plain.ts;
    const moved: InvitationDesign = {
      ...placed,
      layers: placed.layers.map((l: InvitationLayer): InvitationLayer =>
        l.kind === "code" ? { ...l, x: 60, y: 70, visible: false } : l
      ),
    };
    const again = await both(() => withEntrySeal(moved));
    expect(stable(again.rust)).toEqual(stable(again.ts));
  });

  it("computes drag geometry the same way", async () => {
    const start = { x: 20, y: 20, width: 40, height: 20 };
    for (const handle of [
      "nw",
      "n",
      "ne",
      "e",
      "se",
      "s",
      "sw",
      "w",
    ] as const) {
      for (const [dx, dy] of [
        [10, 5],
        [-30, -30],
        [500, 500],
        [-500, -500],
        [0, 0],
        [3.3, -2.1],
      ]) {
        for (const keep of [false, true]) {
          const r = await both(() =>
            resizeBoxFast(start, handle, dx, dy, keep)
          );
          expect(r.rust).toEqual(r.ts);
        }
      }
    }
    for (const deg of [
      88, 52, 370, -88, 180, -180, 0, 7.4, 14.99, 97.5, -7.5, 720.3,
    ]) {
      const r = await both(() => snapRotationFast(deg));
      expect(r.rust).toBe(r.ts);
    }
  });

  it("every design the engine returns is one the server will accept", async () => {
    await useDesignEngineBytes(wasm);
    let d = house();
    d = addShape(d, "ellipse")!.design;
    d = addImage(d, "https://example.com/a.png", 2)!.design;
    d = importCard(d, "https://example.com/c.png", 1.2);
    d = withEntrySeal(d);
    expect(normaliseDesign(d)).not.toBeNull();
  });

  it("refuses a layer past the limit, as the server does", async () => {
    await useDesignEngineBytes(wasm);
    let d = house();
    while (d.layers.length < 60) d = addShape(d, "rect")!.design;
    expect(addShape(d, "rect")).toBeNull();
    await useDesignEngineBytes(null);
    expect(addShape(d, "rect")).toBeNull();
  });

  it("handles canvas px sizing, paper edges, and nudges identically", async () => {
    const { ts: tsResize, rust: rustResize } = await both(() =>
      resizeCanvasPxFast(house(), 1080, 1350)
    );
    expect(stable(rustResize)).toEqual(stable(tsResize));

    for (const edge of ["sharp", "rounded", "deckled"] as const) {
      const { ts: tsEdge, rust: rustEdge } = await both(() =>
        setPaperEdgeFast(tsResize, edge, edge === "rounded" ? 24 : 0)
      );
      expect(stable(rustEdge)).toEqual(stable(tsEdge));
    }

    const { ts: tsNudge, rust: rustNudge } = await both(() =>
      nudgeFast(tsResize, "names", 10.8, 13.5)
    );
    expect(stable(rustNudge)).toEqual(stable(tsNudge));

    const { ts: tsFlip, rust: rustFlip } = await both(() =>
      flipFast(tsResize, "names", true)
    );
    expect(stable(rustFlip)).toEqual(stable(tsFlip));

    const { ts: tsPx, rust: rustPx } = await both(() => pxToPctFast(270, 1080));
    expect(rustPx).toBe(tsPx);

    const { ts: tsPct, rust: rustPct } = await both(() =>
      pctToPxFast(25, 1080)
    );
    expect(rustPct).toBe(tsPct);
  });

  it("keeps extreme canvas dimensions and aspect limits identical", async () => {
    for (const [width, height] of [
      [10000, 200],
      [200, 10000],
      [1, 1],
      [20000, 20000],
      [1080, 10000],
      [1080, 200],
    ]) {
      const { ts, rust } = await both(() =>
        resizeCanvasPxFast(house(), width, height)
      );
      expect(stable(rust)).toEqual(stable(ts));
      expect(ts.canvas!.widthPx).toBeGreaterThanOrEqual(200);
      expect(ts.canvas!.widthPx).toBeLessThanOrEqual(10000);
      expect(ts.canvas!.heightPx).toBeGreaterThanOrEqual(200);
      expect(ts.canvas!.heightPx).toBeLessThanOrEqual(10000);
      expect(ts.canvas!.ratio).toBeGreaterThanOrEqual(0.4);
      expect(ts.canvas!.ratio).toBeLessThanOrEqual(2.5);
      expect(ts.layers).toEqual(house().layers);
    }
  });

  it("handles multi-layer align, distribute, group, and ungroup identically", async () => {
    const base = house();
    const ids = [base.layers[0].id, base.layers[1].id, base.layers[2].id];

    // Align selection left
    const { ts: tsAlign, rust: rustAlign } = await both(() =>
      alignSelection(base, ids, "left")
    );
    expect(stable(rustAlign)).toEqual(stable(tsAlign));

    // Distribute vertically
    const { ts: tsDist, rust: rustDist } = await both(() =>
      distributeLayers(base, ids, false)
    );
    expect(stable(rustDist)).toEqual(stable(tsDist));

    // Group
    const { ts: tsGroup, rust: rustGroup } = await both(() =>
      groupLayers(base, ids, "header_group")
    );
    expect(stable(rustGroup)).toEqual(stable(tsGroup));

    // Ungroup
    const { ts: tsUngroup, rust: rustUngroup } = await both(() =>
      ungroupLayers(tsGroup, ids)
    );
    expect(stable(rustUngroup)).toEqual(stable(tsUngroup));
  });
  it("duplicates independently while preserving frontend effects on both engines", async () => {
    const d = house();
    d.layers[0] = {
      ...d.layers[0],
      groupId: "original-group",
      flipX: true,
      shadowBlur: 12,
      shadowColor: "#702039",
      brightness: 8,
    };
    const { ts, rust } = await both(() => duplicate(d, d.layers[0].id));
    for (const result of [ts, rust]) {
      const copy = result?.design.layers.find((l) => l.id === result.id);
      expect(copy).toMatchObject({
        flipX: true,
        shadowBlur: 12,
        shadowColor: "#702039",
        brightness: 8,
      });
      expect(copy?.groupId).toBeUndefined();
      expect(result?.design.layers[0].groupId).toBe("original-group");
    }
  });
});

import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
  loadRenderEngine,
  MODE_NAMES,
  RENDER_ABI_VERSION,
  type RenderEngine,
} from "@ariya/render";

const artifact = readFileSync(
  path.resolve(process.cwd(), "public/wasm/ariya_render.wasm")
);

let render: RenderEngine;

beforeAll(async () => {
  render = await loadRenderEngine({ bytes: artifact });
});

describe("loadRenderEngine", () => {
  it("agrees with the crate on the ABI", () => {
    expect(RENDER_ABI_VERSION).toBe(1);
  });

  it("reads back eighteen normalised cuts", () => {
    const cuts = render.cuts();
    expect(cuts).toHaveLength(18);
    expect(render.cutCount()).toBe(18);

    expect(cuts[0].a).toBe(0);
    expect(cuts[17].b).toBeCloseTo(1, 12);
    for (let index = 1; index < cuts.length; index += 1) {
      expect(cuts[index].a).toBeCloseTo(cuts[index - 1].b, 12);
    }

    expect(render.totalTime()).toBeCloseTo(161.2, 10);
  });

  it("names every cut with a chapter", () => {
    for (const cut of render.cuts()) {
      expect(MODE_NAMES).toContain(cut.mode);
    }
  });
});

describe("sceneAt", () => {
  it("matches the JavaScript map at a spot inside an old chapter", () => {
    const scene = render.sceneAt(0.5);
    expect(scene.mode).toBe("old");
    expect(scene.p).toBeCloseTo(0.33676470588235247, 12);
    expect(scene.local).toBeCloseTo(0.2724458204334342, 12);
    expect(scene.fade).toBe(0);
    expect(scene.vis).toBeCloseTo(1, 12);
    expect(scene.cut).toBe(6);
  });

  it("holds both ends of the story", () => {
    expect(render.sceneAt(0)).toMatchObject({
      mode: "R",
      p: 0,
      local: 0,
      cut: 0,
    });
    expect(render.sceneAt(1)).toMatchObject({
      mode: "D",
      p: 1,
      local: 1,
      cut: 17,
    });
  });

  it("dips the picture at a cut", () => {
    const atCut = render.cuts()[3].a;
    expect(render.sceneAt(atCut).vis).toBeLessThan(1);
  });
});

describe("progress helpers", () => {
  it("lands a guest on the chapter they picked", () => {
    expect(render.sFromScene("C", 0)).toBeCloseTo(0.4017844396859387, 12);
    expect(render.sFromScene(0, 0.5)).toBeCloseTo(0.035688793718772316, 12);
    expect(render.sFromOld(0.5)).toBeCloseTo(0.625267665952891, 12);
  });

  it("returns the start of the story for a chapter that does not exist", () => {
    expect(render.sFromScene("nope" as never, 0.5)).toBe(0);
  });

  it("keeps the prologue in front of the story", () => {
    expect(render.rawFromS(0)).toBeCloseTo(0.004, 12);
    expect(render.rawFromS(1)).toBe(1);
  });

  it("round-trips scroll progress through the film's clock", () => {
    expect(render.tFromS(0)).toBe(0);
    expect(render.tFromS(1)).toBeCloseTo(161.2, 10);
    expect(render.sFromT(render.tFromS(0.42))).toBeCloseTo(0.42, 12);
  });
});

describe("the hall's randomness", () => {
  it("seeds the same sequence as geo.js", () => {
    expect(render.rngFill(1, 3)).toEqual(
      new Float64Array([0.70369, 0.34689, 0.35461])
    );
  });

  it("does not stick at zero for a zero seed", () => {
    expect(Array.from(render.rngFill(0, 3))).not.toEqual([0, 0, 0]);
  });

  it("hashes a name the way the hall does", () => {
    expect(render.hashStr("Chidinma & Tunde")).toBe(2_232_047_884);
    expect(render.hashStr("Table 1")).toBe(2_083_920_372);
    expect(render.hashStr("")).toBe(2_166_136_261);
  });

  it("copies the sequence out of linear memory", () => {
    const first = render.rngFill(7, 4);
    render.rngFill(7, 4);
    expect(first).toEqual(render.rngFill(7, 4));
  });
});

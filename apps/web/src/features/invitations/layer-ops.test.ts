import { describe, expect, it } from "vitest";
import { createInvitationDesign, normaliseDesign } from "./design";
import {
  alignLayer,
  applyImportedCard,
  createImageLayer,
  createShapeLayer,
  designRatio,
  duplicateLayer,
  moveLayerStack,
  resizeBox,
  snapRotation,
} from "./layer-ops";

const base = () =>
  createInvitationDesign({ title: "Ade & Bisi", couple: "Ade & Bisi" });

describe("model", () => {
  it("still loads a design saved before the designer existed", () => {
    const old = base();
    expect(normaliseDesign(old)).not.toBeNull();
    expect(designRatio(old)).toBeCloseTo(5 / 7);
  });

  it("accepts shapes, images, a custom shape of card and a flat colour", () => {
    const d = base();
    d.canvas = { ratio: 1 };
    d.chrome = false;
    d.background = {
      kind: "color",
      color: "#112233",
      imageUrl: null,
      overlay: 0,
    };
    d.layers = [
      createShapeLayer("ellipse", 0),
      createImageLayer("https://example.com/a.png", 1),
    ];
    const parsed = normaliseDesign(d);
    expect(parsed?.layers).toHaveLength(2);
    expect(parsed?.canvas?.ratio).toBe(1);
  });

  it("refuses an image that is not a web link", () => {
    const d = base();
    d.layers = [createImageLayer("javascript:alert(1)", 0)];
    expect(normaliseDesign(d)).toBeNull();
  });
});

describe("layer operations", () => {
  it("duplicates a layer just above it, but never the entry seal", () => {
    const d = base();
    const names = d.layers.find((l) => l.kind === "names")!;
    const dup = duplicateLayer(d, names.id)!;
    const i = dup.design.layers.findIndex((l) => l.id === names.id);
    expect(dup.design.layers[i + 1].id).toBe(dup.id);
    expect(dup.design.layers[i + 1].text).toBe(names.text);
    const withCode = {
      ...d,
      layers: [...d.layers, { ...names, id: "c", kind: "code" as const }],
    };
    expect(duplicateLayer(withCode, "c")).toBeNull();
  });

  it("moves layers in the stack and stops at the ends", () => {
    const d = base();
    const first = d.layers[0].id;
    const toFront = moveLayerStack(d, first, "front");
    expect(toFront.layers.at(-1)!.id).toBe(first);
    expect(moveLayerStack(toFront, first, "up")).toBe(toFront);
    expect(moveLayerStack(toFront, first, "back").layers[0].id).toBe(first);
  });

  it("aligns to the card's edges and centre", () => {
    const d = base();
    const id = d.layers.find((l) => l.kind === "names")!.id;
    const get = (x: typeof d) => x.layers.find((l) => l.id === id)!;
    const c = get(alignLayer(d, id, "centre"));
    expect(c.x + c.width / 2).toBeCloseTo(50);
    const r = get(alignLayer(d, id, "right"));
    expect(r.x + r.width).toBeCloseTo(100);
  });

  it("resizes from a handle and keeps inside the card", () => {
    const start = { x: 20, y: 20, width: 40, height: 20 };
    expect(resizeBox(start, "e", 10, 0).width).toBe(50);
    expect(resizeBox(start, "e", 500, 0)).toMatchObject({ x: 20, width: 80 });
    const w = resizeBox(start, "nw", -30, -30);
    expect(w.x).toBe(0);
    expect(w.y).toBe(0);
    expect(w.x + w.width).toBe(60);
    const kept = resizeBox(start, "se", 20, 0, true);
    expect(kept.width / kept.height).toBeCloseTo(2);
  });

  it("snaps rotation to 15 degrees when close", () => {
    expect(snapRotation(88)).toBe(90);
    expect(snapRotation(52)).toBe(52);
    expect(snapRotation(370)).toBe(10);
  });

  it("an imported card fills the card, takes its shape and hides the house words", () => {
    const d = base();
    d.layers.push({ ...d.layers[0], id: "code1", kind: "code" });
    const out = applyImportedCard(d, "https://example.com/card.png", 0.8);
    expect(out.canvas?.ratio).toBe(0.8);
    expect(out.chrome).toBe(false);
    expect(out.layers[0]).toMatchObject({
      kind: "image",
      x: 0,
      width: 100,
      height: 100,
    });
    expect(out.layers.filter((l) => l.kind === "names")[0].visible).toBe(false);
    expect(out.layers.find((l) => l.kind === "code")!.visible).toBe(true);
    // Importing again replaces the old card instead of stacking a second one.
    const again = applyImportedCard(out, "https://example.com/b.png", 1);
    expect(again.layers.filter((l) => l.name === "Your card")).toHaveLength(1);
  });
});

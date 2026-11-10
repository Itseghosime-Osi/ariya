import { it, expect, vi } from "vitest";
import { createInvitationDesign, createLayerOfKind } from "./design";
const { edit } = vi.hoisted(() => ({
  edit: vi.fn(() => {
    throw new Error("Unknown edit on cached engine");
  }),
}));
vi.mock("@ariya/design", () => ({
  loadDesignEngine: vi.fn(async () => ({ edit })),
}));
import { constrainEntrySealsFast, useDesignEngineBytes } from "./engine";
it("keeps passes inside paper when a cached WASM engine does not recognize the new edit", async () => {
  await useDesignEngineBytes(new Uint8Array([0]));
  const base = createInvitationDesign({ couple: "Ada & Kunle" });
  const code = {
    ...createLayerOfKind("code", 0),
    x: -500,
    y: 500,
    width: 1000,
  };
  const d = { ...base, layers: [...base.layers, code] };
  const next = constrainEntrySealsFast(d);
  expect(edit).toHaveBeenCalled();
  const seal = next.layers.at(-1)!;
  expect(seal.x).toBeGreaterThanOrEqual(0);
  expect(seal.y).toBeGreaterThanOrEqual(0);
  expect(seal.x + seal.width).toBeLessThanOrEqual(100);
  expect(next.layers[0]).toBe(d.layers[0]);
  expect(d.layers.at(-1)).toBe(code);
});

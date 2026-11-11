import { describe, it, expect, afterEach, vi } from "vitest";
import { updateEntrySealPlates } from "./seal-plate";
const rect = (x: number, y: number, w: number, h: number) => ({
  left: x,
  top: y,
  right: x + w,
  bottom: y + h,
  width: w,
  height: h,
  x,
  y,
  toJSON: () => ({}),
});
function fixture() {
  const root = document.createElement("div");
  root.innerHTML =
    '<div data-layer-id="pass" data-entry-seal style="opacity:1"><svg><circle data-seal-plate data-seal-plate-required="false" style="display:none" /></svg></div><div data-layer-id="art" style="opacity:1"></div>';
  document.body.append(root);
  const pass = root.children[0] as HTMLElement,
    art = root.children[1] as HTMLElement;
  vi.spyOn(pass, "getBoundingClientRect").mockReturnValue(
    rect(100, 100, 60, 60)
  );
  const bounds = vi
    .spyOn(art, "getBoundingClientRect")
    .mockReturnValue(rect(10, 10, 20, 20));
  return {
    root,
    art,
    bounds,
    plate: root.querySelector<SVGElement>("circle")!,
  };
}
afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});
describe("seal backing plate", () => {
  it("leaves a clear layout unchanged and restores it after an overlap ends", () => {
    const { root, bounds, plate } = fixture();
    updateEntrySealPlates(root);
    expect(plate.style.display).toBe("none");
    bounds.mockReturnValue(rect(120, 120, 40, 40));
    updateEntrySealPlates(root);
    expect(plate.style.display).toBe("");
    bounds.mockReturnValue(rect(10, 10, 20, 20));
    updateEntrySealPlates(root);
    expect(plate.style.display).toBe("none");
  });
  it("keeps required image/dark/contrast plates even without collisions", () => {
    const { root, plate } = fixture();
    plate.dataset.sealPlateRequired = "true";
    updateEntrySealPlates(root);
    expect(plate.style.display).toBe("");
  });
  it("accounts for shadows and ignores invisible artwork", () => {
    const { root, art, bounds, plate } = fixture();
    bounds.mockReturnValue(rect(60, 110, 25, 25));
    art.style.filter = "blur(10px)";
    updateEntrySealPlates(root);
    expect(plate.style.display).toBe("");
    art.style.opacity = "0";
    updateEntrySealPlates(root);
    expect(plate.style.display).toBe("none");
  });
});

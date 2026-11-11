import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInvitationDesign } from "./design";
const { png } = vi.hoisted(() => ({ png: vi.fn() }));
vi.mock("html-to-image", () => ({ toPng: png, toJpeg: png }));
import { exportInvitation } from "./export-service";
const design = createInvitationDesign({ couple: "Ada & Kunle" });
const options = (signal?: AbortSignal) => ({
  cardElement: document.createElement("div"),
  design,
  eventId: "fixture",
  format: "png" as const,
  signal,
});
beforeEach(() => {
  png.mockReset();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});
describe("cancellable invitation export", () => {
  it("cancels while fonts are loading without starting a render or a download", async () => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise(() => {}) },
    });
    const controller = new AbortController();
    const pending = exportInvitation(options(controller.signal));
    controller.abort();
    expect(await pending).toEqual({ ok: false, cancelled: true });
    expect(png).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
  it("cancels a pending raster render and cleans up its offscreen copy", async () => {
    let resolve!: (value: string) => void;
    png.mockReturnValue(new Promise<string>((r) => (resolve = r)));
    const controller = new AbortController();
    const pending = exportInvitation(options(controller.signal));
    await vi.waitFor(() => expect(png).toHaveBeenCalled());
    expect(document.querySelector("[data-export-copy]")).not.toBeNull();
    controller.abort();
    expect(await pending).toEqual({ ok: false, cancelled: true });
    resolve("data:image/png;base64,AAAA");
    await Promise.resolve();
    expect(document.querySelector("[data-export-copy]")).toBeNull();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
  it("bounds an asset wait rather than leaving export running forever", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise(() => {}) },
    });
    const pending = exportInvitation(options());
    await vi.advanceTimersByTimeAsync(30001);
    expect(await pending).toMatchObject({
      ok: false,
      error: expect.stringContaining("took too long"),
    });
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
  it("reports a render failure without producing a blank download", async () => {
    png.mockRejectedValue(new Error("Unable to render artwork"));
    expect(await exportInvitation(options())).toEqual({
      ok: false,
      error: "Unable to render artwork",
    });
    expect(document.querySelector("[data-export-copy]")).toBeNull();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
  it("retains the paper's inset borders while excluding outer studio shadows", async () => {
    const request = options();
    request.cardElement.style.boxShadow =
      "inset 0 0 0 1px rgba(184, 134, 75, 0.5), 0 20px 48px rgba(0, 0, 0, 0.4)";
    let shadow = "";
    png.mockImplementation(async (clone: HTMLElement) => {
      shadow = clone.style.boxShadow;
      return "data:image/png;base64,AAAA";
    });
    expect(await exportInvitation(request)).toEqual({ ok: true });
    expect(shadow).toContain("inset");
    expect(shadow).not.toContain("48px");
  });
});

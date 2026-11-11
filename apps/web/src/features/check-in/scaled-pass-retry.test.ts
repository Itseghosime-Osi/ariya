import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createScaledPassRetry } from "./scaled-pass-retry";
let draw: ReturnType<typeof vi.fn>;
function video(width = 2400, height = 1800, ready = 4) {
  const v = document.createElement("video");
  Object.defineProperties(v, {
    videoWidth: { value: width },
    videoHeight: { value: height },
    readyState: { value: ready },
  });
  return v;
}
beforeEach(() => {
  draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: draw,
    imageSmoothingQuality: "low",
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => vi.restoreAllMocks());
describe("scaled pass retry", () => {
  it("tries smaller aspect-preserving frames and reuses one private canvas", () => {
    const canvases: HTMLCanvasElement[] = [],
      sizes: number[][] = [];
    const reader = {
      decodeFromCanvas: vi.fn((canvas: HTMLCanvasElement) => {
        canvases.push(canvas);
        sizes.push([canvas.width, canvas.height]);
        if (sizes.length === 1) throw new Error("Unreadable at this scale");
        return { getText: () => " ARY-TEST-PASS " };
      }),
    };
    expect(createScaledPassRetry(reader)(video())).toBe("ARY-TEST-PASS");
    expect(sizes).toEqual([
      [600, 450],
      [400, 300],
    ]);
    expect(canvases[0]).toBe(canvases[1]);
    expect(draw).toHaveBeenCalledTimes(2);
    expect(document.querySelector("canvas")).toBeNull();
  });
  it("does not upscale, decode empty frames or allocate before the video is ready", () => {
    const reader = { decodeFromCanvas: vi.fn() };
    const retry = createScaledPassRetry(reader);
    expect(retry(video(300, 200))).toBeNull();
    expect(retry(video(2400, 1800, 0))).toBeNull();
    expect(retry(video(0, 0))).toBeNull();
    expect(draw).not.toHaveBeenCalled();
    expect(reader.decodeFromCanvas).not.toHaveBeenCalled();
  });
  it("leaves scanning active if every retry is unreadable", () => {
    const reader = {
      decodeFromCanvas: vi.fn(() => {
        throw new Error("No code");
      }),
    };
    expect(createScaledPassRetry(reader)(video())).toBeNull();
    expect(reader.decodeFromCanvas).toHaveBeenCalledTimes(2);
  });
  it("handles an unavailable canvas context without breaking the camera session", () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const reader = { decodeFromCanvas: vi.fn() };
    expect(createScaledPassRetry(reader)(video())).toBeNull();
    expect(reader.decodeFromCanvas).not.toHaveBeenCalled();
  });
});

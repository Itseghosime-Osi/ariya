// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A Web Audio that stays suspended until the "visitor" has tapped (allow = true). */
function installAudio(allow: { value: boolean }) {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  });
  const node = () => ({ connect: vi.fn() });
  class Ctx {
    state = "suspended";
    currentTime = 1;
    sampleRate = 8000;
    destination = node();
    async resume() {
      if (allow.value) this.state = "running";
    }
    createGain() {
      return { ...node(), gain: param() };
    }
    createDynamicsCompressor() {
      return { ...node(), threshold: param(), ratio: param() };
    }
    createBuffer(_c: number, len: number) {
      return { getChannelData: () => new Float32Array(len) };
    }
    createBiquadFilter() {
      return { ...node(), type: "", frequency: param(), Q: param() };
    }
    createOscillator() {
      return {
        ...node(),
        type: "",
        frequency: param(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createBufferSource() {
      return {
        ...node(),
        buffer: null,
        loop: false,
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createStereoPanner() {
      return { ...node(), pan: param() };
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = Ctx;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("the welcome fireworks' sound", () => {
  const allow = { value: false };
  beforeEach(() => {
    vi.resetModules();
    allow.value = false;
    installAudio(allow);
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    HTMLCanvasElement.prototype.getContext = (() =>
      new Proxy({}, { get: () => () => ({ addColorStop() {} }) })) as never;
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("offers one tap for sound when the browser has not allowed it, then every rocket can be heard", async () => {
    const { startFireworks } = await import("./fireworks");
    const { fireworkAudioReady } = await import("./firework-audio");
    const finish = startFireworks({ scale: "finale" });
    await flush();
    const chip = [...document.querySelectorAll("button")].find((b) =>
      /Tap for sound/.test(b.textContent ?? "")
    );
    expect(chip).toBeTruthy();
    expect(fireworkAudioReady()).toBe(false);
    allow.value = true; // the visitor taps
    chip!.click();
    await flush();
    expect(fireworkAudioReady()).toBe(true);
    expect(document.body.textContent).not.toContain("Tap for sound");
    finish();
  });

  it("shows no prompt when sound is already allowed", async () => {
    allow.value = true;
    const { startFireworks } = await import("./fireworks");
    const finish = startFireworks({ scale: "finale" });
    await flush();
    expect(document.body.textContent).not.toContain("Tap for sound");
    finish();
  });
});

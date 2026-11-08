// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A just-enough Web Audio: every node records what it was asked to do. */
function fakeAudio() {
  const log = { oscStarts: 0, sources: 0, panners: 0, filters: 0, gains: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  class Ctx {
    currentTime = 1;
    sampleRate = 8000;
    destination = node();
    resume = vi.fn(async () => {});
    suspend = vi.fn(async () => {});
    createGain() {
      log.gains += 1;
      return { ...node(), gain: param() };
    }
    createDynamicsCompressor() {
      return { ...node(), threshold: param(), ratio: param() };
    }
    createConvolver() {
      return { ...node(), buffer: null };
    }
    createBuffer(_c: number, len: number) {
      return { getChannelData: () => new Float32Array(len) };
    }
    createBiquadFilter() {
      log.filters += 1;
      return { ...node(), type: "", frequency: param(), Q: param() };
    }
    createOscillator() {
      return {
        ...node(),
        type: "",
        frequency: param(),
        detune: param(),
        start: () => {
          log.oscStarts += 1;
        },
        stop: vi.fn(),
      };
    }
    createBufferSource() {
      log.sources += 1;
      return {
        ...node(),
        buffer: null,
        loop: false,
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createStereoPanner() {
      log.panners += 1;
      return { ...node(), pan: param() };
    }
  }
  return { Ctx, log };
}

describe("the film's rocket sound", () => {
  let log: ReturnType<typeof fakeAudio>["log"];
  beforeEach(() => {
    vi.resetModules();
    const f = fakeAudio();
    log = f.log;
    vi.stubGlobal("AudioContext", f.Ctx);
    (window as unknown as { AudioContext: unknown }).AudioContext = f.Ctx;
    class FakeAudio {
      loop = false;
      volume = 1;
      paused = true;
      readyState = 4;
      currentTime = 0;
      addEventListener() {}
      play() {
        this.paused = false;
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
    }
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, headers: new Headers() }))
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("is silent until sound is on", async () => {
    const score = await import("./score");
    score.rocket(0.95, 0);
    expect(log.sources).toBe(0);
  });

  it("launches, climbs, bursts and crackles when sound is on", async () => {
    const score = await import("./score");
    expect(score.start()).toBe(true);
    const before = { ...log };
    score.rocket(0.95, -0.5);
    expect(log.panners - before.panners).toBe(1);
    // thump + whistle + boom oscillators; hiss, rumble, crack and the sparks are noise sources
    expect(log.oscStarts - before.oscStarts).toBeGreaterThanOrEqual(3);
    expect(log.sources - before.sources).toBeGreaterThanOrEqual(4 + 20);
  });
});

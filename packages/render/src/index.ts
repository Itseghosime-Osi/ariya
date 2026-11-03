/**
 * Loads the Rust renderer and hands back the story map.
 *
 * The crate owns the film's timeline, its easing and the hall's randomness. Callers
 * never touch the raw ABI: scalars come back as values, and the vecs the crate writes
 * are copied out of linear memory before they can be invalidated by a grow.
 */

/** The ABI the Rust crate and this loader agree on. */
export const RENDER_ABI_VERSION = 1;

/** Where `pnpm build:wasm` publishes the artifact. */
export const RENDER_WASM_URL = "/wasm/ariya_render.wasm";

/** What the crate returns when an export cannot find its target. */
const INVALID = 0xffff_ffff;

/** The chapters, in the crate's own order. */
export const MODE_NAMES = [
  "R",
  "M",
  "N",
  "old",
  "C",
  "G",
  "E",
  "F",
  "W",
  "J",
  "H",
  "T",
  "D",
] as const;

export type ModeName = (typeof MODE_NAMES)[number];

export interface SceneState {
  mode: ModeName;
  /** Progress through the original eight chapters. */
  p: number;
  /** Progress through whichever cut is on screen. */
  local: number;
  fade: number;
  vis: number;
  /** Index of the cut in `cuts()`. */
  cut: number;
}

export interface Cut {
  mode: ModeName;
  /** Start and end of the cut in story progress. */
  a: number;
  b: number;
  /** The span of `p` this cut covers. */
  p0: number;
  p1: number;
  /** When the cut starts and ends in the film's own clock. */
  t0: number;
  t1: number;
  scrollSec: number;
}

export interface RenderEngine {
  /** Which shot is on screen at story progress `s`, and how far into it. */
  sceneAt(s: number): SceneState;
  cuts(): Cut[];
  cutCount(): number;
  /** Length of the self-playing film, in seconds. */
  totalTime(): number;
  /** Where a named chapter starts, or sits at `k` through it. */
  sFromScene(mode: ModeName | number, k: number): number;
  /** Where a guest lands when they pick a chapter of the original eight. */
  sFromOld(p: number): number;
  /** Scroll progress includes the prologue, which the story map excludes. */
  rawFromS(s: number): number;
  tFromS(s: number): number;
  sFromT(t: number): number;
  /** The hall's seed for a name, matching `public/hall3d/geo.js`. */
  hashStr(value: string): number;
  rngFill(seed: number, count: number): Float64Array;
}

export interface LoadRenderEngineOptions {
  /** Where to fetch the artifact. Defaults to `RENDER_WASM_URL`. */
  url?: string;
  /** Already-loaded bytes, to skip the network. */
  bytes?: BufferSource;
}

interface RenderExports {
  memory: WebAssembly.Memory;
  ariya_abi_version(): number;
  ariya_alloc(size: number): number;
  ariya_free(ptr: number, size: number): void;
  ariya_hash_str(ptr: number, len: number): number;
  ariya_rng_fill(seed: number, count: number, out: number): void;
  ariya_scene_at(s: number, out: number): number;
  ariya_cut_count(): number;
  ariya_cut_at(index: number, out: number): number;
  ariya_s_from_scene(mode: number, k: number): number;
  ariya_s_from_old(p: number): number;
  ariya_raw_from_s(s: number): number;
  ariya_t_from_s(s: number): number;
  ariya_s_from_t(t: number): number;
  ariya_total_time(): number;
}

/** `sceneAt` writes five f64s, `cutAt` writes seven. */
const SCRATCH_FLOATS = 8;
const FLOAT_BYTES = Float64Array.BYTES_PER_ELEMENT;

function modeName(mode: number): ModeName {
  return MODE_NAMES[mode >>> 0] ?? "old";
}

async function instantiate(
  options: LoadRenderEngineOptions
): Promise<WebAssembly.Instance> {
  if (options.bytes) {
    return (await WebAssembly.instantiate(options.bytes, {})).instance;
  }

  const url = options.url ?? RENDER_WASM_URL;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not load the renderer from ${url} (${response.status}).`
    );
  }

  try {
    // Some static hosts serve .wasm as octet-stream, which the streaming API rejects.
    const source = await WebAssembly.instantiateStreaming(response.clone(), {});
    return source.instance;
  } catch {
    const bytes = await response.arrayBuffer();
    return (await WebAssembly.instantiate(bytes, {})).instance;
  }
}

/**
 * Fetches and instantiates the renderer.
 *
 * Everything the engine returns is copied out of linear memory, so a later grow
 * cannot leave a caller holding a detached view.
 */
export async function loadRenderEngine(
  options: LoadRenderEngineOptions = {}
): Promise<RenderEngine> {
  const instance = await instantiate(options);
  const wasm = instance.exports as unknown as RenderExports;

  const abi = wasm.ariya_abi_version();
  if (abi !== RENDER_ABI_VERSION) {
    throw new Error(
      `The renderer speaks ABI ${abi}, but this loader expects ${RENDER_ABI_VERSION}. Run pnpm build:wasm.`
    );
  }

  const scratch = wasm.ariya_alloc(SCRATCH_FLOATS * FLOAT_BYTES);
  const floats = (count: number) =>
    new Float64Array(wasm.memory.buffer, scratch, count);

  return {
    sceneAt(s) {
      const mode = wasm.ariya_scene_at(s, scratch);
      const out = floats(5);
      return {
        mode: modeName(mode),
        p: out[0],
        local: out[1],
        fade: out[2],
        vis: out[3],
        cut: out[4],
      };
    },

    cuts() {
      const cuts: Cut[] = [];
      const count = wasm.ariya_cut_count() >>> 0;
      for (let index = 0; index < count; index += 1) {
        const mode = wasm.ariya_cut_at(index, scratch) >>> 0;
        if (mode === INVALID) break;
        const out = floats(7);
        cuts.push({
          mode: modeName(mode),
          a: out[0],
          b: out[1],
          p0: out[2],
          p1: out[3],
          t0: out[4],
          t1: out[5],
          scrollSec: out[6],
        });
      }
      return cuts;
    },

    cutCount() {
      return wasm.ariya_cut_count() >>> 0;
    },

    totalTime() {
      return wasm.ariya_total_time();
    },

    sFromScene(mode, k) {
      const index = typeof mode === "number" ? mode : MODE_NAMES.indexOf(mode);
      return wasm.ariya_s_from_scene(index < 0 ? INVALID : index, k);
    },

    sFromOld(p) {
      return wasm.ariya_s_from_old(p);
    },

    rawFromS(s) {
      return wasm.ariya_raw_from_s(s);
    },

    tFromS(s) {
      return wasm.ariya_t_from_s(s);
    },

    sFromT(t) {
      return wasm.ariya_s_from_t(t);
    },

    hashStr(value) {
      const bytes = new TextEncoder().encode(value);
      if (bytes.length === 0) return wasm.ariya_hash_str(0, 0) >>> 0;

      const ptr = wasm.ariya_alloc(bytes.length);
      try {
        // Re-read the buffer after allocating: the grow may have replaced it.
        new Uint8Array(wasm.memory.buffer, ptr, bytes.length).set(bytes);
        return wasm.ariya_hash_str(ptr, bytes.length) >>> 0;
      } finally {
        wasm.ariya_free(ptr, bytes.length);
      }
    },

    rngFill(seed, count) {
      const length = Math.max(0, Math.trunc(count));
      const size = FLOAT_BYTES * Math.max(length, 1);
      const ptr = wasm.ariya_alloc(size);
      try {
        wasm.ariya_rng_fill(seed >>> 0, length, ptr);
        // Copy out before freeing; the view would dangle afterwards.
        return new Float64Array(wasm.memory.buffer, ptr, length).slice();
      } finally {
        wasm.ariya_free(ptr, size);
      }
    },
  };
}

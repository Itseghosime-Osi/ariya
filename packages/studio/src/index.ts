/**
 * Loads the Rust studio core and hands back typed operations.
 *
 * The crate owns the geometry and the packing; the TypeScript in `features/seating/hall` keeps
 * the interactive micro-operations. Callers never touch the raw ABI: requests go in as objects
 * and come back as objects, and every buffer is freed before the call returns.
 *
 * Loading is allowed to fail. `loadStudio` resolves to `null` rather than throwing, so the studio
 * can fall back to its TypeScript implementation and hide the features that need Rust.
 */

/** The ABI the crate and this loader agree on. */
export const STUDIO_ABI_VERSION = 1;

/** Where `pnpm build:wasm` publishes the artifact. */
export const STUDIO_WASM_URL = "/wasm/ariya_studio.wasm";

/** The operations the crate exposes. */
export const OP = {
  VERSION: 0,
  GEOMETRY: 1,
  FIT: 2,
  ARRANGE: 3,
  SCORE: 4,
  THERMAL: 5,
  CATERING: 6,
  RISK: 7,
  CHECKLIST: 8,
} as const;

export type Op = (typeof OP)[keyof typeof OP];

export type {
  Archetype,
  ArrangeRequest,
  ArrangeResponse,
  ArrangeTable,
  Arrangement,
  Capacity,
  ChairPlacement,
  Climate,
  Environment,
  FitPlacement,
  FitRequest,
  FitResult,
  Footprint,
  GeometryRequest,
  GeometryResponse,
  LayoutOption,
  Placement,
  ScoreBreakdown,
  ScoreTerm,
  Services,
  Side,
  StageWall,
  Structure,
  TableGeometry,
  TableSpec,
  TableTop,
  TopKind,
  VenueProfile,
  VenueType,
  Zone,
  ZoneKind,
  ZoneShape,
} from "./generated";

import type {
  ArrangeRequest,
  ArrangeResponse,
  FitRequest,
  FitResult,
  GeometryRequest,
  GeometryResponse,
} from "./generated";

export interface StudioEngine {
  /** The ABI the loaded artifact speaks. */
  version(): number;
  /** Table tops, footprints, extents and wall gaps for a set of tables. */
  geometry(request: GeometryRequest): GeometryResponse;
  /** How many tables fit, and where. */
  fit(request: FitRequest): FitResult;
  /** Three ranked, explained arrangements of the whole hall. */
  arrange(request: ArrangeRequest): ArrangeResponse;
}

export interface LoadStudioOptions {
  /** Where to fetch the artifact. Defaults to `STUDIO_WASM_URL`. */
  url?: string;
  /** Already-loaded bytes, to skip the network. */
  bytes?: BufferSource;
}

interface StudioExports {
  memory: WebAssembly.Memory;
  ariya_studio_abi_version(): number;
  ariya_studio_alloc(size: number): number;
  ariya_studio_free(ptr: number, size: number): void;
  ariya_studio_call(op: number, ptr: number, len: number): bigint;
}

interface Envelope<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

async function instantiate(
  options: LoadStudioOptions
): Promise<WebAssembly.Instance> {
  if (options.bytes) {
    return (await WebAssembly.instantiate(options.bytes, {})).instance;
  }

  const url = options.url ?? STUDIO_WASM_URL;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not load the studio core from ${url} (${response.status}).`
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
 * Fetches and instantiates the studio core, or resolves to `null` when it cannot be loaded.
 *
 * A missing or mismatched artifact is not an error the user should see: the studio degrades to
 * its TypeScript path instead.
 */
export async function loadStudio(
  options: LoadStudioOptions = {}
): Promise<StudioEngine | null> {
  let wasm: StudioExports;
  try {
    const instance = await instantiate(options);
    wasm = instance.exports as unknown as StudioExports;
  } catch {
    return null;
  }

  if (wasm.ariya_studio_abi_version() !== STUDIO_ABI_VERSION) return null;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function call<T>(op: Op, payload: unknown): T {
    // u64 fields arrive as bigint from the generated types, which JSON.stringify rejects; a
    // seed stays well inside 2^53, so a number round-trips exactly.
    const json = JSON.stringify(payload ?? {}, (_, value) =>
      typeof value === "bigint" ? Number(value) : value
    );
    const bytes = encoder.encode(json);
    const inPtr = wasm.ariya_studio_alloc(Math.max(bytes.length, 1));
    if (!inPtr) throw new Error("The studio core is out of memory.");
    try {
      new Uint8Array(wasm.memory.buffer, inPtr, bytes.length).set(bytes);
      const packed = wasm.ariya_studio_call(op, inPtr, bytes.length);
      if (packed === 0n) throw new Error("The studio core returned nothing.");

      const outPtr = Number(packed >> 32n);
      const outLen = Number(packed & 0xffff_ffffn);
      try {
        // Copy out before freeing: the view would dangle afterwards.
        const text = decoder.decode(
          new Uint8Array(wasm.memory.buffer, outPtr, outLen)
        );
        const envelope = JSON.parse(text) as Envelope<T>;
        if (!envelope.ok) {
          throw new Error(
            envelope.message ?? envelope.code ?? "The studio core failed."
          );
        }
        return envelope.data as T;
      } finally {
        wasm.ariya_studio_free(outPtr, outLen);
      }
    } finally {
      wasm.ariya_studio_free(inPtr, Math.max(bytes.length, 1));
    }
  }

  return {
    version: () => call<{ abi: number }>(OP.VERSION, {}).abi,
    geometry: (request) => call<GeometryResponse>(OP.GEOMETRY, request),
    fit: (request) => call<FitResult>(OP.FIT, request),
    arrange: (request) => call<ArrangeResponse>(OP.ARRANGE, request),
  };
}

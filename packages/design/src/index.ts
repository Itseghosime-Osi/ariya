/**
 * Loads the Rust design engine and hands back typed operations.
 *
 * The crate owns the document: what a valid design is, and every edit the designer offers. The
 * TypeScript in `features/invitations` keeps drawing and pointer handling. Callers never touch
 * the raw ABI: requests go in as objects and come back as objects, and every buffer is freed
 * before the call returns.
 *
 * Loading is allowed to fail. `loadDesignEngine` resolves to `null` rather than throwing, so the
 * designer can fall back to its TypeScript implementation of the same operations.
 */

/** The ABI the crate and this loader agree on. */
export const DESIGN_ABI_VERSION = 1;

/** Where `pnpm build:wasm` publishes the artifact. */
export const DESIGN_WASM_URL = "/wasm/ariya_design.wasm";

/** The operations the crate exposes. */
export const OP = {
  VERSION: 0,
  VALIDATE: 1,
  EDIT: 2,
  GEOMETRY: 3,
} as const;

export type Op = (typeof OP)[keyof typeof OP];

export type {
  Align,
  Background,
  BackgroundKind,
  Canvas,
  ColorRole,
  Design,
  Edit,
  EditRequest,
  EditResponse,
  Fit,
  Font,
  GeometryRequest,
  Layer,
  LayerKind,
  Palette,
  Shape,
  WireAlign,
  WireHandle,
  WireRect,
  WireStack,
} from "./generated";

import type {
  Design,
  Edit,
  EditResponse,
  GeometryRequest,
  WireRect,
} from "./generated";

export interface DesignEngine {
  /** The ABI the loaded artifact speaks. */
  version(): number;
  /** Checks a design against every limit and returns it normalised. Throws with the first problem. */
  validate(design: unknown): Design;
  /** One edit. Throws when the engine refuses it (a full card, a bad request). */
  edit(design: Design, edit: Edit): EditResponse;
  /** Where a dragged box ends up. */
  resizeBox(
    start: WireRect,
    handle: Extract<GeometryRequest, { kind: "resizeBox" }>["handle"],
    dx: number,
    dy: number,
    keepShape: boolean
  ): WireRect;
  /** A turn, snapped to 15 degree steps when close. */
  snapRotation(degrees: number): number;
}

export interface LoadDesignEngineOptions {
  /** Where to fetch the artifact. Defaults to `DESIGN_WASM_URL`. */
  url?: string;
  /** Already-loaded bytes, to skip the network. */
  bytes?: BufferSource;
}

interface DesignExports {
  memory: WebAssembly.Memory;
  ariya_design_abi_version(): number;
  ariya_design_alloc(size: number): number;
  ariya_design_free(ptr: number, size: number): void;
  ariya_design_call(op: number, ptr: number, len: number): bigint;
}

interface Envelope<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

async function instantiate(
  options: LoadDesignEngineOptions
): Promise<WebAssembly.Instance> {
  if (options.bytes) {
    return (await WebAssembly.instantiate(options.bytes, {})).instance;
  }

  const url = options.url ?? DESIGN_WASM_URL;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not load the design engine from ${url} (${response.status}).`
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
 * Fetches and instantiates the design engine, or resolves to `null` when it cannot be loaded.
 *
 * A missing or mismatched artifact is not an error the user should see: the designer keeps
 * working on its TypeScript path.
 */
export async function loadDesignEngine(
  options: LoadDesignEngineOptions = {}
): Promise<DesignEngine | null> {
  let wasm: DesignExports;
  try {
    const instance = await instantiate(options);
    wasm = instance.exports as unknown as DesignExports;
  } catch {
    return null;
  }

  if (wasm.ariya_design_abi_version() !== DESIGN_ABI_VERSION) return null;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function call<T>(op: Op, payload: unknown): T {
    const bytes = encoder.encode(JSON.stringify(payload ?? {}));
    const inPtr = wasm.ariya_design_alloc(Math.max(bytes.length, 1));
    if (!inPtr) throw new Error("The design engine is out of memory.");
    try {
      new Uint8Array(wasm.memory.buffer, inPtr, bytes.length).set(bytes);
      const packed = wasm.ariya_design_call(op, inPtr, bytes.length);
      if (packed === 0n) throw new Error("The design engine returned nothing.");

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
            envelope.message ?? envelope.code ?? "The design engine failed."
          );
        }
        return envelope.data as T;
      } finally {
        wasm.ariya_design_free(outPtr, outLen);
      }
    } finally {
      wasm.ariya_design_free(inPtr, Math.max(bytes.length, 1));
    }
  }

  return {
    version: () => call<{ abi: number }>(OP.VERSION, {}).abi,
    validate: (design) => call<{ design: Design }>(OP.VALIDATE, design).design,
    edit: (design, edit) => call<EditResponse>(OP.EDIT, { design, edit }),
    resizeBox: (start, handle, dx, dy, keepShape) =>
      call<WireRect>(OP.GEOMETRY, {
        kind: "resizeBox",
        start,
        handle,
        dx,
        dy,
        keepShape,
      }),
    snapRotation: (degrees) =>
      call<{ degrees: number }>(OP.GEOMETRY, { kind: "snapRotation", degrees })
        .degrees,
  };
}

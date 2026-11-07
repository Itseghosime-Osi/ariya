/**
 * The design engine, as the designer uses it.
 *
 * The Rust crate (`crates/design-core`, loaded as WebAssembly) is the engine. Until it has loaded,
 * or if it cannot load at all, the same operations run on the TypeScript in `layer-ops.ts`, so the
 * designer never waits on it and never breaks without it. `engine.parity.test.ts` holds the two to
 * the same answers.
 */

import {
  loadDesignEngine,
  type DesignEngine,
  type Edit,
  type WireHandle,
  type WireRect,
} from "@ariya/design";
import {
  alignLayer,
  createImageLayer,
  createShapeLayer,
  duplicateLayer,
  moveLayerStack,
  applyImportedCard,
  removeImportedCard,
  resizeBox,
  snapRotation,
  type Alignment,
  type Box,
  type Handle,
  type StackMove,
} from "./layer-ops";
import { createLayerOfKind, ensureEntrySeal } from "./design";
import type { InvitationDesign, InvitationShape } from "./types";

let engine: DesignEngine | null = null;
let loading: Promise<DesignEngine | null> | null = null;

/** Starts loading the Rust engine once. Resolves to whether it is running. */
export function startDesignEngine(): Promise<boolean> {
  loading ??= loadDesignEngine().then((e) => (engine = e));
  return loading.then((e) => e !== null);
}

/** Test hook: use these bytes (or none) instead of fetching. */
export async function useDesignEngineBytes(
  bytes: BufferSource | null
): Promise<boolean> {
  engine = bytes ? await loadDesignEngine({ bytes }) : null;
  loading = Promise.resolve(engine);
  return engine !== null;
}

export function designEngineName(): "rust" | "typescript" {
  return engine ? "rust" : "typescript";
}

export function freshId(kind: string, count = 0): string {
  return `${kind}-${Date.now().toString(36)}-${count}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

// The wire carries designs as plain JSON; the app's own types are the same shape.
const asWire = (d: InvitationDesign) =>
  d as unknown as Parameters<DesignEngine["edit"]>[0];
const fromWire = (d: unknown) => d as InvitationDesign;

function run(
  design: InvitationDesign,
  edit: Edit
): { design: InvitationDesign; id: string | null } | null {
  if (!engine) return null;
  try {
    const out = engine.edit(asWire(design), edit);
    return { design: fromWire(out.design), id: out.selectedId };
  } catch {
    // The engine refused (a full card, say). Say so by returning nothing, like the fallback does.
    return { design, id: null };
  }
}

export function addShape(
  design: InvitationDesign,
  shape: InvitationShape
): { design: InvitationDesign; id: string } | null {
  const id = freshId("shape", design.layers.length);
  const out = run(design, { type: "addShape", shape, newId: id });
  if (out) return out.id ? { design: out.design, id: out.id } : null;
  if (design.layers.length >= 60) return null;
  const layer = createShapeLayer(
    shape,
    design.layers.length,
    design.canvas?.ratio
  );
  return {
    design: { ...design, layers: [...design.layers, layer] },
    id: layer.id,
  };
}

export function addLayerOfKind(
  design: InvitationDesign,
  kind: "text" | "seal" | "code"
): { design: InvitationDesign; id: string } | null {
  const id = freshId(kind, design.layers.length);
  const out = run(design, { type: "addLayer", kind, newId: id });
  if (out) return out.id ? { design: out.design, id: out.id } : null;
  if (design.layers.length >= 60) return null;
  if (kind === "code" && design.layers.some((l) => l.kind === "code"))
    return null;
  const layer = createLayerOfKind(kind, design.layers.length);
  return {
    design: { ...design, layers: [...design.layers, layer] },
    id: layer.id,
  };
}

export function addImage(
  design: InvitationDesign,
  url: string,
  imageRatio: number
): { design: InvitationDesign; id: string } | null {
  const id = freshId("image", design.layers.length);
  const out = run(design, { type: "addImage", url, newId: id, imageRatio });
  if (out) return out.id ? { design: out.design, id: out.id } : null;
  if (design.layers.length >= 60) return null;
  const layer = createImageLayer(url, design.layers.length, {
    ratio: design.canvas?.ratio,
    imageRatio,
  });
  return {
    design: { ...design, layers: [...design.layers, layer] },
    id: layer.id,
  };
}

export function duplicate(
  design: InvitationDesign,
  id: string
): { design: InvitationDesign; id: string } | null {
  const out = run(design, {
    type: "duplicate",
    id,
    newId: freshId("copy", design.layers.length),
  });
  if (out) return out.id ? { design: out.design, id: out.id } : null;
  return duplicateLayer(design, id);
}

export function stack(
  design: InvitationDesign,
  id: string,
  how: StackMove
): InvitationDesign {
  return (
    run(design, { type: "stack", id, how })?.design ??
    moveLayerStack(design, id, how)
  );
}

export function align(
  design: InvitationDesign,
  id: string,
  how: Alignment
): InvitationDesign {
  return (
    run(design, { type: "align", id, how })?.design ??
    alignLayer(design, id, how)
  );
}

export function importCard(
  design: InvitationDesign,
  url: string,
  imageRatio: number
): InvitationDesign {
  return (
    run(design, {
      type: "importCard",
      url,
      imageRatio,
      newId: freshId("card", design.layers.length),
    })?.design ?? applyImportedCard(design, url, imageRatio)
  );
}

export function removeCard(design: InvitationDesign): InvitationDesign {
  return (
    run(design, { type: "removeCard" })?.design ?? removeImportedCard(design)
  );
}

export function withEntrySeal(design: InvitationDesign): InvitationDesign {
  return (
    run(design, {
      type: "ensureEntrySeal",
      newId: freshId("code", design.layers.length),
    })?.design ?? ensureEntrySeal(design)
  );
}

/** Called on every pointer move while a handle is dragged. */
export function resizeBoxFast(
  start: Box,
  handle: Handle,
  dx: number,
  dy: number,
  keepShape: boolean
): Box {
  if (engine) {
    try {
      return engine.resizeBox(
        start as WireRect,
        handle as WireHandle,
        dx,
        dy,
        keepShape
      );
    } catch {
      /* fall through to the TypeScript answer */
    }
  }
  return resizeBox(start, handle, dx, dy, keepShape);
}

export function snapRotationFast(degrees: number): number {
  if (engine) {
    try {
      return engine.snapRotation(degrees);
    } catch {
      /* fall through */
    }
  }
  return snapRotation(degrees);
}

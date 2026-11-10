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
  alignSelectionFast,
  distributeLayersFast,
  groupLayersFast,
  ungroupLayersFast,
  createImageLayer,
  createShapeLayer,
  duplicateLayer,
  moveLayerStack,
  applyImportedCard,
  removeImportedCard,
  resizeBox,
  snapRotation,
  resizeCanvasPx,
  setPaperEdge,
  nudgeLayer,
  flipLayer,
  type Alignment,
  type Box,
  type Handle,
  type StackMove,
} from "./layer-ops";
import { createLayerOfKind, ensureEntrySeal } from "./design";
import type { InvitationDesign, InvitationShape, PaperEdge } from "./types";

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

// The wire carries designs as plain JSON; translate camelCase corner radii
// (`radiusTL` <-> `radiusTl`) and preserve frontend-only FX fields across WASM round-trips.
const EXTRA_LAYER_KEYS = [
  "aspectLocked",
  "flipX",
  "flipY",
  "brightness",
  "contrast",
  "saturate",
  "sepia",
  "grayscale",
  "shadowBlur",
  "shadowX",
  "shadowY",
  "shadowColor",
] as const;

const asWire = (d: InvitationDesign) => {
  const mapped = {
    ...d,
    layers: d.layers.map((l) => {
      const rec = { ...l } as Record<string, unknown>;
      if (l.radiusTL !== undefined) rec.radiusTl = l.radiusTL;
      if (l.radiusTR !== undefined) rec.radiusTr = l.radiusTR;
      if (l.radiusBR !== undefined) rec.radiusBr = l.radiusBR;
      if (l.radiusBL !== undefined) rec.radiusBl = l.radiusBL;
      return rec;
    }),
  };
  return mapped as unknown as Parameters<DesignEngine["edit"]>[0];
};

const fromWire = (d: unknown, source?: InvitationDesign): InvitationDesign => {
  const out = d as InvitationDesign;
  const byId = new Map(source?.layers.map((l) => [l.id, l]) ?? []);
  return {
    ...out,
    layers: out.layers.map((layer) => {
      const rec = layer as unknown as Record<string, unknown>;
      const next: Record<string, unknown> = { ...rec };
      if (rec.radiusTl !== undefined && rec.radiusTl !== null) {
        next.radiusTL = rec.radiusTl;
      }
      if (rec.radiusTr !== undefined && rec.radiusTr !== null) {
        next.radiusTR = rec.radiusTr;
      }
      if (rec.radiusBr !== undefined && rec.radiusBr !== null) {
        next.radiusBR = rec.radiusBr;
      }
      if (rec.radiusBl !== undefined && rec.radiusBl !== null) {
        next.radiusBL = rec.radiusBl;
      }
      delete next.radiusTl;
      delete next.radiusTr;
      delete next.radiusBr;
      delete next.radiusBl;

      const orig = byId.get(layer.id);
      if (orig) {
        for (const k of EXTRA_LAYER_KEYS) {
          if (orig[k] !== undefined) next[k] = orig[k];
        }
      }
      return next as unknown as InvitationDesign["layers"][number];
    }),
  };
};

function run(
  design: InvitationDesign,
  edit: Edit
): { design: InvitationDesign; id: string | null } | null {
  if (!engine) return null;
  try {
    const out = engine.edit(asWire(design), edit);
    return { design: fromWire(out.design, design), id: out.selectedId };
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
  if (design.layers.length >= 60) return null;
  const out = run(design, {
    type: "duplicate",
    id,
    newId: freshId("copy", design.layers.length),
  });
  if (out) {
    if (!out.id) return null;
    const original = design.layers.find((l) => l.id === id);
    const extra = Object.fromEntries(
      EXTRA_LAYER_KEYS.map((key) => [key, original?.[key]])
    );
    return {
      design: {
        ...out.design,
        layers: out.design.layers.map((layer) =>
          layer.id === out.id
            ? { ...layer, ...extra, groupId: undefined }
            : layer
        ),
      },
      id: out.id,
    };
  }
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

export function alignSelection(
  design: InvitationDesign,
  ids: string[],
  how: Alignment
): InvitationDesign {
  return (
    run(design, { type: "alignSelection", ids, how })?.design ??
    alignSelectionFast(design, ids, how)
  );
}

export function distributeLayers(
  design: InvitationDesign,
  ids: string[],
  horizontal: boolean
): InvitationDesign {
  return (
    run(design, { type: "distribute", ids, horizontal })?.design ??
    distributeLayersFast(design, ids, horizontal)
  );
}

export function groupLayers(
  design: InvitationDesign,
  ids: string[],
  groupId: string
): InvitationDesign {
  return (
    run(design, { type: "group", ids, groupId })?.design ??
    groupLayersFast(design, ids, groupId)
  );
}

export function ungroupLayers(
  design: InvitationDesign,
  ids: string[]
): InvitationDesign {
  return (
    run(design, { type: "ungroup", ids })?.design ??
    ungroupLayersFast(design, ids)
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

export function resizeCanvasPxFast(
  design: InvitationDesign,
  widthPx: number,
  heightPx: number
): InvitationDesign {
  return (
    run(design, { type: "resizeCanvasPx", widthPx, heightPx })?.design ??
    resizeCanvasPx(design, widthPx, heightPx)
  );
}

export function setPaperEdgeFast(
  design: InvitationDesign,
  edgeStyle: PaperEdge,
  cornerRadiusPx?: number
): InvitationDesign {
  return (
    run(design, {
      type: "setPaperEdge",
      edgeStyle,
      cornerRadiusPx: cornerRadiusPx ?? null,
    })?.design ?? setPaperEdge(design, edgeStyle, cornerRadiusPx)
  );
}

export function nudgeFast(
  design: InvitationDesign,
  id: string,
  dxPx: number,
  dyPx: number
): InvitationDesign {
  return (
    run(design, { type: "nudge", id, dxPx, dyPx })?.design ??
    nudgeLayer(design, id, dxPx, dyPx)
  );
}

export function flipFast(
  design: InvitationDesign,
  id: string,
  horizontal: boolean
): InvitationDesign {
  return (
    run(design, { type: "flip", id, horizontal })?.design ??
    flipLayer(design, id, horizontal)
  );
}

export function pxToPctFast(px: number, totalPx: number): number {
  if (engine) {
    try {
      return engine.pxToPct(px, totalPx);
    } catch {
      /* fall through */
    }
  }
  return totalPx > 0 ? (px / totalPx) * 100 : 0;
}

export function pctToPxFast(pct: number, totalPx: number): number {
  if (engine) {
    try {
      return engine.pctToPx(pct, totalPx);
    } catch {
      /* fall through */
    }
  }
  return (pct / 100) * totalPx;
}

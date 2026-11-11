import { INVITATION_ASPECT } from "./design";
import type {
  InvitationDesign,
  InvitationLayer,
  InvitationShape,
  PaperEdge,
} from "./types";

/** Pure edits on a design, so the designer's every button can be tested without a browser. */

export interface CanvasPreset {
  label: string;
  ratio: number;
  widthPx: number;
  heightPx: number;
  note: string;
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  {
    label: "Portrait 5:7",
    ratio: 5 / 7,
    widthPx: 1080,
    heightPx: 1512,
    note: "1080 × 1512 px, stationery",
  },
  {
    label: "Standard 4:5",
    ratio: 4 / 5,
    widthPx: 1080,
    heightPx: 1350,
    note: "1080 × 1350 px, prints",
  },
  {
    label: "Square 1:1",
    ratio: 1,
    widthPx: 1080,
    heightPx: 1080,
    note: "1080 × 1080 px, square",
  },
  {
    label: "Story 9:16",
    ratio: 9 / 16,
    widthPx: 1080,
    heightPx: 1920,
    note: "1080 × 1920 px, WhatsApp",
  },
  {
    label: "Landscape 7:5",
    ratio: 7 / 5,
    widthPx: 1512,
    heightPx: 1080,
    note: "1512 × 1080 px, wide",
  },
  {
    label: "A5 Fine Art",
    ratio: 1200 / 1700,
    widthPx: 1200,
    heightPx: 1700,
    note: "1200 × 1700 px, luxury A5",
  },
];

export const DEFAULT_CANVAS_WIDTH_PX = 1080;
export const DEFAULT_CANVAS_HEIGHT_PX = 1350;

export function designDimensionsPx(design: InvitationDesign): {
  width: number;
  height: number;
} {
  const width = design.canvas?.widthPx ?? DEFAULT_CANVAS_WIDTH_PX;
  const ratio = designRatio(design);
  const height =
    design.canvas?.heightPx ?? Math.round(width / Math.max(0.1, ratio));
  return { width, height };
}

export function designRatio(design: InvitationDesign): number {
  return design.canvas?.ratio ?? INVITATION_ASPECT;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function newId(kind: string, count: number) {
  return `${kind}-${Date.now().toString(36)}-${count}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

const BASE: Omit<InvitationLayer, "id" | "kind"> = {
  text: "",
  x: 30,
  y: 30,
  width: 40,
  align: "center",
  font: "sans",
  size: 4,
  weight: 400,
  italic: false,
  tracking: 0,
  colorRole: "ink",
  color: null,
  visible: true,
};

export function createShapeLayer(
  shape: InvitationShape,
  count: number,
  ratio = INVITATION_ASPECT
): InvitationLayer {
  const id = newId("shape", count);
  if (shape === "line") {
    return {
      ...BASE,
      id,
      kind: "shape",
      shape,
      x: 20,
      y: 50,
      width: 60,
      height: 0.4,
      fill: null,
      stroke: "#b8864b",
      strokeWidth: 0.4,
      colorRole: "custom",
    };
  }
  if (shape === "arch") {
    const width = 36;
    const height = clamp(width * ratio * 1.35, 10, 80);
    return {
      ...BASE,
      id,
      kind: "shape",
      shape,
      x: 32,
      y: clamp(50 - height / 2, 0, 100 - height),
      width,
      height,
      fill: "#b8864b",
      stroke: null,
      strokeWidth: 0.4,
      radius: 18,
      colorRole: "custom",
    };
  }
  // A square box in card units: height is a share of the card's height, so convert by ratio.
  const width = 34;
  const height = clamp(width * ratio, 5, 80);
  return {
    ...BASE,
    id,
    kind: "shape",
    shape,
    x: 33,
    y: clamp(50 - height / 2, 0, 100 - height),
    width,
    height,
    fill: "#b8864b",
    stroke: null,
    strokeWidth: 0.4,
    radius: shape === "rect" ? 1.5 : 0,
    colorRole: "custom",
  };
}

export function createImageLayer(
  url: string,
  count: number,
  options: {
    ratio?: number;
    imageRatio?: number;
    fullBleed?: boolean;
    name?: string;
  } = {}
): InvitationLayer {
  const cardRatio = options.ratio ?? INVITATION_ASPECT;
  const id = newId("image", count);
  if (options.fullBleed) {
    return {
      ...BASE,
      id,
      kind: "image",
      name: options.name ?? "Your card",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      imageUrl: url,
      fit: "cover",
      radius: 0,
    };
  }
  const imageRatio = options.imageRatio ?? 1;
  const width = 50;
  // height% of card = width% of card / imageRatio, adjusted for the card's own shape.
  const height = clamp((width * cardRatio) / imageRatio, 5, 90);
  return {
    ...BASE,
    id,
    kind: "image",
    name: options.name,
    x: 25,
    y: clamp(50 - height / 2, 0, 100 - height),
    width,
    height,
    imageUrl: url,
    fit: "cover",
    radius: 0,
  };
}

export function duplicateLayer(
  design: InvitationDesign,
  id: string
): { design: InvitationDesign; id: string } | null {
  const index = design.layers.findIndex((l) => l.id === id);
  if (index < 0) return null;
  const source = design.layers[index];
  // The entry seal is the one thing a card carries once; two would draw two codes.
  if (source.kind === "code" || design.layers.length >= 60) return null;
  const copy: InvitationLayer = {
    ...source,
    id: newId(source.kind, design.layers.length),
    x: clamp(source.x + 3, 0, 100 - source.width),
    y: clamp(source.y + 3, 0, 98),
    name: source.name ? `${source.name} copy` : undefined,
    locked: false,
    groupId: undefined,
  };
  const layers = [...design.layers];
  layers.splice(index + 1, 0, copy);
  return { design: { ...design, layers }, id: copy.id };
}

export type StackMove = "front" | "back" | "up" | "down";

/** Later layers draw on top. */
export function moveLayerStack(
  design: InvitationDesign,
  id: string,
  move: StackMove
): InvitationDesign {
  const from = design.layers.findIndex((l) => l.id === id);
  if (from < 0) return design;
  const last = design.layers.length - 1;
  const to =
    move === "front"
      ? last
      : move === "back"
        ? 0
        : clamp(from + (move === "up" ? 1 : -1), 0, last);
  if (to === from) return design;
  const layers = [...design.layers];
  const [moved] = layers.splice(from, 1);
  layers.splice(to, 0, moved);
  return { ...design, layers };
}

export type Alignment =
  "left" | "centre" | "right" | "top" | "middle" | "bottom";

export function alignLayer(
  design: InvitationDesign,
  id: string,
  how: Alignment
): InvitationDesign {
  return {
    ...design,
    layers: design.layers.map((l) => {
      if (l.id !== id) return l;
      const h = l.height ?? 0;
      switch (how) {
        case "left":
          return { ...l, x: 0 };
        case "centre":
          return { ...l, x: (100 - l.width) / 2 };
        case "right":
          return { ...l, x: 100 - l.width };
        case "top":
          return { ...l, y: 0 };
        case "middle":
          return { ...l, y: clamp((100 - h) / 2, 0, 98) };
        case "bottom":
          return { ...l, y: clamp(100 - h, 0, 98) };
      }
    }),
  };
}

export function alignSelectionFast(
  design: InvitationDesign,
  ids: string[],
  how: Alignment
): InvitationDesign {
  if (!ids.length) return design;
  if (ids.length === 1) return alignLayer(design, ids[0], how);

  const selected = design.layers.filter((l) => ids.includes(l.id));
  if (!selected.length) return design;

  const minX = Math.min(...selected.map((l) => l.x));
  const maxRight = Math.max(...selected.map((l) => l.x + l.width));
  const minY = Math.min(...selected.map((l) => l.y));
  const maxBottom = Math.max(...selected.map((l) => l.y + (l.height ?? 4)));

  const boxWidth = maxRight - minX;
  const boxHeight = maxBottom - minY;

  return {
    ...design,
    layers: design.layers.map((l) => {
      if (!ids.includes(l.id)) return l;
      const h = l.height ?? 4;
      switch (how) {
        case "left":
          return { ...l, x: minX };
        case "centre":
          return { ...l, x: minX + (boxWidth - l.width) / 2 };
        case "right":
          return { ...l, x: maxRight - l.width };
        case "top":
          return { ...l, y: minY };
        case "middle":
          return { ...l, y: minY + (boxHeight - h) / 2 };
        case "bottom":
          return { ...l, y: maxBottom - h };
      }
    }),
  };
}

export function distributeLayersFast(
  design: InvitationDesign,
  ids: string[],
  horizontal: boolean
): InvitationDesign {
  if (ids.length < 3) return design;

  const indices = design.layers
    .map((l, i) => ({ i, l }))
    .filter(({ l }) => ids.includes(l.id));

  if (indices.length < 3) return design;

  const layers = [...design.layers];

  if (horizontal) {
    indices.sort((a, b) => a.l.x - b.l.x);
    const first = indices[0].l;
    const last = indices[indices.length - 1].l;
    const startX = first.x;
    const endX = last.x + last.width;
    const totalWidths = indices.reduce((sum, item) => sum + item.l.width, 0);
    const span = endX - startX;
    if (span <= totalWidths) return design;

    const gap = (span - totalWidths) / (indices.length - 1);
    let currX = startX;
    for (const { i, l } of indices) {
      layers[i] = { ...l, x: currX };
      currX += l.width + gap;
    }
  } else {
    indices.sort((a, b) => a.l.y - b.l.y);
    const first = indices[0].l;
    const last = indices[indices.length - 1].l;
    const startY = first.y;
    const lastH = last.height ?? 4;
    const endY = last.y + lastH;
    const totalHeights = indices.reduce(
      (sum, item) => sum + (item.l.height ?? 4),
      0
    );
    const span = endY - startY;
    if (span <= totalHeights) return design;

    const gap = (span - totalHeights) / (indices.length - 1);
    let currY = startY;
    for (const { i, l } of indices) {
      const h = l.height ?? 4;
      layers[i] = { ...l, y: currY };
      currY += h + gap;
    }
  }

  return { ...design, layers };
}

export function groupLayersFast(
  design: InvitationDesign,
  ids: string[],
  groupId: string
): InvitationDesign {
  return {
    ...design,
    layers: design.layers.map((l) =>
      ids.includes(l.id) ? { ...l, groupId } : l
    ),
  };
}

export function ungroupLayersFast(
  design: InvitationDesign,
  ids: string[]
): InvitationDesign {
  return {
    ...design,
    layers: design.layers.map((l) =>
      ids.includes(l.id) ? { ...l, groupId: undefined } : l
    ),
  };
}

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The narrowest a box can be (the server refuses less) and the shortest a drag can make it. */
const MIN_W = 5;
const MIN_H = 1;

/**
 * Drags one handle by (dx, dy) percent of the card. Corner handles keep the box's shape when
 * `keepShape` is set. Rotation is ignored here: the box is resized in its own unrotated frame.
 */
export function resizeBox(
  start: Box,
  handle: Handle,
  dx: number,
  dy: number,
  keepShape = false
): Box {
  let { x, y, width, height } = start;
  const right = x + width;
  const bottom = y + height;
  if (handle.includes("w")) {
    x += dx;
    width = right - x;
    if (width < MIN_W) {
      width = MIN_W;
      x = right - width;
    }
    if (width > 1000) {
      width = 1000;
      x = right - width;
    }
  }
  if (handle.includes("e")) {
    width = clamp(width + dx, MIN_W, 1000);
  }
  if (handle.includes("n")) {
    y += dy;
    height = bottom - y;
    if (height < MIN_H) {
      height = MIN_H;
      y = bottom - height;
    }
    if (height > 1000) {
      height = 1000;
      y = bottom - height;
    }
  }
  if (handle.includes("s")) {
    height = clamp(height + dy, MIN_H, 1000);
  }
  if (keepShape && start.height > 0 && start.width > 0) {
    const aspect = start.width / start.height;
    const useWidth = handle.includes("e") || handle.includes("w");
    const widthDrives =
      useWidth &&
      (handle.length !== 2 ||
        Math.abs(dx / start.width) >= Math.abs(dy / start.height));
    if (widthDrives) {
      width = clamp(
        width,
        Math.max(MIN_W, MIN_H * aspect),
        Math.min(1000, 1000 * aspect)
      );
      height = width / aspect;
    } else {
      height = clamp(
        height,
        Math.max(MIN_H, MIN_W / aspect),
        Math.min(1000, 1000 / aspect)
      );
      width = height * aspect;
    }
    x = handle.includes("w")
      ? right - width
      : !useWidth
        ? start.x + (start.width - width) / 2
        : start.x;
    y = handle.includes("n")
      ? bottom - height
      : !handle.includes("s")
        ? start.y + (start.height - height) / 2
        : start.y;
  }
  return { x, y, width, height };
}

/** Snaps a rotation to 15 degree steps when close, so a card can be set straight by hand. */
export function snapRotation(degrees: number): number {
  let d = ((((degrees + 180) % 360) + 360) % 360) - 180;
  const nearest = Math.round(d / 15) * 15;
  if (Math.abs(d - nearest) < 4) d = nearest;
  return Math.round(d * 10) / 10;
}

/**
 * Makes an imported card the whole design: the picture fills the card, the card takes the
 * picture's shape, and the house decoration steps aside. The host's words stay in the document
 * but hidden, so they can bring back the ones they want. The entry seal is kept as it was.
 */
export function applyImportedCard(
  design: InvitationDesign,
  url: string,
  imageRatio: number
): InvitationDesign {
  const ratio = clamp(imageRatio, 0.4, 2.5);
  const kept = design.layers
    .filter((l) => !(l.kind === "image" && l.name === "Your card"))
    .map((l) => (l.kind === "code" ? l : { ...l, visible: false }));
  return {
    ...design,
    canvas: { ratio },
    chrome: false,
    layers: [
      createImageLayer(url, kept.length, { fullBleed: true, ratio }),
      ...kept,
    ],
  };
}

/** Which layers can the canvas move? Locked and hidden ones are left alone. */
export function isEditable(layer: InvitationLayer): boolean {
  return layer.visible && !layer.locked;
}

/** Puts the host's own design back after an imported card is taken off. */
export function removeImportedCard(design: InvitationDesign): InvitationDesign {
  if (
    !design.layers.some((l) => l.kind === "image" && l.name === "Your card")
  ) {
    return design;
  }
  const { canvas: _canvas, ...rest } = design;
  void _canvas;
  return {
    ...rest,
    chrome: true,
    layers: design.layers
      .filter((l) => !(l.kind === "image" && l.name === "Your card"))
      .map((l) =>
        l.visible || l.kind === "code"
          ? l
          : {
              ...l,
              visible:
                l.text.trim().length > 0 ||
                l.kind === "divider" ||
                l.kind === "seal",
            }
      ),
  };
}

export function hasImportedCard(design: InvitationDesign): boolean {
  return design.layers.some(
    (l) => l.kind === "image" && l.name === "Your card"
  );
}

export function resizeCanvasPx(
  design: InvitationDesign,
  widthPx: number,
  heightPx: number
): InvitationDesign {
  let w = Math.round(clamp(widthPx, 200, 10000));
  let h = Math.round(clamp(heightPx, 200, 10000));
  const previous = designDimensionsPx(design);
  const safeRatio = clamp(w / h, 0.4, 2.5);
  if (safeRatio !== w / h) {
    if (h !== previous.height && w === previous.width)
      w = Math.round(h * safeRatio);
    else h = Math.round(w / safeRatio);
  }
  const ratio = clamp(Math.round((w / h) * 1000) / 1000, 0.4, 2.5);
  return {
    ...design,
    canvas: {
      ...design.canvas,
      ratio,
      widthPx: w,
      heightPx: h,
    },
  };
}

export function setPaperEdge(
  design: InvitationDesign,
  edgeStyle: PaperEdge,
  cornerRadiusPx?: number
): InvitationDesign {
  const dims = designDimensionsPx(design);
  const radius =
    edgeStyle === "sharp"
      ? 0
      : edgeStyle === "rounded"
        ? Math.min(500, Math.max(0, cornerRadiusPx ?? 16))
        : 0;
  return {
    ...design,
    canvas: {
      ...design.canvas,
      ratio: designRatio(design),
      widthPx: dims.width,
      heightPx: dims.height,
      edgeStyle,
      cornerRadiusPx: radius,
    },
  };
}

export function nudgeLayer(
  design: InvitationDesign,
  id: string,
  dxPx: number,
  dyPx: number
): InvitationDesign {
  const { width: wPx, height: hPx } = designDimensionsPx(design);
  const dxPct = wPx > 0 ? (dxPx / wPx) * 100 : 0;
  const dyPct = hPx > 0 ? (dyPx / hPx) * 100 : 0;
  return {
    ...design,
    layers: design.layers.map((l) => {
      if (l.id !== id || !isEditable(l)) return l;
      const maxX = clamp(100 - l.width, 0, 100);
      const maxY = clamp(100 - (l.height ?? 5), 0, 100);
      return {
        ...l,
        x: clamp(Math.round((l.x + dxPct) * 100) / 100, 0, maxX),
        y: clamp(Math.round((l.y + dyPct) * 100) / 100, 0, maxY),
      };
    }),
  };
}

export function flipLayer(
  design: InvitationDesign,
  id: string,
  horizontal: boolean
): InvitationDesign {
  return {
    ...design,
    layers: design.layers.map((l) => {
      if (l.id !== id || !isEditable(l)) return l;
      const current = l.rotation ?? 0;
      const next = horizontal ? -current : 180 - current;
      return {
        ...l,
        rotation: snapRotation(next),
      };
    }),
  };
}

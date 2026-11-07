import { INVITATION_ASPECT } from "./design";
import type {
  InvitationDesign,
  InvitationLayer,
  InvitationShape,
} from "./types";

/** Pure edits on a design, so the designer's every button can be tested without a browser. */

export const CANVAS_PRESETS: { label: string; ratio: number; note: string }[] =
  [
    {
      label: "Portrait card",
      ratio: 5 / 7,
      note: "5 : 7, like printed stationery",
    },
    { label: "Square", ratio: 1, note: "1 : 1, for sharing" },
    { label: "Landscape", ratio: 7 / 5, note: "7 : 5" },
    { label: "Phone story", ratio: 9 / 16, note: "9 : 16, WhatsApp status" },
    { label: "Tall banner", ratio: 4 / 5, note: "4 : 5" },
  ];

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
  if (source.kind === "code") return null;
  const copy: InvitationLayer = {
    ...source,
    id: newId(source.kind, design.layers.length),
    x: clamp(source.x + 3, 0, 100 - source.width),
    y: clamp(source.y + 3, 0, 98),
    name: source.name ? `${source.name} copy` : undefined,
    locked: false,
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

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_BOX = 2;

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
    x = clamp(x + dx, 0, right - MIN_BOX);
    width = right - x;
  }
  if (handle.includes("e")) {
    width = clamp(width + dx, MIN_BOX, 100 - x);
  }
  if (handle.includes("n")) {
    y = clamp(y + dy, 0, bottom - MIN_BOX);
    height = bottom - y;
  }
  if (handle.includes("s")) {
    height = clamp(height + dy, MIN_BOX, 100 - y);
  }
  if (keepShape && handle.length === 2 && start.height > 0) {
    const aspect = start.width / start.height;
    const byWidth = width / aspect;
    if (Math.abs(byWidth - height) > 0.01) {
      height = clamp(byWidth, MIN_BOX, 100);
      if (handle.includes("n")) y = bottom - height;
    }
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

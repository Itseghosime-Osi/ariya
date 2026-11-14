import { drawnLayerColour } from "./design";
import { designRatio } from "./layer-ops";
import { estimateText, type TextEstimate } from "./text-fit";
import type { InvitationDesign, InvitationLayer } from "./types";

/**
 * A server-side look at a card the way a careful designer would glance at it: words that run off
 * the card or into each other, names squeezed small to fit, text that is hard to read against what
 * sits behind it. Text sizes are estimated from measured font widths, not drawn, so every finding
 * says what it saw in numbers a connected AI can act on (move a layer, widen it, change a colour).
 */

export type LayoutIssueKind =
  | "off_card"
  | "overlap"
  | "shrunk_to_fit"
  | "too_long"
  | "low_contrast"
  | "tiny_text"
  | "empty_text";

export type LayoutIssueSeverity = "problem" | "warning" | "note";

export interface LayoutIssue {
  kind: LayoutIssueKind;
  severity: LayoutIssueSeverity;
  /** The layer (or layers, for an overlap) the finding is about. */
  layerIds: string[];
  message: string;
  /** What would fix it, in the terms the edit tools take. */
  suggestion?: string;
  /** For low contrast: the shape the words sit on, when it is not the card itself. */
  behindLayerId?: string;
}

/** A layer's box on the card, every edge in percent of the card (x of its width, y of its height). */
export interface LayerBox {
  id: string;
  kind: InvitationLayer["kind"];
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LayoutCheck {
  ok: boolean;
  counts: Record<LayoutIssueSeverity, number>;
  issues: LayoutIssue[];
  /** Where each visible layer lands, so an AI can see the free space before moving things. */
  boxes: (LayerBox & { lines?: number; fitScale?: number })[];
  notes: string[];
}

const TEXT_KINDS = new Set<InvitationLayer["kind"]>([
  "kicker",
  "names",
  "message",
  "date",
  "venue",
  "dressCode",
  "footer",
  "text",
]);

export function isTextLayer(layer: InvitationLayer): boolean {
  return TEXT_KINDS.has(layer.kind);
}

/** Edges inside this much of the card edge are fine: a hairline is not a finding. */
const EDGE_TOLERANCE = 0.5;
/** Two boxes must share at least this much height and width (percent) to count as touching. */
const OVERLAP_MIN = 0.6;
/** Below this many cqw a word is hard to read on a phone (about 6px on a 360px-wide screen). */
const TINY_TEXT_CQW = 1.7;
/** WCAG contrast thresholds: large text may be lighter than body text. */
const CONTRAST_BODY = 4.5;
const CONTRAST_LARGE = 3;
/** Text at or above this size (cqw) counts as large for contrast. */
const LARGE_TEXT_CQW = 4.5;

const round = (value: number) => Math.round(value * 10) / 10;

function textBox(layer: InvitationLayer, estimate: TextEstimate): LayerBox {
  // The box is as wide as the layer; the words sit inside it by their alignment.
  const ink = Math.min(layer.width, estimate.inkWidth);
  const left =
    layer.align === "left"
      ? layer.x
      : layer.align === "right"
        ? layer.x + layer.width - ink
        : layer.x + (layer.width - ink) / 2;
  return {
    id: layer.id,
    kind: layer.kind,
    left,
    right: left + ink,
    top: layer.y,
    bottom: layer.y + estimate.height,
  };
}

function shapeBox(layer: InvitationLayer, ratio: number): LayerBox {
  let width = layer.width;
  let height: number;
  switch (layer.kind) {
    case "seal":
      height = width * ratio;
      break;
    case "code":
      width = Math.max(width, 16);
      height = width * ratio;
      break;
    case "divider":
      height = 2 * ratio;
      break;
    case "image":
      height = layer.height ?? 30;
      break;
    default:
      height = layer.height ?? 20;
  }
  return {
    id: layer.id,
    kind: layer.kind,
    left: layer.x,
    top: layer.y,
    right: layer.x + width,
    bottom: layer.y + height,
  };
}

function overlapOf(a: LayerBox, b: LayerBox): { w: number; h: number } {
  return {
    w: Math.min(a.right, b.right) - Math.max(a.left, b.left),
    h: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top),
  };
}

function contains(outer: LayerBox, inner: LayerBox): boolean {
  return (
    inner.left >= outer.left - EDGE_TOLERANCE &&
    inner.right <= outer.right + EDGE_TOLERANCE &&
    inner.top >= outer.top - EDGE_TOLERANCE &&
    inner.bottom <= outer.bottom + EDGE_TOLERANCE
  );
}

/** `#rgb`, `#rrggbb` or `#rrggbbaa` to 0–255 channels; anything else is unknown. */
export function parseHex(
  colour: string | null | undefined
): [number, number, number] | null {
  if (!colour) return null;
  const hex = colour.trim().replace(/^#/, "");
  if (!/^[0-9a-f]+$/i.test(hex)) return null;
  if (hex.length === 3 || hex.length === 4) {
    return [0, 1, 2].map((i) => parseInt(hex[i] + hex[i], 16)) as [
      number,
      number,
      number,
    ];
  }
  if (hex.length === 6 || hex.length === 8) {
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
      number,
      number,
      number,
    ];
  }
  return null;
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const la = luminance(ca);
  const lb = luminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The flat colour behind the card's words, or null when it is a picture. */
function cardSurface(design: InvitationDesign): string | null {
  const { background, palette } = design;
  if (background.kind === "color" && background.color) return background.color;
  if (background.kind === "velvet") return palette.stageFrom;
  if (background.kind === "image" && background.imageUrl) {
    // A strong paper tint over the picture reads as paper.
    return background.overlay >= 0.75 ? palette.paper : null;
  }
  return palette.paper;
}

function labelOf(layer: InvitationLayer): string {
  return layer.name?.trim() || layer.kind;
}

export function checkInvitationLayout(design: InvitationDesign): LayoutCheck {
  const ratio = designRatio(design);
  const issues: LayoutIssue[] = [];
  const notes: string[] = [
    "Text sizes are estimated from measured font widths, so a line count can be off by one for text that only just fits. The studio draws the card exactly.",
  ];

  const visible = design.layers
    .map((layer, order) => ({ layer, order }))
    .filter(({ layer }) => layer.visible);

  const boxes: LayoutCheck["boxes"] = [];
  const text: {
    layer: InvitationLayer;
    box: LayerBox;
    order: number;
    estimate: TextEstimate;
  }[] = [];
  const solid: { layer: InvitationLayer; box: LayerBox; order: number }[] = [];

  for (const { layer, order } of visible) {
    if (isTextLayer(layer)) {
      if (!layer.text.trim()) {
        issues.push({
          kind: "empty_text",
          severity: "note",
          layerIds: [layer.id],
          message: `"${labelOf(layer)}" is shown but has no words.`,
          suggestion: "Give it words, or hide it.",
        });
        continue;
      }
      const estimate = estimateText(layer, ratio);
      const box = textBox(layer, estimate);
      boxes.push({ ...box, lines: estimate.lines, fitScale: estimate.scale });
      text.push({ layer, box, order, estimate });

      if (estimate.overflowsAtSmallest) {
        issues.push({
          kind: "too_long",
          severity: "problem",
          layerIds: [layer.id],
          message: `"${labelOf(layer)}" needs about ${estimate.lines} lines even at the smallest size, where only ${estimate.maxLines} are allowed, so it spills into what is below it.`,
          suggestion:
            'Shorten the words, widen the layer, or let the box grow (textFit "grow") and move what is below it down.',
        });
      } else if (estimate.scale < 1) {
        const percent = Math.round(estimate.scale * 100);
        issues.push({
          kind: "shrunk_to_fit",
          severity: estimate.scale < 0.7 ? "warning" : "note",
          layerIds: [layer.id],
          message: `"${labelOf(layer)}" is shrunk to about ${percent}% of its size to keep to ${estimate.maxLines} lines.`,
          suggestion:
            estimate.scale < 0.7
              ? "Widen the layer or use a narrower font so it can stay larger."
              : undefined,
        });
      }

      const drawn = layer.size * estimate.scale;
      if (drawn < TINY_TEXT_CQW) {
        issues.push({
          kind: "tiny_text",
          severity: "warning",
          layerIds: [layer.id],
          message: `"${labelOf(layer)}" is drawn at about ${round(drawn)} (percent of the card's width), which is hard to read on a phone.`,
          suggestion: `Use a size of at least ${TINY_TEXT_CQW}.`,
        });
      }
    } else {
      const box = shapeBox(layer, ratio);
      boxes.push(box);
      solid.push({ layer, box, order });
    }
  }

  // Off the card. Rotated layers are checked as if upright.
  for (const box of boxes) {
    const out =
      box.left < -EDGE_TOLERANCE ||
      box.top < -EDGE_TOLERANCE ||
      box.right > 100 + EDGE_TOLERANCE ||
      box.bottom > 100 + EDGE_TOLERANCE;
    if (!out) continue;
    const layer = design.layers.find((item) => item.id === box.id);
    // Background shapes and pictures often bleed off the edge on purpose.
    const decorative = box.kind === "shape" || box.kind === "image";
    issues.push({
      kind: "off_card",
      severity: decorative ? "note" : "problem",
      layerIds: [box.id],
      message: `"${layer ? labelOf(layer) : box.id}" runs past the card's edge (left ${round(box.left)}, top ${round(box.top)}, right ${round(box.right)}, bottom ${round(box.bottom)}; the card is 0 to 100 both ways).`,
      suggestion: decorative
        ? "Fine if it is meant to bleed off the edge."
        : "Move it inside the card or make it narrower.",
    });
  }

  // Words running into words, into the gold rule, or into the entry seal guests scan.
  const blockers = [
    ...text.map((item) => ({ ...item, isText: true })),
    ...solid
      .filter(
        (item) =>
          item.layer.kind === "code" ||
          item.layer.kind === "divider" ||
          item.layer.kind === "seal"
      )
      .map((item) => ({ ...item, isText: false })),
  ];
  for (let i = 0; i < blockers.length; i++) {
    for (let j = i + 1; j < blockers.length; j++) {
      const a = blockers[i];
      const b = blockers[j];
      if (!a.isText && !b.isText) continue;
      if (a.layer.groupId && a.layer.groupId === b.layer.groupId) continue;
      const { w, h } = overlapOf(a.box, b.box);
      if (w < OVERLAP_MIN || h < OVERLAP_MIN) continue;
      const seal = a.layer.kind === "code" || b.layer.kind === "code";
      issues.push({
        kind: "overlap",
        severity: seal ? "problem" : "warning",
        layerIds: [a.layer.id, b.layer.id],
        message: `"${labelOf(a.layer)}" and "${labelOf(b.layer)}" overlap by about ${round(h)}% of the card's height${seal ? "; the entry seal must stay clear so it scans" : ""}.`,
        suggestion: `Move one of them by at least ${round(h + 1)} (y is percent of the card's height), or make one smaller.`,
      });
    }
  }

  // Contrast against whatever is directly behind the words.
  const surface = cardSurface(design);
  let skippedOverPicture = false;
  for (const item of text) {
    const below = solid
      .filter(
        (s) =>
          s.order < item.order &&
          s.layer.kind === "shape" &&
          (s.layer.opacity ?? 1) >= 0.85 &&
          parseHex(s.layer.fill) &&
          contains(s.box, item.box)
      )
      .at(-1);
    const overPicture = solid.some(
      (s) =>
        s.order < item.order &&
        s.layer.kind === "image" &&
        (s.layer.opacity ?? 1) >= 0.5 &&
        overlapOf(s.box, item.box).w > 0 &&
        overlapOf(s.box, item.box).h > 0
    );
    const behind = below?.layer.fill ?? (overPicture ? null : surface);
    if (!behind) {
      skippedOverPicture = true;
      continue;
    }
    const colour = drawnLayerColour(item.layer, design);
    const contrast = contrastRatio(colour, behind);
    if (contrast === null) continue;
    const large =
      item.layer.size * item.estimate.scale >= LARGE_TEXT_CQW ||
      (item.layer.weight >= 700 && item.layer.size >= 3.5);
    const needed = large ? CONTRAST_LARGE : CONTRAST_BODY;
    if (contrast >= needed) continue;
    issues.push({
      kind: "low_contrast",
      ...(below ? { behindLayerId: below.layer.id } : {}),
      severity: contrast < CONTRAST_LARGE ? "problem" : "warning",
      layerIds: [item.layer.id],
      message: `"${labelOf(item.layer)}" (${colour}) on ${below ? `the shape "${labelOf(below.layer)}"` : "the card"} (${behind}) has a contrast of ${round(contrast)}:1; ${needed}:1 is the least for ${large ? "large" : "body"} text.`,
      suggestion:
        'Use a darker colour on a light card or a lighter one on a dark card (colorRole "ink" or "title" usually reads well).',
    });
  }
  if (skippedOverPicture) {
    notes.push(
      "Contrast was not checked for words over a picture; look at the card to judge those."
    );
  }

  const order: Record<LayoutIssueSeverity, number> = {
    problem: 0,
    warning: 1,
    note: 2,
  };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  const counts = { problem: 0, warning: 0, note: 0 };
  for (const issue of issues) counts[issue.severity] += 1;

  return {
    ok: counts.problem === 0 && counts.warning === 0,
    counts,
    issues,
    boxes: boxes.map((box) => ({
      ...box,
      left: round(box.left),
      top: round(box.top),
      right: round(box.right),
      bottom: round(box.bottom),
    })),
    notes,
  };
}

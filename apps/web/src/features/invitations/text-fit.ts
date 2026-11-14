import type { InvitationFont, InvitationLayer } from "./types";

/**
 * The most lines each kind of text may take before it shrinks. Chosen above what the built-in
 * templates use, so a normal card is never touched and only very long words are fitted.
 *
 * Lives outside the card component so the server (the layout checker a connected AI calls) uses
 * the very same rule the card draws with.
 */
export const MAX_LINES: Partial<Record<InvitationLayer["kind"], number>> = {
  kicker: 2,
  names: 2,
  message: 3,
  date: 2,
  venue: 3,
  dressCode: 2,
  footer: 2,
};

/** The card never shrinks words below this share of their set size. */
export const MIN_FIT_SCALE = 0.45;
/** Each fitting step takes this much off the size, as the card does. */
export const FIT_STEP = 0.07;
export const DEFAULT_LINE_HEIGHT = 1.35;

/**
 * Lines a layer may take before its words shrink. Auto follows the kind's own rule; "shrink" fits
 * every kind (two lines where the kind has no rule); "grow" never shrinks, the box grows instead.
 */
export function linesFor(layer: InvitationLayer): number | undefined {
  if (layer.textFit === "grow") return undefined;
  if (layer.textFit === "shrink") return MAX_LINES[layer.kind] ?? 2;
  return MAX_LINES[layer.kind];
}

/** Whether the card draws this layer's words in capitals. */
export function isUppercase(layer: InvitationLayer): boolean {
  if (layer.textTransform) return layer.textTransform === "uppercase";
  return layer.kind === "kicker" || layer.kind === "footer";
}

/**
 * Average character width as a share of the font size, measured in a browser with the card's own
 * fonts over mixed wedding text (names, dates, venues). Good to a few percent for a line, which is
 * what a line count needs; it is an estimate, never a substitute for the card itself.
 */
const CHAR_WIDTH: Record<
  InvitationFont,
  { regular: number; bold: number; upper: number }
> = {
  script: { regular: 0.326, bold: 0.34, upper: 0.777 },
  serif: { regular: 0.423, bold: 0.447, upper: 0.601 },
  mono: { regular: 0.6, bold: 0.6, upper: 0.6 },
  display: { regular: 0.479, bold: 0.505, upper: 0.613 },
  sans: { regular: 0.482, bold: 0.498, upper: 0.572 },
};

/** A space is narrower than an average letter in every one of the card's fonts. */
const SPACE_SHARE = 0.55;

function charWidth(layer: InvitationLayer, upper: boolean): number {
  const widths = CHAR_WIDTH[layer.font] ?? CHAR_WIDTH.sans;
  if (upper) return widths.upper;
  return layer.weight >= 600 ? widths.bold : widths.regular;
}

/** Width of a run of characters in card-width percent (cqw) at a given font size. */
function runWidth(
  text: string,
  layer: InvitationLayer,
  size: number,
  upper: boolean
): number {
  const per = charWidth(layer, upper) + layer.tracking;
  let units = 0;
  for (const char of text) units += char === " " ? SPACE_SHARE : 1;
  return units * per * size;
}

export interface TextEstimate {
  /** Lines the words take at the size the card ends up drawing them. */
  lines: number;
  /** Share of the set size the card draws them at (1 = not shrunk). */
  scale: number;
  /** Widest line, in percent of the card's width. */
  inkWidth: number;
  /** Height of the words, in percent of the card's height. */
  height: number;
  /** True when the words still take more lines than allowed at the smallest size. */
  overflowsAtSmallest: boolean;
  maxLines?: number;
}

function wrap(
  layer: InvitationLayer,
  size: number,
  upper: boolean
): { lines: number; inkWidth: number } {
  const box = Math.max(0.1, layer.width);
  const text = upper ? layer.text.toUpperCase() : layer.text;
  let lines = 0;
  let inkWidth = 0;

  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/ +/).filter(Boolean);
    if (words.length === 0) {
      lines += 1;
      continue;
    }
    let current = 0;
    let started = false;
    for (const word of words) {
      const wordWidth = runWidth(word, layer, size, upper);
      const space = started ? runWidth(" ", layer, size, upper) : 0;
      if (started && current + space + wordWidth <= box) {
        current += space + wordWidth;
        continue;
      }
      if (started) {
        lines += 1;
        inkWidth = Math.max(inkWidth, current);
      }
      // A word wider than the box breaks anywhere, as the card's overflow-wrap does.
      if (wordWidth > box) {
        const pieces = Math.ceil(wordWidth / box);
        lines += pieces - 1;
        inkWidth = box;
        current = wordWidth - (pieces - 1) * box;
      } else {
        current = wordWidth;
      }
      started = true;
    }
    lines += 1;
    inkWidth = Math.max(inkWidth, current);
  }

  return { lines, inkWidth: Math.min(box, inkWidth) };
}

/**
 * Estimates how a text layer lands on a card of the given width-to-height ratio, following the
 * card's own fitting: shrink in steps until the words fit their lines or reach the smallest size.
 */
export function estimateText(
  layer: InvitationLayer,
  ratio: number
): TextEstimate {
  const upper = isUppercase(layer);
  const maxLines = linesFor(layer);
  const lineHeight = layer.lineHeight ?? DEFAULT_LINE_HEIGHT;

  let scale = 1;
  let result = wrap(layer, layer.size, upper);
  if (maxLines) {
    for (let i = 0; i < 10 && scale > MIN_FIT_SCALE; i++) {
      if (result.lines <= maxLines) break;
      scale = Math.max(MIN_FIT_SCALE, scale - FIT_STEP);
      result = wrap(layer, layer.size * scale, upper);
    }
  }

  // One cqw is 1% of the card's width, which is `ratio` percent of its height.
  const height = result.lines * layer.size * scale * lineHeight * ratio;

  return {
    lines: result.lines,
    scale: Math.round(scale * 100) / 100,
    inkWidth: result.inkWidth,
    height,
    overflowsAtSmallest: Boolean(maxLines && result.lines > maxLines),
    ...(maxLines ? { maxLines } : {}),
  };
}

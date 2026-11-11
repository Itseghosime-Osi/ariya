import type { TableShape, TableWithGuests } from "../types";
import {
  type SeatKind,
  type StageItem,
  type ZoneKind,
  type ZoneShape,
} from "./model";

export type Positions = Record<string, { x: number; y: number }>;
export type Deck =
  | "guests"
  | "room"
  | "fit"
  | "seat"
  | "decor"
  | "thermal"
  | "catering"
  | "risk";
export type Flyout = "table" | "chair" | "zone" | null;
export type Move = { type: string; id: string; x: number; y: number };

export const TABLE_PRESETS: {
  key: string;
  label: string;
  shape: TableShape;
  capacity: number;
}[] = [
  { key: "r10", label: "Round 10", shape: "round", capacity: 10 },
  { key: "r8", label: "Round 8", shape: "round", capacity: 8 },
  { key: "r12", label: "Round 12", shape: "round", capacity: 12 },
  { key: "r6", label: "Round 6", shape: "round", capacity: 6 },
  { key: "b8", label: "Banquet 8", shape: "rectangular", capacity: 8 },
  { key: "b10", label: "Banquet 10", shape: "rectangular", capacity: 10 },
  { key: "o10", label: "Oval 10", shape: "oval", capacity: 10 },
  { key: "s4", label: "Cocktail 4", shape: "round", capacity: 4 },
  { key: "h8", label: "High table 8", shape: "head", capacity: 8 },
];

export const ZONE_GALLERY: {
  kind: ZoneKind;
  label: string;
  shape?: ZoneShape;
  w?: number;
  h?: number;
}[] = [
  { kind: "stage", label: "Stage" },
  { kind: "dance", label: "Round dance floor", shape: "round", w: 7, h: 7 },
  { kind: "dance", label: "Square dance floor", shape: "rect", w: 7, h: 7 },
  { kind: "dance", label: "Heart dance floor", shape: "heart", w: 7, h: 6.4 },
  { kind: "dance", label: "Hexagon dance floor", shape: "hexagon", w: 7, h: 7 },
  { kind: "buffet", label: "Buffet" },
  { kind: "bar", label: "Drinks bar" },
  { kind: "dj", label: "DJ & MC" },
  { kind: "cake", label: "Cake table", shape: "round" },
  { kind: "entrance", label: "Entrance arch" },
  { kind: "photo", label: "Flower wall" },
  { kind: "gifts", label: "Gifts table" },
  { kind: "pillar", label: "Pillar", shape: "round" },
  { kind: "custom", label: "Custom table", w: 1.8, h: 0.9 },
  { kind: "custom", label: "Custom item", w: 1.2, h: 1.2 },
];

export const CHAIR_GROUPS: {
  key: string;
  label: string;
  n: number;
  spacing: number;
  seat?: SeatKind;
}[] = [
  { key: "one", label: "One chair", n: 1, spacing: 0 },
  { key: "two", label: "Couple’s chairs", n: 2, spacing: 0.7, seat: "couple" },
  { key: "row", label: "Row of 6", n: 6, spacing: 0.55 },
  { key: "row12", label: "Row of 12", n: 12, spacing: 0.55 },
  {
    key: "celebrant",
    label: "Celebrant’s chair",
    n: 1,
    spacing: 0,
    seat: "celebrant",
  },
  { key: "couch", label: "Couch (two seats)", n: 1, spacing: 0, seat: "couch" },
];

/** Rows of tables, so a host can lay out a block without placing each one. */
export const TABLE_ROWS: {
  key: string;
  label: string;
  n: number;
  perRow: number;
}[] = [
  { key: "r3", label: "Row of 3", n: 3, perRow: 3 },
  { key: "r4", label: "Row of 4", n: 4, perRow: 4 },
  { key: "r6", label: "Row of 6", n: 6, perRow: 6 },
  { key: "block6", label: "2 rows of 3", n: 6, perRow: 3 },
  { key: "block12", label: "3 rows of 4", n: 12, perRow: 4 },
];

/** The words a host would use, for the line that confirms what was just added. */
export const STAGE_ITEM_WORD: Record<StageItem["kind"], string> = {
  podium: "A podium",
  lectern: "A lectern",
  arch: "An arch",
  couch: "A couch",
  table: "A table",
  cake: "A cake table",
  screen: "A screen",
};

export function nextTableNames(
  tables: TableWithGuests[],
  count: number
): string[] {
  let n = 0;
  for (const t of tables) {
    const m = /^table\s+(\d+)$/i.exec(t.name.trim());
    if (m) n = Math.max(n, Number(m[1]));
  }
  return Array.from(
    { length: count },
    (_, i) => `Table ${String(n + i + 1).padStart(2, "0")}`
  );
}

export const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement &&
  (el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable);

/**
 * The hall studio: a realistic 3D hall on an endless board, a floating tool rail to add tables,
 * chairs and areas, an inspector to design whatever is selected, and a deck of planning tools
 * (guests, room, fit, seat, décor) on the side.
 */
/** The planning tools, grouped the way a host thinks about the day. */
export const TOOL_GROUPS: { label: string; keys: Deck[] }[] = [
  { label: "Design", keys: ["room", "fit", "decor"] },
  { label: "Seat", keys: ["guests", "seat"] },
  { label: "Plan", keys: ["catering", "thermal", "risk"] },
];

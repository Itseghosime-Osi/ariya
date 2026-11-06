import type { TableWithGuests } from "../types";
import {
  LAYER_STATE_MAX,
  ZONE_DEFAULTS,
  type FreeChair,
  type HallLayout,
  type SeatKind,
  type StageItem,
} from "./model";
import { unitsOf } from "./thermal";

/**
 * The layers panel's model: every object in the hall as a named row, grouped the way a design
 * program groups them. Pure, so the order, the default names and the rename rules are tested
 * without a browser.
 */

export type LayerKind = "table" | "zone" | "chair" | "stageItem" | "ac";
export type LayerGroupKey = "areas" | "tables" | "chairs" | "cooling";

export interface LayerRow {
  /** Unique across the panel: `kind:id`. */
  key: string;
  kind: LayerKind;
  id: string;
  /** What the panel shows: the host's name, or a default numbered name. */
  name: string;
  /** Whether the host has named it, so the panel can offer "back to the default name". */
  named: boolean;
  /** A short second line: seats filled, size, what a fixture stands on. */
  detail?: string;
  /** A fixture's stage: it sits indented under it and selecting it selects the stage. */
  stageId?: string;
  /** Whether the panel can rename it (cooling units are numbered, not named). */
  renamable: boolean;
  /** Hidden from the hall, by its own switch or because its stage is hidden. */
  hidden: boolean;
  /** Hidden only because the stage it stands on is: it follows the stage's switch. */
  hiddenByStage: boolean;
  /** Kept from being dragged on the canvas. */
  locked: boolean;
}

export interface LayerGroup {
  key: LayerGroupKey;
  label: string;
  rows: LayerRow[];
}

export const LAYER_NAME_MAX = 60;

const SEAT_WORD: Record<SeatKind, string> = {
  guest: "Guest chair",
  couple: "Couple’s chair",
  celebrant: "Celebrant’s chair",
  couch: "Couch",
};

export const STAGE_ITEM_WORD: Record<StageItem["kind"], string> = {
  podium: "Podium",
  lectern: "Lectern",
  arch: "Arch",
  couch: "Couch",
  table: "Table",
  cake: "Cake table",
  screen: "Screen",
};

/** The default name of the nth chair of its kind, counted in layout order. */
export function chairDefaultName(
  chair: Pick<FreeChair, "seat">,
  nth: number
): string {
  return `${SEAT_WORD[chair.seat ?? "guest"]} ${nth}`;
}

export function buildLayers(
  layout: HallLayout,
  tables: Pick<TableWithGuests, "id" | "name" | "capacity" | "occupiedSeats">[]
): LayerGroup[] {
  const areas: Bare[] = [];
  for (const z of layout.zones) {
    areas.push({
      key: `zone:${z.id}`,
      kind: "zone",
      id: z.id,
      name: z.label || ZONE_DEFAULTS[z.kind].label,
      named: Boolean(z.label) && z.label !== ZONE_DEFAULTS[z.kind].label,
      detail: `${round1(z.w)} × ${round1(z.h)} m`,
      renamable: true,
    });
    for (const item of layout.stageItems.filter((s) => s.stageId === z.id)) {
      areas.push({
        key: `stageItem:${item.id}`,
        kind: "stageItem",
        id: item.id,
        name: item.label || STAGE_ITEM_WORD[item.kind],
        named: Boolean(item.label),
        detail: "On the stage",
        stageId: z.id,
        renamable: true,
      });
    }
  }

  const tableRows: Bare[] = tables.map((t) => ({
    key: `table:${t.id}`,
    kind: "table",
    id: t.id,
    name: t.name,
    named: true,
    detail: `${t.occupiedSeats} of ${t.capacity} seated`,
    renamable: true,
  }));

  const seen: Record<string, number> = {};
  const chairRows: Bare[] = layout.chairs.map((c) => {
    const kind = c.seat ?? "guest";
    seen[kind] = (seen[kind] ?? 0) + 1;
    return {
      key: `chair:${c.id}`,
      kind: "chair",
      id: c.id,
      name: c.label || chairDefaultName(c, seen[kind]),
      named: Boolean(c.label),
      detail: c.stageId ? "On the stage" : undefined,
      renamable: true,
    };
  });

  const coolingRows: Bare[] = unitsOf(layout).map((u, i) => ({
    key: `ac:${u.id}`,
    kind: "ac",
    id: u.id,
    name: `Cooling unit ${i + 1}`,
    named: false,
    detail: `${u.hp} hp`,
    renamable: false,
  }));

  const hidden = new Set(layout.layers.hidden);
  const locked = new Set(layout.layers.locked);
  const rank = new Map(layout.layers.order.map((k, i) => [k, i]));
  const decorate = (rows: Bare[], ordered: boolean): LayerRow[] => {
    const full = rows.map((r) => {
      const byStage = r.kind === "stageItem" && hidden.has(`zone:${r.stageId}`);
      return {
        ...r,
        hidden: hidden.has(r.key) || byStage,
        hiddenByStage: byStage && !hidden.has(r.key),
        locked: locked.has(r.key),
      };
    });
    // The host's order wins; anything they never moved keeps its place after the ones they did.
    return ordered
      ? full
          .map((r, i) => ({ r, i }))
          .sort(
            (a, b) =>
              (rank.get(a.r.key) ?? LAYER_STATE_MAX + a.i) -
              (rank.get(b.r.key) ?? LAYER_STATE_MAX + b.i)
          )
          .map(({ r }) => r)
      : full;
  };

  return (
    [
      // Fixtures sit under their stage, so the areas keep the layout's order.
      { key: "areas", label: "Areas", rows: decorate(areas, false) },
      { key: "tables", label: "Tables", rows: decorate(tableRows, true) },
      { key: "chairs", label: "Chairs", rows: decorate(chairRows, true) },
      { key: "cooling", label: "Cooling", rows: decorate(coolingRows, true) },
    ] satisfies LayerGroup[]
  ).filter((g) => g.rows.length > 0);
}

type Bare = Omit<LayerRow, "hidden" | "hiddenByStage" | "locked">;

/** The layout with these layers hidden or shown. Selecting nothing changes nothing. */
export function setLayersHidden(
  layout: HallLayout,
  keys: string[],
  hide: boolean
): HallLayout {
  const next = new Set(layout.layers.hidden);
  for (const k of keys) {
    if (hide) next.add(k);
    else next.delete(k);
  }
  return {
    ...layout,
    layers: { ...layout.layers, hidden: [...next].slice(0, LAYER_STATE_MAX) },
  };
}

export function setLayersLocked(
  layout: HallLayout,
  keys: string[],
  lock: boolean
): HallLayout {
  const next = new Set(layout.layers.locked);
  for (const k of keys) {
    if (lock) next.add(k);
    else next.delete(k);
  }
  return {
    ...layout,
    layers: { ...layout.layers, locked: [...next].slice(0, LAYER_STATE_MAX) },
  };
}

/**
 * Move one row to the place another row holds, within the group's rows as they are listed now:
 * dragging down lands it after the target, dragging up lands it before. Dropping a row on itself,
 * or on a key not in the list, changes nothing.
 */
export function moveLayer(
  layout: HallLayout,
  listed: string[],
  moving: string,
  onto: string
): HallLayout {
  if (moving === onto) return layout;
  const from = listed.indexOf(moving);
  const to = listed.indexOf(onto);
  if (from < 0 || to < 0) return layout;
  const next = listed.slice();
  next.splice(from, 1);
  next.splice(to, 0, moving);
  // Other groups keep their order; this group's new order goes after it.
  const rest = layout.layers.order.filter((k) => !listed.includes(k));
  return {
    ...layout,
    layers: {
      ...layout.layers,
      order: [...rest, ...next].slice(0, LAYER_STATE_MAX),
    },
  };
}

/** One step up or down, for the keyboard. Stops at the ends. */
export function nudgeLayer(
  layout: HallLayout,
  listed: string[],
  key: string,
  by: -1 | 1
): HallLayout {
  const at = listed.indexOf(key);
  const target = listed[at + by];
  if (at < 0 || target === undefined) return layout;
  return moveLayer(layout, listed, key, target);
}

/** Keep the rows whose name or detail contain the search, and drop the groups left empty. */
export function filterLayers(
  groups: LayerGroup[],
  query: string
): LayerGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({
      ...g,
      rows: g.rows.filter((r) =>
        `${r.name} ${r.detail ?? ""}`.toLowerCase().includes(q)
      ),
    }))
    .filter((g) => g.rows.length > 0);
}

/** A name as the panel will store it: trimmed, one line, and no longer than the schema allows. */
export function cleanLayerName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, LAYER_NAME_MAX);
}

/**
 * The layout with one layer renamed. An empty name puts the default back. Tables are renamed
 * through the database, not the layout, so they are returned unchanged here.
 */
export function renameLayer(
  layout: HallLayout,
  row: Pick<LayerRow, "kind" | "id">,
  raw: string
): HallLayout {
  const name = cleanLayerName(raw);
  if (row.kind === "zone")
    return {
      ...layout,
      zones: layout.zones.map((z) =>
        z.id === row.id
          ? { ...z, label: name || ZONE_DEFAULTS[z.kind].label }
          : z
      ),
    };
  if (row.kind === "chair")
    return {
      ...layout,
      chairs: layout.chairs.map((c) => {
        if (c.id !== row.id) return c;
        const { label: _old, ...rest } = c;
        void _old;
        return name ? { ...rest, label: name } : rest;
      }),
    };
  if (row.kind === "stageItem")
    return {
      ...layout,
      stageItems: layout.stageItems.map((s) => {
        if (s.id !== row.id) return s;
        const { label: _old, ...rest } = s;
        void _old;
        return name ? { ...rest, label: name } : rest;
      }),
    };
  return layout;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

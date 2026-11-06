import type { TableWithGuests } from "../types";
import {
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
  const areas: LayerRow[] = [];
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

  const tableRows: LayerRow[] = tables.map((t) => ({
    key: `table:${t.id}`,
    kind: "table",
    id: t.id,
    name: t.name,
    named: true,
    detail: `${t.occupiedSeats} of ${t.capacity} seated`,
    renamable: true,
  }));

  const seen: Record<string, number> = {};
  const chairRows: LayerRow[] = layout.chairs.map((c) => {
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

  const coolingRows: LayerRow[] = unitsOf(layout).map((u, i) => ({
    key: `ac:${u.id}`,
    kind: "ac",
    id: u.id,
    name: `Cooling unit ${i + 1}`,
    named: false,
    detail: `${u.hp} hp`,
    renamable: false,
  }));

  return (
    [
      { key: "areas", label: "Areas", rows: areas },
      { key: "tables", label: "Tables", rows: tableRows },
      { key: "chairs", label: "Chairs", rows: chairRows },
      { key: "cooling", label: "Cooling", rows: coolingRows },
    ] satisfies LayerGroup[]
  ).filter((g) => g.rows.length > 0);
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

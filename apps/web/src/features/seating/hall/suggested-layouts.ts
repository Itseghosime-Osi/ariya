/**
 * The bridge between the hall document and the Rust studio's ARRANGE operation.
 *
 * The engine works in metres and room coordinates, the same units the layout uses, so the only
 * work here is translating the hall's richer zones down to the wire shape and mapping a chosen
 * option's placements back onto the event's table ids. Pure, so it is testable without the wasm.
 */
import type {
  ArrangeRequest,
  ArrangeTable,
  LayoutOption,
  Zone as WireZone,
  ZoneShape as WireZoneShape,
} from "@ariya/studio";
import { round2, type HallLayout, type Zone } from "./model";

/** The subset of a table the engine needs; the hall's rows carry more. */
export interface SuggestTable {
  id: string;
  shape: string;
  capacity: number;
  occupied: number;
}

/** A stable 32-bit seed for one event and layout version, so the options repeat. */
export function seedFrom(eventId: string, layoutVersion: number): number {
  let hash = 2166136261 ^ layoutVersion;
  for (let i = 0; i < eventId.length; i++) {
    hash ^= eventId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toWireZone(z: Zone): WireZone {
  return {
    id: z.id,
    kind: z.kind,
    label: z.label,
    x: z.x,
    y: z.y,
    w: z.w,
    h: z.h,
    shape: (z.shape ?? null) as WireZoneShape | null,
    rot: z.rot ?? null,
  };
}

/** Build the request the engine expects from the current hall and the host's tables. */
export function toArrangeRequest(
  layout: HallLayout,
  tables: SuggestTable[],
  gap: number,
  seed: number,
  keep = 3
): ArrangeRequest {
  const arrangeTables: ArrangeTable[] = tables.map((t) => ({
    id: t.id,
    shape: t.shape,
    capacity: t.capacity,
    occupied: t.occupied,
  }));
  return {
    width: layout.width,
    length: layout.length,
    gap,
    seed: BigInt(seed),
    keep,
    tables: arrangeTables,
    zones: layout.zones.map(toWireZone),
  };
}

export interface AppliedOption {
  zones: Zone[];
  positions: { id: string; x: number; y: number; rot: number }[];
}

/**
 * Take a chosen option and express it as hall state: zones keep their styling but take the
 * option's geometry, and every placement becomes a table position in metres.
 */
export function applyOption(
  option: LayoutOption,
  tableIds: string[],
  layout: HallLayout
): AppliedOption {
  const moved = new Map(option.zones.map((z) => [z.id, z]));
  const zones = layout.zones.map((z) => {
    const w = moved.get(z.id);
    if (!w) return z;
    return {
      ...z,
      x: round2(w.x),
      y: round2(w.y),
      w: round2(w.w),
      h: round2(w.h),
      rot: w.rot ?? z.rot,
      shape: (w.shape ?? z.shape) as Zone["shape"],
    };
  });
  const positions = option.placements
    .filter((p) => tableIds[p.table] != null)
    .map((p) => ({
      id: tableIds[p.table],
      x: round2(p.x),
      y: round2(p.y),
      rot: p.rot,
    }));
  return { zones, positions };
}

/** How many seats an option actually places, given the host's tables. */
export function optionSeats(
  option: LayoutOption,
  tables: SuggestTable[]
): number {
  return option.placements.reduce(
    (sum, p) => sum + (tables[p.table]?.capacity ?? 0),
    0
  );
}

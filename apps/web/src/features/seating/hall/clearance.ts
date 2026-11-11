import {
  gapBetween,
  gapToWalls,
  gapToZone,
  MAIN_AISLE,
  type Footprint,
  type Zone,
} from "./model";

/**
 * The space around one table, in metres: to the nearest table, the nearest wall and the nearest
 * area (stage, dance floor, bar…). Shown while a table is selected, so a host can see an aisle is
 * too narrow before anyone has to squeeze past a chair. Pure.
 */
export interface Clearance {
  table: { name: string; gap: number } | null;
  wall: number;
  zone: { label: string; gap: number } | null;
  /** The narrowest of the three, and whether it is narrower than a main aisle. */
  tightest: number;
  tooNarrow: boolean;
}

export function clearanceOf(
  me: Footprint,
  others: { name: string; f: Footprint }[],
  zones: Zone[],
  hall: { width: number; length: number }
): Clearance {
  let table: Clearance["table"] = null;
  for (const o of others) {
    const g = gapBetween(me, o.f);
    if (!table || g < table.gap) table = { name: o.name, gap: g };
  }
  let zone: Clearance["zone"] = null;
  for (const z of zones) {
    if (z.kind === "entrance") continue;
    const g = gapToZone(me, z);
    if (!zone || g < zone.gap) zone = { label: z.label, gap: g };
  }
  const wall = gapToWalls(me, hall.width, hall.length);
  const tightest = Math.min(
    wall,
    table?.gap ?? Infinity,
    zone?.gap ?? Infinity
  );
  return { table, wall, zone, tightest, tooNarrow: tightest < MAIN_AISLE };
}

/** "1.4 m", or "touching" when the gap is gone. */
export function gapText(m: number) {
  if (m <= 0) return "touching";
  return `${(Math.round(m * 10) / 10).toFixed(1)} m`;
}

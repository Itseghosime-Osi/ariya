/**
 * How many tables fit, and where: packs one table type into the hall around its zones, walls,
 * a centre aisle and any tables already placed. Tries straight rows and staggered rows at several
 * offsets and keeps the arrangement with the most tables (ties go to the more symmetrical one).
 * Pure and fast (a few milliseconds for a grand hall), so it can run on every change.
 */
import {
  MAIN_AISLE,
  WALL_MARGIN,
  ZONE_CLEARANCE,
  extents,
  footprint,
  gapBetween,
  gapToWalls,
  gapToZone,
  round2,
  type Footprint,
  type Zone,
} from "./model";

export interface FitOptions {
  width: number;
  length: number;
  zones: Zone[];
  /** Tables already in the hall, which new ones must keep clear of. */
  obstacles?: Footprint[];
  shape: string;
  capacity: number;
  /** 0 or 90 for banquet tables; ignored for rounds. */
  rotation?: number;
  /** Clear gap between neighbouring footprints (chair back to chair back). */
  gap: number;
  /** Keep a main aisle down the middle, from the entrance to the stage. */
  aisle?: boolean;
}

export interface FitPlacement {
  x: number;
  y: number;
  rot: number;
}

export interface FitResult {
  placements: FitPlacement[];
  count: number;
  seats: number;
  arrangement: "rows" | "staggered";
}

function zoneClearance(z: Zone) {
  if (z.kind === "pillar") return 0.3;
  if (z.kind === "custom") return 0.6;
  if (z.kind === "entrance") return 1.6;
  return ZONE_CLEARANCE;
}

/** The point everything faces: the stage if there is one, else the top wall. */
export function frontOf(
  zones: Zone[],
  width: number
): { x: number; y: number } {
  const stage = zones.find((z) => z.kind === "stage");
  return stage ? { x: stage.x, y: stage.y } : { x: width / 2, y: 0 };
}

export function canPlace(f: Footprint, opts: FitOptions): boolean {
  if (gapToWalls(f, opts.width, opts.length) < WALL_MARGIN) return false;
  for (const z of opts.zones)
    if (gapToZone(f, z) < zoneClearance(z)) return false;
  for (const o of opts.obstacles ?? [])
    if (gapBetween(f, o) < opts.gap) return false;
  if (opts.aisle) {
    const { ex } = extents(f);
    if (Math.abs(f.x - opts.width / 2) - ex < MAIN_AISLE / 2) return false;
  }
  return true;
}

export function fitTables(opts: FitOptions): FitResult {
  const isRound = opts.shape === "round";
  const rot = isRound ? 0 : (opts.rotation ?? 0);
  const probe = footprint(opts.shape, opts.capacity, 0, 0, rot);
  const { ex, ey } = extents(probe);
  const pitchX = 2 * ex + opts.gap;
  const pitchY = 2 * ey + opts.gap;
  const cx = opts.width / 2;

  let best: FitResult = {
    placements: [],
    count: 0,
    seats: 0,
    arrangement: "rows",
  };
  let bestSym = -1;

  const lattices: { kind: "rows" | "staggered"; rowPitch: number }[] = [
    { kind: "rows", rowPitch: pitchY },
    {
      kind: "staggered",
      // Rounds nest into the gaps of the row in front; banquet rows just shift sideways.
      rowPitch: isRound ? (pitchX * Math.sqrt(3)) / 2 : pitchY,
    },
  ];

  for (const lat of lattices) {
    for (const ox of [0, 0.5]) {
      for (const oyStep of [0, 0.25, 0.5, 0.75]) {
        const placements: FitPlacement[] = [];
        const y0 = WALL_MARGIN + ey + oyStep * lat.rowPitch;
        for (
          let row = 0, y = y0;
          y <= opts.length - WALL_MARGIN - ey + 1e-6;
          row++, y += lat.rowPitch
        ) {
          const shift = lat.kind === "staggered" && row % 2 === 1 ? 0.5 : 0;
          const off = (ox + shift) % 1;
          const span = Math.ceil(opts.width / pitchX) + 2;
          for (let i = -span; i <= span; i++) {
            const x = cx + (i + off) * pitchX;
            if (x < 0 || x > opts.width) continue;
            const f = footprint(opts.shape, opts.capacity, x, y, rot);
            if (canPlace(f, opts))
              placements.push({ x: round2(x), y: round2(y), rot });
          }
        }
        const sym = symmetry(placements, cx);
        if (
          placements.length > best.count ||
          (placements.length === best.count && sym > bestSym)
        ) {
          best = {
            placements,
            count: placements.length,
            seats: placements.length * opts.capacity,
            arrangement: lat.kind,
          };
          bestSym = sym;
        }
      }
    }
  }
  return best;
}

/** Share of placements whose mirror image across the centre line is also a placement. */
function symmetry(ps: FitPlacement[], cx: number): number {
  if (ps.length === 0) return 0;
  const key = (x: number, y: number) =>
    `${Math.round(x * 10)}:${Math.round(y * 10)}`;
  const set = new Set(ps.map((p) => key(p.x, p.y)));
  let mirrored = 0;
  for (const p of ps) if (set.has(key(2 * cx - p.x, p.y))) mirrored++;
  return mirrored / ps.length;
}

/** Keep only the `n` placements nearest the stage, so a smaller party sits up front. */
export function nearestToFront(
  ps: FitPlacement[],
  front: { x: number; y: number },
  n: number
) {
  return [...ps]
    .sort(
      (a, b) =>
        Math.hypot(a.x - front.x, (a.y - front.y) * 1.4) -
        Math.hypot(b.x - front.x, (b.y - front.y) * 1.4)
    )
    .slice(0, Math.max(0, n));
}

/** Find a free spot for one table, scanning out from the preferred point. */
export function findFreeSpot(
  opts: FitOptions,
  prefer: { x: number; y: number }
): FitPlacement | null {
  const rot = opts.shape === "round" ? 0 : (opts.rotation ?? 0);
  const step = 0.5;
  const maxR = Math.max(opts.width, opts.length);
  for (let r = 0; r <= maxR; r += step) {
    const n = r === 0 ? 1 : Math.ceil((2 * Math.PI * r) / step);
    for (let k = 0; k < n; k++) {
      const t = (k / n) * Math.PI * 2;
      const x = prefer.x + Math.cos(t) * r;
      const y = prefer.y + Math.sin(t) * r;
      const f = footprint(opts.shape, opts.capacity, x, y, rot);
      if (canPlace(f, opts)) return { x: round2(x), y: round2(y), rot };
    }
  }
  return null;
}

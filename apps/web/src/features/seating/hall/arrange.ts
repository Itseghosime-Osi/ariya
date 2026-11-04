/**
 * Auto layout: arranges the whole hall in one go. Areas go where planners usually put them (stage
 * and band at the front, the high table before the stage, the dance floor in front of that,
 * buffet and bar along the side walls, entrance at the back), then every table is packed into the
 * space that is left, fullest tables nearest the stage. Pure, so it can be tested and undone.
 */
import {
  clamp,
  footprint,
  gapBetween,
  round2,
  type Footprint,
  type HallLayout,
  type Zone,
} from "./model";
import { findFreeSpot, fitTables, frontOf, type FitPlacement } from "./fit";

export interface ArrangeTable {
  id: string;
  shape: string;
  capacity: number;
  occupied: number;
}

export interface ArrangeResult {
  zones: Zone[];
  positions: Record<string, { x: number; y: number; rot: number }>;
  /** Tables there was no room for; they stay where they were. */
  unplaced: string[];
}

/** Put the areas in their usual places, keeping each one's size, shape and colour. */
export function arrangeZones(layout: HallLayout): Zone[] {
  const W = layout.width;
  const L = layout.length;
  const edge = 0.5;
  const out = layout.zones.map((z) => ({ ...z }));
  const first = (kind: Zone["kind"]) => out.find((z) => z.kind === kind);
  const fit = (z: Zone, x: number, y: number) => {
    z.x = round2(clamp(x, z.w / 2, W - z.w / 2));
    z.y = round2(clamp(y, z.h / 2, L - z.h / 2));
  };
  // Long stations run along the side walls.
  const alongWall = (z: Zone) => {
    if (z.w > z.h) [z.w, z.h] = [z.h, z.w];
    z.rot = 0;
  };

  const stage = first("stage");
  if (stage) {
    stage.rot = 0;
    fit(stage, W / 2, edge + stage.h / 2);
  }
  const stageFront = stage ? stage.y + stage.h / 2 : 0;
  // Room for the high table between the stage and the dance floor.
  const dance = first("dance");
  if (dance) fit(dance, W / 2, stageFront + 3.2 + dance.h / 2);

  const buffet = first("buffet");
  if (buffet) {
    alongWall(buffet);
    fit(buffet, edge + buffet.w / 2, L * 0.55);
  }
  const bar = first("bar");
  if (bar) {
    alongWall(bar);
    fit(bar, W - edge - bar.w / 2, L * 0.55);
  }
  const entrance = first("entrance");
  if (entrance) {
    entrance.rot = 0;
    fit(entrance, W / 2, L - entrance.h / 2 - 0.1);
  }
  const sideOfStage = stage
    ? { left: stage.x - stage.w / 2, right: stage.x + stage.w / 2 }
    : { left: W / 2, right: W / 2 };
  const dj = first("dj");
  if (dj) fit(dj, sideOfStage.right + 1 + dj.w / 2, edge + dj.h / 2);
  const cake = first("cake");
  if (cake)
    fit(cake, sideOfStage.left - 1.2 - cake.w / 2, edge + 1 + cake.h / 2);
  const photo = first("photo");
  if (photo) fit(photo, edge + photo.w / 2 + 1, L - edge - photo.h / 2);
  const gifts = first("gifts");
  if (gifts) fit(gifts, W - edge - gifts.w / 2 - 1, L - edge - gifts.h / 2);
  return out;
}

export function autoArrange(
  layout: HallLayout,
  tables: ArrangeTable[],
  gap: number
): ArrangeResult {
  const zones = arrangeZones(layout);
  const front = frontOf(zones, layout.width);
  const positions: ArrangeResult["positions"] = {};
  const placed: Footprint[] = [];
  const unplaced: string[] = [];
  const base = {
    width: layout.width,
    length: layout.length,
    zones,
    gap,
  };

  // High tables face the room from just in front of the stage, side by side.
  const heads = tables.filter((t) => t.shape === "head");
  const stage = zones.find((z) => z.kind === "stage");
  let hx = layout.width / 2;
  const headY = stage ? stage.y + stage.h / 2 + 1.1 : 2;
  const headW = heads.map((t) => footprint(t.shape, t.capacity, 0, 0, 0));
  const totalW = headW.reduce(
    (a, f) => a + (f.kind === "rect" ? f.hw * 2 : f.r * 2) + 0.6,
    -0.6
  );
  hx -= totalW / 2;
  heads.forEach((t, i) => {
    const f = headW[i];
    const w = f.kind === "rect" ? f.hw * 2 : f.r * 2;
    const x = round2(hx + w / 2);
    hx += w + 0.6;
    positions[t.id] = { x, y: round2(headY), rot: 0 };
    placed.push(footprint(t.shape, t.capacity, x, headY, 0));
  });

  // The rest: the most common table type packed in rows, fullest tables nearest the front.
  const rest = tables
    .filter((t) => t.shape !== "head")
    .sort((a, b) => b.occupied - a.occupied);
  const groups = new Map<string, ArrangeTable[]>();
  for (const t of rest) {
    const k = `${t.shape}:${t.capacity}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const ordered = [...groups.values()].sort((a, b) => b.length - a.length);
  const dist = (p: { x: number; y: number }) =>
    Math.hypot(p.x - front.x, (p.y - front.y) * 1.2);

  for (const group of ordered) {
    const { shape, capacity } = group[0];
    // A centre aisle when there is room for it; otherwise use the space.
    let lattice = fitTables({
      ...base,
      obstacles: placed,
      shape,
      capacity,
      aisle: true,
    }).placements;
    if (lattice.length < group.length) {
      const open = fitTables({
        ...base,
        obstacles: placed,
        shape,
        capacity,
        aisle: false,
      }).placements;
      if (open.length > lattice.length) lattice = open;
    }
    lattice.sort((a, b) => dist(a) - dist(b));
    group.forEach((t, i) => {
      let spot: FitPlacement | undefined = lattice[i];
      if (spot) {
        const f = footprint(shape, capacity, spot.x, spot.y, spot.rot);
        // A spot from the lattice can clash with tables placed for an earlier group.
        if (placed.some((o) => gapOk(f, o, gap) === false)) spot = undefined;
      }
      spot ??=
        findFreeSpot({ ...base, obstacles: placed, shape, capacity }, front) ??
        undefined;
      if (!spot) {
        unplaced.push(t.id);
        return;
      }
      positions[t.id] = { x: spot.x, y: spot.y, rot: spot.rot };
      placed.push(footprint(shape, capacity, spot.x, spot.y, spot.rot));
    });
  }
  return { zones, positions, unplaced };
}

function gapOk(a: Footprint, b: Footprint, gap: number) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const ra = a.kind === "circle" ? a.r : Math.hypot(a.hw, a.hh);
  const rb = b.kind === "circle" ? b.r : Math.hypot(b.hw, b.hh);
  // Cheap bounding-circle test first; exact only when they might touch.
  if (Math.hypot(dx, dy) > ra + rb + gap) return true;
  return gapBetween(a, b) >= gap - 1e-6;
}

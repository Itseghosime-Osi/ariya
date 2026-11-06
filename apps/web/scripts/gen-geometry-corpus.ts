/**
 * Writes the geometry parity corpus that `crates/studio-core/tests/parity.rs` checks against.
 *
 * The TypeScript in `features/seating/hall` is the source of truth for table geometry and packing.
 * This script runs it over a generated corpus and records the answers, so the Rust port can be
 * held to them exactly. Regenerate after changing `model.ts` or `fit.ts`:
 *
 *   pnpm --filter @ariya/web exec tsx scripts/gen-geometry-corpus.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  extents,
  footprint,
  gapBetween,
  gapToWalls,
  gapToZone,
  tableTop,
  type Zone,
} from "../src/features/seating/hall/model";
import { fitTables } from "../src/features/seating/hall/fit";

const here = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(
  here,
  "../../../crates/studio-core/tests/fixtures/geometry-corpus.json"
);

/** A small deterministic generator, so the corpus is the same on every machine. */
function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const SHAPES = ["round", "rectangular", "oval", "head"] as const;
const CAPACITIES = [4, 6, 8, 10, 12, 14];

const next = rng(20261105);
const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(next() * items.length)];

/** Rooms run from a snug 8 m square to a 60 m field, so wall gaps are not all the same shape. */
const ROOM_MIN = 8;
const ROOM_MAX = 60;
const half = (n: number) => Math.round(n * 2) / 2;

const tables = Array.from({ length: 320 }, () => {
  const width = half(ROOM_MIN + next() * (ROOM_MAX - ROOM_MIN));
  const length = half(ROOM_MIN + next() * (ROOM_MAX - ROOM_MIN));
  const shape = pick(SHAPES);
  const capacity = pick(CAPACITIES);
  const x = Math.round(next() * width * 100) / 100;
  const y = Math.round(next() * length * 100) / 100;
  const rot = shape === "round" ? 0 : pick([0, 90, 180, 270]);
  const top = tableTop(shape, capacity);
  const f = footprint(shape, capacity, x, y, rot);
  const { ex, ey } = extents(f);
  return {
    width,
    length,
    shape,
    capacity,
    x,
    y,
    rot,
    top,
    footprint: f,
    ex,
    ey,
    wallGap: gapToWalls(f, width, length),
  };
});

const pairs = Array.from({ length: 200 }, () => {
  const a = Math.floor(next() * tables.length);
  const b = Math.floor(next() * tables.length);
  const gap = gapBetween(tables[a].footprint, tables[b].footprint);
  return { a, b, gap };
});

const zones: Zone[] = [
  { id: "z-stage", kind: "stage", label: "Stage", x: 15, y: 2.2, w: 9, h: 3.6 },
  {
    id: "z-dance",
    kind: "dance",
    label: "Dance floor",
    x: 15,
    y: 9,
    w: 8,
    h: 7,
    shape: "round",
  },
  {
    id: "z-buffet",
    kind: "buffet",
    label: "Buffet",
    x: 1.1,
    y: 11,
    w: 1.6,
    h: 8,
  },
  { id: "z-bar", kind: "bar", label: "Bar", x: 29, y: 11, w: 1.4, h: 5 },
  {
    id: "z-pillar",
    kind: "pillar",
    label: "Pillar",
    x: 10,
    y: 10,
    w: 0.8,
    h: 0.8,
    shape: "octagon",
  },
  {
    id: "z-rotated",
    kind: "custom",
    label: "Rotated block",
    x: 22,
    y: 6,
    w: 3,
    h: 1.2,
    rot: 30,
  },
];

const zonePairs = Array.from({ length: 160 }, () => {
  const table = Math.floor(next() * tables.length);
  const zone = Math.floor(next() * zones.length);
  return {
    table,
    zone,
    gap: gapToZone(tables[table].footprint, zones[zone]),
  };
});

const fitCases = [
  {
    width: 18,
    length: 14,
    shape: "round",
    capacity: 8,
    rotation: 0,
    gap: 0.6,
    aisle: false,
  },
  {
    width: 30,
    length: 20,
    shape: "round",
    capacity: 8,
    rotation: 0,
    gap: 0.6,
    aisle: true,
  },
  {
    width: 30,
    length: 20,
    shape: "round",
    capacity: 10,
    rotation: 0,
    gap: 0.45,
    aisle: true,
  },
  {
    width: 40,
    length: 28,
    shape: "round",
    capacity: 8,
    rotation: 0,
    gap: 0.9,
    aisle: false,
  },
  {
    width: 30,
    length: 20,
    shape: "rectangular",
    capacity: 6,
    rotation: 0,
    gap: 0.6,
    aisle: true,
  },
  {
    width: 30,
    length: 20,
    shape: "rectangular",
    capacity: 8,
    rotation: 90,
    gap: 0.6,
    aisle: false,
  },
  {
    width: 55,
    length: 36,
    shape: "round",
    capacity: 10,
    rotation: 0,
    gap: 0.6,
    aisle: true,
  },
  {
    width: 12,
    length: 9,
    shape: "round",
    capacity: 6,
    rotation: 0,
    gap: 0.45,
    aisle: false,
  },
  {
    width: 24,
    length: 24,
    shape: "oval",
    capacity: 8,
    rotation: 0,
    gap: 0.6,
    aisle: true,
  },
  {
    width: 36,
    length: 18,
    shape: "head",
    capacity: 10,
    rotation: 0,
    gap: 0.6,
    aisle: true,
  },
  {
    width: 48,
    length: 30,
    shape: "rectangular",
    capacity: 8,
    rotation: 90,
    gap: 0.9,
    aisle: true,
  },
  {
    width: 20,
    length: 16,
    shape: "round",
    capacity: 12,
    rotation: 0,
    gap: 0.3,
    aisle: false,
  },
].map((c) => {
  const result = fitTables({ ...c, zones: [] });
  return { ...c, zones: [] as Zone[], ...result };
});

const withZones = fitTables({
  width: 30,
  length: 20,
  zones,
  shape: "round",
  capacity: 8,
  rotation: 0,
  gap: 0.6,
  aisle: true,
});
fitCases.push({
  width: 30,
  length: 20,
  shape: "round",
  capacity: 8,
  rotation: 0,
  gap: 0.6,
  aisle: true,
  zones,
  ...withZones,
});

const corpus = {
  generatedBy: "apps/web/scripts/gen-geometry-corpus.ts",
  tables,
  pairs,
  zones,
  zonePairs,
  fits: fitCases,
};

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(corpus, null, 2)}\n`);
const total = tables.length + pairs.length + zonePairs.length + fitCases.length;
console.log(
  `geometry corpus: ${tables.length} tables, ${pairs.length} pairs, ${zonePairs.length} zone gaps, ${fitCases.length} fits (${total} cases)`
);

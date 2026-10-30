/**
 * The hall model behind the seating studio: a real room in metres, the zones in it (stage, dance
 * floor, buffet…), the décor, and the geometry of every table and its chairs.
 *
 * Tables keep living in the `tables` rows (name, capacity, shape, position). Positions are stored
 * in centimetres in `position_x` / `position_y`; everything else about the hall lives in one
 * `hall_layout` JSON document per event.
 */

export type ZoneKind =
  | "stage"
  | "dance"
  | "buffet"
  | "bar"
  | "dj"
  | "entrance"
  | "gifts"
  | "photo"
  | "pillar"
  | "cake"
  | "custom";

export type ZoneShape =
  "rect" | "round" | "oval" | "hexagon" | "octagon" | "heart";

/** Surface of a stage or dance floor. */
export type ZoneFinish =
  "gloss" | "led" | "white" | "wood" | "checker" | "carpet" | "marble";

export interface Zone {
  id: string;
  kind: ZoneKind;
  label: string;
  /** Centre, in metres from the top-left corner of the hall. */
  x: number;
  y: number;
  w: number;
  h: number;
  shape?: ZoneShape;
  /** Rotation in degrees. */
  rot?: number;
  /** Main colour: stage skirt, runner, bar front, arch flowers… */
  color?: string;
  finish?: ZoneFinish;
  /** Platform height in metres (stages), or the height of a custom item. */
  height?: number;
  /** Custom items: a draped table, or a solid block (a booth, a sofa, a plant stand…). */
  variant?: "table" | "block";
}

export type ChairType =
  | "chiavari-gold"
  | "chiavari-silver"
  | "chiavari-white"
  | "ghost"
  | "crossback"
  | "covered";
export type Centrepiece = "tall" | "low" | "candles" | "lanterns" | "none";
export type FloorFinish = "marble" | "wood" | "dark" | "carpet";

export interface Decor {
  linen: string;
  /** Chair sash, or none. */
  sash: string | null;
  chair: ChairType;
  /** Spandex cover colour for covered chairs. */
  cover: string;
  centrepiece: Centrepiece;
  flower: string;
  uplight: string | null;
  drape: string | null;
  floor: FloorFinish;
  wall: string;
}

/** A table's own styling; anything left out follows the hall décor. */
export interface TableStyle {
  cloth?: string;
  chair?: ChairType;
  cover?: string;
  sash?: string | null;
  centrepiece?: Centrepiece;
  flower?: string;
}

/** A chair standing on its own (a lounge row, a couple's chairs, extra seats). */
export interface FreeChair {
  id: string;
  x: number;
  y: number;
  rot: number;
  chair?: ChairType;
}

export type Spacing = "snug" | "comfortable" | "spacious";

export interface HallLayout {
  version: 1;
  width: number;
  length: number;
  zones: Zone[];
  decor: Decor;
  spacing: Spacing;
  /** Rotation in degrees for each table id. */
  rotations: Record<string, number>;
  /** Per-table styling by table id. */
  tableStyles: Record<string, TableStyle>;
  chairs: FreeChair[];
  mood: "day" | "evening";
  chandeliers: boolean;
  /** Ceiling height in metres. */
  ceiling: number;
}

export const ZONE_DEFAULTS: Record<
  ZoneKind,
  { label: string; w: number; h: number; fill: string }
> = {
  stage: { label: "Stage & band", w: 9, h: 4, fill: "#6e1426" },
  dance: { label: "Dance & spraying floor", w: 8, h: 7, fill: "#3a2a12" },
  buffet: { label: "Buffet", w: 7, h: 1.6, fill: "#2f3b2a" },
  bar: { label: "Drinks bar", w: 4, h: 1.4, fill: "#24324a" },
  dj: { label: "DJ & MC", w: 2.5, h: 2, fill: "#3b2440" },
  entrance: { label: "Entrance", w: 3, h: 1, fill: "#1f4a36" },
  gifts: { label: "Gifts & souvenirs", w: 3, h: 1.2, fill: "#4a3512" },
  photo: { label: "Photo spot", w: 3, h: 3, fill: "#40202c" },
  pillar: { label: "Pillar", w: 0.8, h: 0.8, fill: "#3a3030" },
  cake: { label: "Cake table", w: 1.5, h: 1.5, fill: "#5a3a2a" },
  custom: { label: "Custom item", w: 1.8, h: 0.9, fill: "#4a4040" },
};

/** The colour each zone starts with in the 3D hall. */
export const ZONE_COLOURS: Record<ZoneKind, string> = {
  stage: "#6e1426",
  dance: "#141014",
  buffet: "#f4efe6",
  bar: "#c9a465",
  dj: "#1b1b1f",
  entrance: "#6e1426",
  gifts: "#f4efe6",
  photo: "#f4d7dc",
  pillar: "#f4efe6",
  cake: "#f4efe6",
  custom: "#e9c98a",
};

export const CHAIR_TYPES: { key: ChairType; label: string }[] = [
  { key: "chiavari-gold", label: "Gold chiavari" },
  { key: "chiavari-silver", label: "Silver chiavari" },
  { key: "chiavari-white", label: "White chiavari" },
  { key: "ghost", label: "Ghost (clear)" },
  { key: "crossback", label: "Wooden cross-back" },
  { key: "covered", label: "Covered banquet" },
];

export const DECOR_PRESETS: { key: string; label: string; decor: Decor }[] = [
  {
    key: "burgundy",
    label: "Burgundy & gold",
    decor: {
      linen: "#6e1426",
      sash: "#e9c98a",
      chair: "chiavari-gold",
      centrepiece: "tall",
      flower: "#f4efe6",
      uplight: "#f2b45c",
      drape: "#f4efe6",
      floor: "marble",
      cover: "#f4efe6",
      wall: "#efe7da",
    },
  },
  {
    key: "emerald",
    label: "Emerald & champagne",
    decor: {
      linen: "#f4efe6",
      sash: "#1f6b4a",
      chair: "chiavari-gold",
      centrepiece: "low",
      flower: "#1f6b4a",
      uplight: "#7fe0b0",
      drape: "#e9c98a",
      floor: "marble",
      cover: "#f4efe6",
      wall: "#efe7da",
    },
  },
  {
    key: "royal",
    label: "Royal blue & silver",
    decor: {
      linen: "#243f86",
      sash: "#cfd6e4",
      chair: "chiavari-white",
      centrepiece: "candles",
      flower: "#cfd6e4",
      uplight: "#8ec5ff",
      drape: "#cfd6e4",
      floor: "dark",
      cover: "#f4efe6",
      wall: "#e6e8ee",
    },
  },
  {
    key: "coral",
    label: "Coral & cream",
    decor: {
      linen: "#f7e8d0",
      sash: "#d9644a",
      chair: "ghost",
      centrepiece: "low",
      flower: "#d9644a",
      uplight: "#ff9a6b",
      drape: "#f7e8d0",
      floor: "wood",
      cover: "#f7e8d0",
      wall: "#f1e6d8",
    },
  },
  {
    key: "lilac",
    label: "Lilac & gold",
    decor: {
      linen: "#efe6f7",
      sash: "#8a6bb8",
      chair: "chiavari-gold",
      centrepiece: "tall",
      flower: "#b89ad8",
      uplight: "#c9a0ff",
      drape: "#e9c98a",
      floor: "marble",
      cover: "#f4efe6",
      wall: "#efe7da",
    },
  },
  {
    key: "white",
    label: "All white & gold",
    decor: {
      linen: "#fbf8f2",
      sash: "#c9a465",
      chair: "chiavari-gold",
      centrepiece: "candles",
      flower: "#fbf8f2",
      uplight: "#ffe2a8",
      drape: "#fbf8f2",
      floor: "marble",
      cover: "#f4efe6",
      wall: "#efe7da",
    },
  },
];

export const HALL_PRESETS: {
  key: string;
  label: string;
  width: number;
  length: number;
}[] = [
  { key: "intimate", label: "Intimate (up to ~150)", width: 18, length: 14 },
  { key: "medium", label: "Event hall (~300)", width: 30, length: 20 },
  { key: "large", label: "Large hall (~600)", width: 40, length: 28 },
  { key: "grand", label: "Grand hall (~1,000)", width: 55, length: 36 },
];

export const SPACING_GAP: Record<Spacing, number> = {
  snug: 0.45,
  comfortable: 0.6,
  spacious: 0.9,
};

/** Depth of a chair plus the person sitting in it, measured out from the table edge. */
export const CHAIR_DEPTH = 0.5;
/** Clear band kept along the walls for service and exits. */
export const WALL_MARGIN = 1.0;
/** Clear band kept around stages, dance floors and stations. */
export const ZONE_CLEARANCE = 1.0;
/** NFPA 101 main aisle where it serves more than 50 people. */
export const MAIN_AISLE = 1.12;
/** Floor area per seated guest used for the fire-safety guidance (UK and NFPA both ~1.4 m²). */
export const AREA_PER_DINER = 1.4;

let idCounter = 0;
export function zoneId(): string {
  idCounter += 1;
  return `z${Date.now().toString(36)}${idCounter}`;
}

export function defaultLayout(width = 30, length = 20): HallLayout {
  return {
    version: 1,
    width,
    length,
    spacing: "comfortable",
    decor: DECOR_PRESETS[0].decor,
    rotations: {},
    tableStyles: {},
    chairs: [],
    mood: "day",
    chandeliers: false,
    ceiling: 5,
    zones: defaultZones(width, length),
  };
}

export function defaultZones(width: number, length: number): Zone[] {
  const z = (kind: ZoneKind, x: number, y: number, w?: number, h?: number) => ({
    id: zoneId(),
    kind,
    label: ZONE_DEFAULTS[kind].label,
    x,
    y,
    w: w ?? ZONE_DEFAULTS[kind].w,
    h: h ?? ZONE_DEFAULTS[kind].h,
  });
  const stageW = Math.min(9, width * 0.4);
  const danceW = Math.min(8, width * 0.32);
  const danceH = Math.min(7, length * 0.3);
  return [
    { ...z("stage", width / 2, 2.2, stageW, 3.6), height: 0.8 },
    {
      ...z("dance", width / 2, 4.2 + 2.4 + danceH / 2, danceW, danceH),
      shape: "round" as ZoneShape,
      finish: "gloss" as ZoneFinish,
    },
    z("buffet", 1.1, length * 0.55, 1.6, Math.min(8, length * 0.4)),
    z("bar", width - 1, length * 0.55, 1.4, Math.min(5, length * 0.25)),
    z("entrance", width / 2, length - 0.5, 3.4, 1),
  ];
}

/** Read a stored layout, filling in anything missing so old or partial documents still work. */
export function normaliseLayout(raw: unknown): HallLayout | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Partial<HallLayout>;
  const width = clamp(Number(r.width) || 30, 6, 120);
  const length = clamp(Number(r.length) || 20, 6, 120);
  const base = defaultLayout(width, length);
  return {
    version: 1,
    width,
    length,
    spacing:
      r.spacing === "snug" || r.spacing === "spacious"
        ? r.spacing
        : "comfortable",
    decor: normaliseDecor(r.decor, base.decor),
    rotations: isRecord(r.rotations) ? r.rotations : {},
    tableStyles: isRecord(r.tableStyles)
      ? Object.fromEntries(
          Object.entries(r.tableStyles).map(([id, st]) => [
            id,
            {
              ...st,
              ...(st.chair ? { chair: chairType(st.chair) } : {}),
            },
          ])
        )
      : {},
    chairs: Array.isArray(r.chairs)
      ? r.chairs.filter(
          (c): c is FreeChair =>
            !!c && typeof c === "object" && typeof c.id === "string"
        )
      : [],
    mood: r.mood === "evening" ? "evening" : "day",
    chandeliers: r.chandeliers === true,
    ceiling: clamp(Number(r.ceiling) || 5, 3, 15),
    zones: Array.isArray(r.zones)
      ? r.zones
          .filter(
            (z): z is Zone =>
              !!z && typeof z === "object" && z.kind in ZONE_DEFAULTS
          )
          .map((z) => ({
            ...z,
            label: z.label || ZONE_DEFAULTS[z.kind]?.label || "Zone",
          }))
      : base.zones,
  };
}

function isRecord<T>(v: T | undefined): v is T {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Chair names from the first version of the planner, mapped onto the chair types. */
export function chairType(v: unknown): ChairType {
  const legacy: Record<string, ChairType> = {
    gold: "chiavari-gold",
    white: "chiavari-white",
    black: "crossback",
    clear: "ghost",
  };
  if (typeof v === "string" && legacy[v]) return legacy[v];
  return CHAIR_TYPES.some((c) => c.key === v)
    ? (v as ChairType)
    : "chiavari-gold";
}

function normaliseDecor(raw: unknown, base: Decor): Decor {
  if (!isRecord(raw as Partial<Decor>)) return base;
  const d = { ...base, ...(raw as Partial<Decor>) };
  return { ...d, chair: chairType(d.chair) };
}

/** The styling a table actually gets: its own choices over the hall décor. */
export function styleOf(layout: HallLayout, tableId: string) {
  const own = layout.tableStyles[tableId] ?? {};
  const d = layout.decor;
  return {
    cloth: own.cloth ?? d.linen,
    chair: own.chair ?? d.chair,
    cover: own.cover ?? d.cover,
    sash: own.sash === undefined ? d.sash : own.sash,
    centrepiece: own.centrepiece ?? d.centrepiece,
    flower: own.flower ?? d.flower,
  };
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- table geometry ----------

export type Shape = "round" | "rectangular" | "oval" | "head";

export interface TableTop {
  /** Width across (x) and depth (y) of the table top in metres, before rotation. */
  w: number;
  h: number;
  kind: "circle" | "rect" | "ellipse";
}

/** Real-world table sizes: 36/48/60/72-inch rounds and 6 or 8-foot banquet tables. */
export function tableTop(shape: string, capacity: number): TableTop {
  const seats = Math.max(1, capacity);
  if (shape === "rectangular") {
    return {
      w: Math.max(1.83, Math.ceil(seats / 2) * 0.6),
      h: 0.76,
      kind: "rect",
    };
  }
  if (shape === "head") {
    return { w: Math.max(1.83, seats * 0.6), h: 0.76, kind: "rect" };
  }
  if (shape === "oval") {
    return {
      w: Math.max(1.8, Math.ceil(seats / 2) * 0.6 + 0.4),
      h: 1.1,
      kind: "ellipse",
    };
  }
  const d =
    seats <= 4
      ? 0.91
      : seats <= 6
        ? 1.22
        : seats <= 10
          ? 1.52
          : seats <= 12
            ? 1.83
            : (seats * 0.5) / Math.PI;
  return { w: d, h: d, kind: "circle" };
}

export function tableSizeLabel(shape: string, capacity: number): string {
  const top = tableTop(shape, capacity);
  if (top.kind === "circle") return `${Math.round(top.w / 0.0254)}″ round`;
  const ft = Math.round(top.w / 0.3048);
  return shape === "head"
    ? `${ft} ft high table`
    : `${ft} ft ${shape === "oval" ? "oval" : "banquet"}`;
}

export interface Chair {
  x: number;
  y: number;
  /** Angle the chair faces, in degrees (towards the table). */
  a: number;
}

/** Chair positions relative to the table centre, before the table's own rotation. */
export function chairPositions(shape: string, capacity: number): Chair[] {
  const top = tableTop(shape, capacity);
  const n = Math.max(1, capacity);
  const out: Chair[] = [];
  if (top.kind === "circle") {
    const r = top.w / 2 + 0.26;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 - Math.PI / 2;
      out.push({
        x: Math.cos(t) * r,
        y: Math.sin(t) * r,
        a: (t * 180) / Math.PI + 90,
      });
    }
    return out;
  }
  if (top.kind === "ellipse") {
    const rx = top.w / 2 + 0.26;
    const ry = top.h / 2 + 0.26;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2 - Math.PI / 2;
      out.push({
        x: Math.cos(t) * rx,
        y: Math.sin(t) * ry,
        a: (t * 180) / Math.PI + 90,
      });
    }
    return out;
  }
  if (shape === "head") {
    // Everyone faces the room: one row of chairs behind the table.
    const step = top.w / n;
    for (let i = 0; i < n; i++) {
      out.push({
        x: -top.w / 2 + step * (i + 0.5),
        y: -top.h / 2 - 0.26,
        a: 180,
      });
    }
    return out;
  }
  const front = Math.ceil(n / 2);
  const back = n - front;
  const row = (count: number, y: number, a: number) => {
    const step = top.w / Math.max(1, count);
    for (let i = 0; i < count; i++)
      out.push({ x: -top.w / 2 + step * (i + 0.5), y, a });
  };
  row(front, -top.h / 2 - 0.26, 180);
  row(back, top.h / 2 + 0.26, 0);
  return out;
}

/** A table's footprint with its chairs, as a circle or an oriented rectangle, in hall metres. */
export type Footprint =
  | { kind: "circle"; x: number; y: number; r: number }
  | { kind: "rect"; x: number; y: number; hw: number; hh: number; rot: number };

export function footprint(
  shape: string,
  capacity: number,
  x: number,
  y: number,
  rot = 0
): Footprint {
  const top = tableTop(shape, capacity);
  if (top.kind === "circle")
    return { kind: "circle", x, y, r: top.w / 2 + CHAIR_DEPTH };
  const chairsBehindOnly = shape === "head";
  const hh = chairsBehindOnly
    ? top.h / 2 + CHAIR_DEPTH / 2
    : top.h / 2 + CHAIR_DEPTH;
  const hw = top.w / 2 + (top.kind === "ellipse" ? CHAIR_DEPTH : 0.15);
  return { kind: "rect", x, y, hw, hh, rot };
}

/** Axis-aligned bounding half-extents of a footprint. */
export function extents(f: Footprint): { ex: number; ey: number } {
  if (f.kind === "circle") return { ex: f.r, ey: f.r };
  const c = Math.abs(Math.cos((f.rot * Math.PI) / 180));
  const s = Math.abs(Math.sin((f.rot * Math.PI) / 180));
  return { ex: f.hw * c + f.hh * s, ey: f.hw * s + f.hh * c };
}

function corners(f: Extract<Footprint, { kind: "rect" }>): [number, number][] {
  const c = Math.cos((f.rot * Math.PI) / 180);
  const s = Math.sin((f.rot * Math.PI) / 180);
  return [
    [-f.hw, -f.hh],
    [f.hw, -f.hh],
    [f.hw, f.hh],
    [-f.hw, f.hh],
  ].map(
    ([px, py]) =>
      [f.x + px * c - py * s, f.y + px * s + py * c] as [number, number]
  );
}

/** Smallest distance between two footprints (negative when they overlap). */
export function gapBetween(a: Footprint, b: Footprint): number {
  if (a.kind === "circle" && b.kind === "circle") {
    return Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
  }
  if (a.kind === "circle" || b.kind === "circle") {
    const c = (a.kind === "circle" ? a : b) as Extract<
      Footprint,
      { kind: "circle" }
    >;
    const r = (a.kind === "rect" ? a : b) as Extract<
      Footprint,
      { kind: "rect" }
    >;
    return pointRectDistance(c.x, c.y, r) - c.r;
  }
  // Rect vs rect: separating-axis test for overlap, corner distances for the gap.
  if (rectsOverlap(a, b)) return -1;
  let best = Infinity;
  for (const [px, py] of corners(a))
    best = Math.min(best, pointRectDistance(px, py, b));
  for (const [px, py] of corners(b))
    best = Math.min(best, pointRectDistance(px, py, a));
  return best;
}

function pointRectDistance(
  px: number,
  py: number,
  r: Extract<Footprint, { kind: "rect" }>
) {
  const c = Math.cos((-r.rot * Math.PI) / 180);
  const s = Math.sin((-r.rot * Math.PI) / 180);
  const dx = px - r.x;
  const dy = py - r.y;
  const lx = dx * c - dy * s;
  const ly = dx * s + dy * c;
  const ox = Math.max(Math.abs(lx) - r.hw, 0);
  const oy = Math.max(Math.abs(ly) - r.hh, 0);
  if (ox === 0 && oy === 0)
    return -Math.min(r.hw - Math.abs(lx), r.hh - Math.abs(ly));
  return Math.hypot(ox, oy);
}

function rectsOverlap(
  a: Extract<Footprint, { kind: "rect" }>,
  b: Extract<Footprint, { kind: "rect" }>
) {
  const ca = corners(a);
  const cb = corners(b);
  for (const poly of [ca, cb]) {
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % 4];
      const nx = y2 - y1;
      const ny = x1 - x2;
      const project = (pts: [number, number][]) =>
        pts.map(([x, y]) => x * nx + y * ny);
      const pa = project(ca);
      const pb = project(cb);
      if (
        Math.max(...pa) < Math.min(...pb) ||
        Math.max(...pb) < Math.min(...pa)
      )
        return false;
    }
  }
  return true;
}

/** Distance from a footprint to a zone rectangle (negative when overlapping). */
export function gapToZone(f: Footprint, z: Zone): number {
  return gapBetween(f, zoneFootprint(z));
}

/** A zone's outline for spacing checks: a circle for even round shapes, else its rectangle. */
export function zoneFootprint(z: Zone): Footprint {
  const roundish =
    z.shape === "round" || z.shape === "hexagon" || z.shape === "octagon";
  if (roundish && Math.abs(z.w - z.h) < 0.01)
    return { kind: "circle", x: z.x, y: z.y, r: z.w / 2 };
  return {
    kind: "rect",
    x: z.x,
    y: z.y,
    hw: z.w / 2,
    hh: z.h / 2,
    rot: z.rot ?? 0,
  };
}

/** How far a footprint sits inside the walls (negative when it pokes through one). */
export function gapToWalls(
  f: Footprint,
  width: number,
  length: number
): number {
  const { ex, ey } = extents(f);
  return Math.min(f.x - ex, f.y - ey, width - (f.x + ex), length - (f.y + ey));
}

export function toMetres(cm: number) {
  return round2(cm / 100);
}
export function toCm(m: number) {
  return Math.round(m * 100);
}

export function formatMetres(m: number) {
  return `${Number.isInteger(m) ? m : m.toFixed(1)} m`;
}
export function formatFeet(m: number) {
  return `${Math.round(m / 0.3048)} ft`;
}

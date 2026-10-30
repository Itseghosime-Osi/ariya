"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Armchair,
  Box,
  Camera,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Hand,
  LayoutGrid,
  Maximize,
  Minus,
  Moon,
  MousePointer2,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Shapes,
  Sparkles,
  Square,
  Sun,
  Tag,
  Undo2,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateTableInput } from "../schemas";
import type { SeatingDeskData, TableShape, TableWithGuests } from "../types";
import { useHallLayout } from "./useHallLayout";
import {
  AREA_PER_DINER,
  SPACING_GAP,
  ZONE_DEFAULTS,
  chairPositions,
  chairType,
  clamp,
  defaultZones,
  footprint,
  formatFeet,
  gapBetween,
  gapToWalls,
  gapToZone,
  round2,
  styleOf,
  tableTop,
  toCm,
  toMetres,
  zoneId,
  type FreeChair,
  type HallLayout,
  type TableStyle,
  type Zone,
  type ZoneKind,
  type ZoneShape,
} from "./model";
import { findFreeSpot, fitTables, frontOf, nearestToFront } from "./fit";
import { planSeating } from "./autoseat";
import { autoArrange } from "./arrange";
import {
  Hall3D,
  type Hall3DHandle,
  type HallMessage,
  type Pick,
  type Scene,
} from "./Hall3D";
import {
  DecorPanel,
  FitPanel,
  GuestsPanel,
  RoomPanel,
  SeatPanel,
} from "./StudioPanels";
import {
  ChairInspector,
  MultiInspector,
  TableInspector,
  ZoneInspector,
  type Align,
} from "./Inspector";
import { ChairGlyph, ShapeGlyph, TableGlyph } from "./studio-ui";

type Positions = Record<string, { x: number; y: number }>;
type Deck = "guests" | "room" | "fit" | "seat" | "decor";
type Flyout = "table" | "chair" | "zone" | null;
type Move = { type: string; id: string; x: number; y: number };

const TABLE_PRESETS: {
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

const ZONE_GALLERY: {
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

const CHAIR_GROUPS = [
  { key: "one", label: "One chair", n: 1, spacing: 0 },
  { key: "two", label: "Couple’s chairs", n: 2, spacing: 0.7 },
  { key: "row", label: "Row of 6", n: 6, spacing: 0.55 },
];

interface HallStudioProps {
  eventId: string;
  data: SeatingDeskData;
  initialLayout: unknown;
  layoutAvailable: boolean;
  addTables: (items: CreateTableInput[]) => Promise<TableWithGuests[]>;
  updateTable: (
    id: string,
    patch: { name?: string; capacity?: number; shape?: TableShape }
  ) => Promise<void>;
  setTablePositions: (
    items: { id: string; x: number; y: number }[],
    persist?: boolean
  ) => Promise<void>;
  bulkAssign: (
    pairs: { guestId: string; tableId: string }[]
  ) => Promise<{ seated: number; failed: number }>;
  onAssignTable: (guestId: string, tableId: string | null) => void;
  onDeleteTable: (tableId: string) => void;
  /** Remove several tables without asking for each (shrinking a crowded hall). */
  deleteTables: (ids: string[]) => Promise<number>;
  /** A short message to show over the hall (saved, could not save…). */
  notice?: React.ReactNode;
}

function nextTableNames(tables: TableWithGuests[], count: number): string[] {
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

const isTyping = (el: EventTarget | null) =>
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
export function HallStudio({
  eventId,
  data,
  initialLayout,
  layoutAvailable,
  addTables,
  updateTable,
  setTablePositions,
  bulkAssign,
  onAssignTable,
  onDeleteTable,
  deleteTables,
  notice,
}: HallStudioProps) {
  const hall = useHallLayout({
    eventId,
    initialLayout,
    available: layoutAvailable,
  });
  const { layout } = hall;
  const view3d = useRef<Hall3DHandle>(null);
  const studio = useRef<HTMLElement>(null);
  const [tool, setTool] = useState<"select" | "hand">("select");
  const [selection, setSelection] = useState<Pick[]>([]);
  const [deck, setDeck] = useState<Deck>("guests");
  const [flyout, setFlyout] = useState<Flyout>(null);
  const [labels, setLabels] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [cam, setCam] = useState<{ pct: number; view: "top" | "3d" }>({
    pct: 100,
    view: "3d",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const say = (msg: string) => setAnnounce(msg);

  // The side panel can be tucked away for a bigger hall; the choice is remembered.
  const [panelOpen, setPanelOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("ariya:hall-panel") === "closed")
        setPanelOpen(false);
    } catch {
      /* no storage */
    }
  }, []);
  const togglePanel = (open?: boolean) =>
    setPanelOpen((cur) => {
      const next = open ?? !cur;
      try {
        localStorage.setItem("ariya:hall-panel", next ? "open" : "closed");
      } catch {
        /* not remembered */
      }
      return next;
    });
  // Selecting something brings the panel back: its design controls live there.
  useEffect(() => {
    if (selection.length > 0) togglePanel(true);
  }, [selection.length]);

  // How much of the hall the side panel covers, so "fit" centres the room in the visible part.
  const body = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // The 3D hall spans the whole screen behind the app's bars; this is how much of it each side
  // covers (sidebar, top bar and header, side panel and tool rail), so "fit" frames the room in
  // the part that is left.
  const [inset, setInset] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => {
      const p = panel.current;
      if (!p) return;
      const r = el.getBoundingClientRect();
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const outRight = Math.max(0, window.innerWidth - r.right);
      const outBottom = Math.max(0, window.innerHeight - r.bottom);
      const next = {
        left: Math.round(r.left),
        top: Math.round(r.top),
        right: Math.round(
          outRight + 70 + (wide && panelOpen ? p.offsetWidth + 12 : 0)
        ),
        bottom: Math.round(
          outBottom + (!wide && panelOpen ? p.offsetHeight + 12 : 0)
        ),
      };
      setInset((cur) =>
        cur.left === next.left &&
        cur.top === next.top &&
        cur.right === next.right &&
        cur.bottom === next.bottom
          ? cur
          : next
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [panelOpen]);

  // The daytime board takes the page's own background, so the hall sits on the page.
  const [pageBg, setPageBg] = useState("#f7f2ea");
  useEffect(() => {
    const m = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
    if (m && m.length >= 3)
      setPageBg(
        "#" +
          m
            .slice(0, 3)
            .map((n) => Number(n).toString(16).padStart(2, "0"))
            .join("")
      );
  }, []);
  // Evening darkens the whole page, not just the hall, while the studio is open.
  useEffect(() => {
    const html = document.documentElement;
    if (layout.mood === "evening") html.dataset.seatingMood = "evening";
    else delete html.dataset.seatingMood;
    return () => {
      delete html.dataset.seatingMood;
    };
  }, [layout.mood]);

  const positions: Positions = useMemo(() => {
    const out: Positions = {};
    for (const t of data.tables)
      out[t.id] = { x: toMetres(t.position_x), y: toMetres(t.position_y) };
    return out;
  }, [data.tables]);

  const gap = SPACING_GAP[layout.spacing];
  const rotationOf = useCallback(
    (id: string) => layout.rotations[id] ?? 0,
    [layout.rotations]
  );
  const fpOf = useCallback(
    (t: TableWithGuests, at = positions[t.id]) =>
      footprint(t.shape, t.capacity, at?.x ?? 0, at?.y ?? 0, rotationOf(t.id)),
    [positions, rotationOf]
  );
  const front = useMemo(
    () => frontOf(layout.zones, layout.width),
    [layout.zones, layout.width]
  );

  // Tables that were never placed (new ones sit at 0,0) are set down in free spots.
  const placing = useRef(new Set<string>());
  useEffect(() => {
    const unplaced = data.tables.filter(
      (t) =>
        t.position_x === 0 && t.position_y === 0 && !placing.current.has(t.id)
    );
    if (unplaced.length === 0) return;
    const obstacles = data.tables
      .filter((t) => !(t.position_x === 0 && t.position_y === 0))
      .map((t) => fpOf(t));
    const moves: { id: string; x: number; y: number }[] = [];
    for (const t of unplaced) {
      placing.current.add(t.id);
      const spot = findFreeSpot(
        {
          width: layout.width,
          length: layout.length,
          zones: layout.zones,
          obstacles,
          shape: t.shape,
          capacity: t.capacity,
          gap,
        },
        {
          x: front.x,
          y: Math.min(layout.length - 2, front.y + layout.length * 0.45),
        }
      ) ?? { x: layout.width / 2, y: layout.length / 2, rot: 0 };
      obstacles.push(footprint(t.shape, t.capacity, spot.x, spot.y, 0));
      moves.push({ id: t.id, x: toCm(spot.x), y: toCm(spot.y) });
    }
    void setTablePositions(moves);
  }, [
    data.tables,
    fpOf,
    gap,
    layout.length,
    layout.width,
    layout.zones,
    setTablePositions,
    front,
  ]);

  const warnings = useMemo(() => {
    const w: Record<string, string> = {};
    const fps = data.tables.map((t) => ({ id: t.id, f: fpOf(t) }));
    for (const { id, f } of fps) {
      if (gapToWalls(f, layout.width, layout.length) < 0) w[id] = "wall";
      for (const z of layout.zones)
        if (z.kind !== "entrance" && gapToZone(f, z) < 0) w[id] = "overlap";
    }
    for (let i = 0; i < fps.length; i++)
      for (let j = i + 1; j < fps.length; j++) {
        const g = gapBetween(fps[i].f, fps[j].f);
        const kind = g < 0 ? "overlap" : g < 0.3 ? "tight" : null;
        if (!kind) continue;
        for (const id of [fps[i].id, fps[j].id])
          if (w[id] !== "overlap") w[id] = kind;
      }
    return w;
  }, [data.tables, fpOf, layout]);

  // ---------- planning numbers ----------
  const guests = data.stats.seatedAttendees + data.stats.unseatedAttendees;
  const seats = data.tables.reduce((a, t) => a + t.capacity, 0);
  const area = layout.width * layout.length;
  const zoneArea = layout.zones.reduce((a, z) => a + z.w * z.h, 0);
  const fireGuide = Math.floor(Math.max(0, area - zoneArea) / AREA_PER_DINER);
  const [fitPreset, setFitPreset] = useState("r10");
  const [aisle, setAisle] = useState(true);
  const [buffer, setBuffer] = useState(10);
  const fitPresets = TABLE_PRESETS.filter(
    (p) => p.shape !== "head" && p.key !== "s4"
  );
  const preset = fitPresets.find((p) => p.key === fitPreset) ?? fitPresets[0];
  const fitEmpty = useMemo(
    () =>
      fitTables({
        width: layout.width,
        length: layout.length,
        zones: layout.zones,
        shape: preset.shape,
        capacity: preset.capacity,
        gap,
        aisle,
      }),
    [layout.width, layout.length, layout.zones, preset, gap, aisle]
  );
  const fitAround = useMemo(
    () =>
      fitTables({
        width: layout.width,
        length: layout.length,
        zones: layout.zones,
        obstacles: data.tables.map((t) => fpOf(t)),
        shape: preset.shape,
        capacity: preset.capacity,
        gap,
        aisle,
      }),
    [
      layout.width,
      layout.length,
      layout.zones,
      data.tables,
      fpOf,
      preset,
      gap,
      aisle,
    ]
  );
  const target = Math.ceil(guests * (1 + buffer / 100));
  const shortBy = Math.max(0, target - seats);
  const tablesNeeded = Math.ceil(shortBy / preset.capacity);

  const seatPlan = useMemo(() => {
    const units = data.unseatedGuests
      .filter((g) => g.status === "accepted")
      .map((g) => ({
        id: g.id,
        name: g.name,
        seats: g.attending_count,
        group: g.group_name || g.side || "Guests",
        vip: g.is_vip,
      }));
    const tables = data.tables.map((t) => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      occupied: t.occupiedSeats,
      shape: t.shape,
      x: positions[t.id]?.x ?? 0,
      y: positions[t.id]?.y ?? 0,
    }));
    return { units, plan: planSeating(units, tables, front) };
  }, [data.unseatedGuests, data.tables, positions, front]);

  // ---------- the scene the 3D hall draws ----------
  const scene: Scene = useMemo(
    () => ({
      layout,
      tables: data.tables.map((t) => ({
        id: t.id,
        name: t.name,
        shape: t.shape,
        capacity: t.capacity,
        occupied: t.occupiedSeats,
        x: positions[t.id]?.x ?? 0,
        y: positions[t.id]?.y ?? 0,
        rot: rotationOf(t.id),
        top: tableTop(t.shape, t.capacity),
        chairs: chairPositions(t.shape, t.capacity).map((c) => ({
          x: c.x,
          y: c.y,
        })),
        style: styleOf(layout, t.id),
      })),
      chairs: layout.chairs.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        rot: c.rot,
        type: chairType(c.chair ?? layout.decor.chair),
        cover: layout.decor.cover,
        sash: layout.decor.sash,
      })),
      selection,
      tool,
      labels,
      warnings,
      ghosts:
        deck === "fit" && selection.length === 0
          ? fitAround.placements.map((p) => ({
              ...p,
              top: tableTop(preset.shape, preset.capacity),
            }))
          : [],
      assigning: assigning !== null,
      board: pageBg,
      inset,
    }),
    [
      layout,
      data.tables,
      positions,
      rotationOf,
      selection,
      tool,
      labels,
      warnings,
      deck,
      fitAround,
      preset,
      assigning,
      pageBg,
      inset,
    ]
  );

  // ---------- edits ----------
  const updateLayout = (fn: (l: HallLayout) => HallLayout) =>
    hall.update(fn, positions);

  const restorePositions = (snap: Positions) => {
    const moves = Object.entries(snap)
      .filter(
        ([id, p]) =>
          positions[id] && (positions[id].x !== p.x || positions[id].y !== p.y)
      )
      .map(([id, p]) => ({ id, x: toCm(p.x), y: toCm(p.y) }));
    void setTablePositions(moves);
  };
  const undo = () => {
    const snap = hall.undo(positions);
    if (snap) {
      restorePositions(snap.positions);
      say("Undone");
    }
  };
  const redo = () => {
    const snap = hall.redo(positions);
    if (snap) {
      restorePositions(snap.positions);
      say("Redone");
    }
  };

  const selTables = selection
    .filter((s) => s.type === "table")
    .map((s) => data.tables.find((t) => t.id === s.id))
    .filter((t): t is TableWithGuests => !!t);
  const single = selection.length === 1 ? selection[0] : null;
  const selTable = single?.type === "table" ? selTables[0] : undefined;
  const selZone =
    single?.type === "zone"
      ? layout.zones.find((z) => z.id === single.id)
      : undefined;
  const selChair =
    single?.type === "chair"
      ? layout.chairs.find((c) => c.id === single.id)
      : undefined;

  const patchZone = (id: string, patch: Partial<Zone>) =>
    updateLayout((l) => ({
      ...l,
      zones: l.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    }));
  const patchChair = (id: string, patch: Partial<FreeChair>) =>
    updateLayout((l) => ({
      ...l,
      chairs: l.chairs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  const styleTables = (ids: string[], patch: TableStyle) =>
    updateLayout((l) => ({
      ...l,
      tableStyles: {
        ...l.tableStyles,
        ...Object.fromEntries(
          ids.map((id) => [id, { ...l.tableStyles[id], ...patch }])
        ),
      },
    }));

  const setRotation = (p: Pick, deg: number) => {
    const d = Math.round((((deg % 360) + 360) % 360) * 10) / 10;
    if (p.type === "table")
      updateLayout((l) => ({ ...l, rotations: { ...l.rotations, [p.id]: d } }));
    else if (p.type === "zone") patchZone(p.id, { rot: d });
    else patchChair(p.id, { rot: d });
  };
  const rotateBy = (delta: number) => {
    if (!single) return;
    const cur =
      single.type === "table"
        ? rotationOf(single.id)
        : single.type === "zone"
          ? (selZone?.rot ?? 0)
          : (selChair?.rot ?? 0);
    setRotation(single, cur + delta);
  };

  /** Move many things at once: tables go to the database, zones and chairs into the layout. */
  const moveItems = (items: Move[]) => {
    const tables = items.filter((i) => i.type === "table");
    const zones = new Map(
      items.filter((i) => i.type === "zone").map((i) => [i.id, i])
    );
    const chairs = new Map(
      items.filter((i) => i.type === "chair").map((i) => [i.id, i])
    );
    if (zones.size || chairs.size) {
      hall.update(
        (l) => ({
          ...l,
          zones: l.zones.map((z) => {
            const m = zones.get(z.id);
            return m ? { ...z, x: round2(m.x), y: round2(m.y) } : z;
          }),
          chairs: l.chairs.map((c) => {
            const m = chairs.get(c.id);
            return m ? { ...c, x: round2(m.x), y: round2(m.y) } : c;
          }),
        }),
        positions
      );
    } else if (tables.length) hall.remember(positions);
    if (tables.length)
      void setTablePositions(
        tables.map((t) => ({ id: t.id, x: toCm(t.x), y: toCm(t.y) }))
      );
  };

  const posOf = (p: Pick): { x: number; y: number } | undefined => {
    if (p.type === "table") return positions[p.id];
    if (p.type === "zone") return layout.zones.find((z) => z.id === p.id);
    return layout.chairs.find((c) => c.id === p.id);
  };

  const nudge = (dx: number, dy: number) => {
    const items: Move[] = [];
    for (const p of selection) {
      const at = posOf(p);
      if (at)
        items.push({
          type: p.type,
          id: p.id,
          x: round2(at.x + dx),
          y: round2(at.y + dy),
        });
    }
    if (items.length) moveItems(items);
  };

  const align = (a: Align) => {
    const pts: { p: Pick; at: { x: number; y: number } }[] = [];
    for (const p of selection) {
      const at = posOf(p);
      if (at) pts.push({ p, at });
    }
    if (pts.length < 2) return;
    const xs = pts.map((q) => q.at.x);
    const ys = pts.map((q) => q.at.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    let out: Move[];
    if (a === "space-x" || a === "space-y") {
      const k = a === "space-x" ? "x" : "y";
      const sorted = [...pts].sort((m, n) => m.at[k] - n.at[k]);
      const lo = k === "x" ? minX : minY;
      const hi = k === "x" ? maxX : maxY;
      out = sorted.map((q, i) => ({
        type: q.p.type,
        id: q.p.id,
        x: q.at.x,
        y: q.at.y,
        [k]: round2(lo + ((hi - lo) * i) / (sorted.length - 1)),
      }));
    } else {
      out = pts.map((q) => ({
        type: q.p.type,
        id: q.p.id,
        x:
          a === "left"
            ? minX
            : a === "right"
              ? maxX
              : a === "centre-x"
                ? round2((minX + maxX) / 2)
                : q.at.x,
        y:
          a === "top"
            ? minY
            : a === "bottom"
              ? maxY
              : a === "centre-y"
                ? round2((minY + maxY) / 2)
                : q.at.y,
      }));
    }
    moveItems(out);
    say("Lined up");
  };

  const placeNew = async (
    shape: TableShape,
    capacity: number,
    near?: { x: number; y: number },
    select = true
  ) => {
    const spot = findFreeSpot(
      {
        width: layout.width,
        length: layout.length,
        zones: layout.zones,
        obstacles: data.tables.map((t) => fpOf(t)),
        shape,
        capacity,
        gap,
      },
      near ?? {
        x: front.x,
        y: Math.min(layout.length - 2, front.y + layout.length * 0.45),
      }
    );
    if (!spot) {
      say("There is no free space left for another table of that size.");
      return;
    }
    const [name] = nextTableNames(data.tables, 1);
    const created = await addTables([
      {
        name,
        shape,
        capacity,
        position_x: toCm(spot.x),
        position_y: toCm(spot.y),
      },
    ]);
    if (created[0] && select)
      setSelection([{ type: "table", id: created[0].id }]);
  };

  const addChairs = (n: number, spacing: number) => {
    const cx = layout.width / 2;
    const cy = clamp(front.y + 4, 1, layout.length - 1);
    const stamp = Date.now().toString(36);
    const chairs: FreeChair[] = Array.from({ length: n }, (_, i) => ({
      id: `c${stamp}${i}`,
      x: round2(cx + (i - (n - 1) / 2) * spacing),
      y: round2(cy),
      rot: 0,
    }));
    updateLayout((l) => ({ ...l, chairs: [...l.chairs, ...chairs] }));
    setSelection(chairs.map((c) => ({ type: "chair", id: c.id })));
    say(`${n} ${n === 1 ? "chair" : "chairs"} added`);
  };

  const addZone = (g: (typeof ZONE_GALLERY)[number]) => {
    const def = ZONE_DEFAULTS[g.kind];
    const z: Zone = {
      id: zoneId(),
      kind: g.kind,
      label:
        g.kind === "dance"
          ? "Dance floor"
          : g.kind === "custom"
            ? g.label === "Custom table"
              ? "Custom table"
              : "Item"
            : def.label,
      x: round2(layout.width / 2),
      y: round2(layout.length / 2),
      w: g.w ?? def.w,
      h: g.h ?? def.h,
      ...(g.shape ? { shape: g.shape } : {}),
      ...(g.kind === "stage" ? { height: 0.8 } : {}),
      ...(g.kind === "custom"
        ? g.label === "Custom table"
          ? { variant: "table" as const, height: 0.76 }
          : { variant: "block" as const, height: 1 }
        : {}),
    };
    updateLayout((l) => ({ ...l, zones: [...l.zones, z] }));
    setSelection([{ type: "zone", id: z.id }]);
    say(`${z.label} added`);
  };

  const duplicate = () => {
    if (selTable)
      void placeNew(
        selTable.shape as TableShape,
        selTable.capacity,
        positions[selTable.id]
      );
    else if (selZone) {
      const copy = {
        ...selZone,
        id: zoneId(),
        x: round2(selZone.x + 1),
        y: round2(selZone.y + 1),
      };
      updateLayout((l) => ({ ...l, zones: [...l.zones, copy] }));
      setSelection([{ type: "zone", id: copy.id }]);
    } else if (selChair) {
      const copy = {
        ...selChair,
        id: `c${Date.now().toString(36)}`,
        x: round2(selChair.x + 0.6),
      };
      updateLayout((l) => ({ ...l, chairs: [...l.chairs, copy] }));
      setSelection([{ type: "chair", id: copy.id }]);
    }
  };

  const remove = () => {
    if (selection.length === 0) return;
    const zones = new Set(
      selection.filter((s) => s.type === "zone").map((s) => s.id)
    );
    const chairs = new Set(
      selection.filter((s) => s.type === "chair").map((s) => s.id)
    );
    if (zones.size || chairs.size)
      updateLayout((l) => ({
        ...l,
        zones: l.zones.filter((z) => !zones.has(z.id)),
        chairs: l.chairs.filter((c) => !chairs.has(c.id)),
      }));
    const tables = selection.filter((s) => s.type === "table");
    if (tables.length === 1) onDeleteTable(tables[0].id);
    else if (tables.length > 1)
      say("Delete tables one at a time, so nobody loses a seat by accident.");
    setSelection([]);
  };

  const fill = async (onlyNeeded: boolean, count?: number) => {
    const list =
      count !== undefined
        ? nearestToFront(fitAround.placements, front, count)
        : onlyNeeded
          ? nearestToFront(fitAround.placements, front, tablesNeeded)
          : fitAround.placements;
    if (list.length === 0) {
      say("There is no free space left for another table of that size.");
      return;
    }
    setBusy("fill");
    const names = nextTableNames(data.tables, list.length);
    const created = await addTables(
      list.slice(0, 200).map((p, i) => ({
        name: names[i],
        shape: preset.shape,
        capacity: preset.capacity,
        position_x: toCm(p.x),
        position_y: toCm(p.y),
      }))
    );
    if (created.length && list.some((p) => p.rot))
      updateLayout((l) => ({
        ...l,
        rotations: {
          ...l.rotations,
          ...Object.fromEntries(created.map((t, i) => [t.id, list[i].rot])),
        },
      }));
    setBusy(null);
    say(
      count !== undefined && list.length < count
        ? `Only ${created.length} more tables fit. Try snug spacing or smaller tables.`
        : `${created.length} tables added`
    );
  };

  /** Take away empty tables: the crowded ones first, then those furthest from the stage. */
  const removeTables = async (n: number) => {
    const empty = data.tables.filter(
      (t) => t.occupiedSeats === 0 && t.shape !== "head"
    );
    const far = (t: TableWithGuests) => {
      const p = positions[t.id] ?? { x: 0, y: 0 };
      return Math.hypot(p.x - front.x, p.y - front.y);
    };
    const pick = empty
      .sort(
        (a, b) =>
          Number(!!warnings[b.id] && warnings[b.id] !== "tight") -
            Number(!!warnings[a.id] && warnings[a.id] !== "tight") ||
          far(b) - far(a)
      )
      .slice(0, n);
    if (pick.length === 0) {
      say(
        "Every table has guests. Move guests off a table before removing it."
      );
      return;
    }
    setBusy("remove");
    setSelection([]);
    const removed = await deleteTables(pick.map((t) => t.id));
    setBusy(null);
    say(
      removed < n
        ? `${removed} empty ${removed === 1 ? "table" : "tables"} removed; the rest have guests.`
        : `${removed} ${removed === 1 ? "table" : "tables"} removed`
    );
  };

  /** Arrange the whole hall: areas in their usual places, tables packed in rows. */
  const autoLayout = () => {
    const r = autoArrange(
      layout,
      data.tables.map((t) => ({
        id: t.id,
        shape: t.shape,
        capacity: t.capacity,
        occupied: t.occupiedSeats,
      })),
      gap
    );
    hall.update(
      (l) => ({
        ...l,
        zones: r.zones,
        rotations: {
          ...l.rotations,
          ...Object.fromEntries(
            Object.entries(r.positions).map(([id, p]) => [id, p.rot])
          ),
        },
      }),
      positions
    );
    void setTablePositions(
      Object.entries(r.positions).map(([id, p]) => ({
        id,
        x: toCm(p.x),
        y: toCm(p.y),
      }))
    );
    setSelection([]);
    view3d.current?.command("fit");
    say(
      r.unplaced.length
        ? `Hall arranged. ${r.unplaced.length} ${r.unplaced.length === 1 ? "table does" : "tables do"} not fit; remove some or use snug spacing.`
        : "Hall arranged. Undo if you prefer how it was."
    );
    return r;
  };

  /** Auto layout, then take away empty tables that still have no room. */
  const fixCrowding = async () => {
    const r = autoLayout();
    const removable = r.unplaced.filter(
      (id) => data.tables.find((t) => t.id === id)?.occupiedSeats === 0
    );
    if (removable.length) {
      setBusy("remove");
      const removed = await deleteTables(removable);
      setBusy(null);
      say(
        `Hall arranged and ${removed} empty ${removed === 1 ? "table" : "tables"} without room removed.`
      );
    }
  };

  const seatEveryone = async () => {
    setBusy("seat");
    await bulkAssign(seatPlan.plan.assignments);
    setBusy(null);
  };

  const assignTo = (guestId: string, tableId: string) => {
    onAssignTable(guestId, tableId);
    setAssigning(null);
  };

  // ---------- keyboard (from the page, or forwarded by the 3D hall) ----------
  type Key = { key: string; shift: boolean; ctrl: boolean; meta: boolean };
  const keyRef = useRef<(k: Key) => boolean>(() => false);
  keyRef.current = ({ key, shift, ctrl, meta }) => {
    const mod = ctrl || meta;
    const step = shift ? 1 : 0.1;
    const k = key.toLowerCase();
    if (mod && k === "z") {
      if (shift) redo();
      else undo();
    } else if (mod && k === "y") redo();
    else if (mod && k === "d") duplicate();
    else if (mod) return false;
    else if (key === "Escape") {
      if (assigning) setAssigning(null);
      else if (flyout) setFlyout(null);
      else setSelection([]);
    } else if (k === "v") setTool("select");
    else if (k === "h") setTool("hand");
    else if (key === "\\") togglePanel();
    else if (key === "Delete" || key === "Backspace") remove();
    else if (k === "r") rotateBy(shift ? -15 : 15);
    else if (key === "ArrowLeft") nudge(-step, 0);
    else if (key === "ArrowRight") nudge(step, 0);
    else if (key === "ArrowUp") nudge(0, -step);
    else if (key === "ArrowDown") nudge(0, step);
    else if (key === "+" || key === "=") view3d.current?.command("zoomIn");
    else if (key === "-" || key === "_") view3d.current?.command("zoomOut");
    else if (key === "0") view3d.current?.command("fit");
    else return false;
    return true;
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        isTyping(e.target) ||
        !studio.current?.contains(document.activeElement)
      )
        return;
      if (
        keyRef.current({
          key: e.key,
          shift: e.shiftKey,
          ctrl: e.ctrlKey,
          meta: e.metaKey,
        })
      )
        e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onMessage = (m: HallMessage) => {
    if (m.t === "select" && m.items) {
      setSelection(m.items.map(({ type, id }) => ({ type, id })));
      setFlyout(null);
    } else if (m.t === "move" && m.items)
      moveItems(
        m.items.map((i) => ({
          type: i.type,
          id: i.id,
          x: i.x ?? 0,
          y: i.y ?? 0,
        }))
      );
    else if (m.t === "rotate" && m.type && m.id)
      setRotation({ type: m.type, id: m.id }, m.rot ?? 0);
    else if (m.t === "tableClick" && m.id && assigning)
      assignTo(assigning, m.id);
    else if (m.t === "key" && m.key)
      keyRef.current({
        key: m.key,
        shift: !!m.shift,
        ctrl: !!m.ctrl,
        meta: !!m.meta,
      });
    else if (m.t === "camera")
      setCam({ pct: m.pct ?? 100, view: m.view ?? "3d" });
  };

  const layers = [
    ...layout.zones.map((z) => ({
      pick: { type: "zone" as const, id: z.id },
      label: z.label,
      meta: `${round2(z.w)} × ${round2(z.h)} m`,
    })),
    ...data.tables.map((t) => ({
      pick: { type: "table" as const, id: t.id },
      label: t.name,
      meta: `${t.occupiedSeats}/${t.capacity}`,
    })),
    ...layout.chairs.map((c, i) => ({
      pick: { type: "chair" as const, id: c.id },
      label: `Chair ${i + 1}`,
      meta: "chair",
    })),
  ];

  const warnCount = Object.values(warnings).filter((w) => w !== "tight").length;
  const unseatedSeats = data.unseatedGuests.reduce(
    (a, g) => a + g.attending_count,
    0
  );
  const evening = layout.mood === "evening";

  const rail =
    "grid h-11 w-11 place-items-center rounded-full text-night transition-colors hover:bg-[#f1ece4] aria-pressed:bg-night aria-pressed:text-white aria-expanded:bg-night aria-expanded:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";
  const chip =
    "grid h-10 w-10 place-items-center rounded-full text-night transition-colors hover:bg-[#f1ece4] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";
  const float =
    "rounded-full border border-black/[0.06] bg-white/95 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_30px_-12px_rgba(28,7,13,0.35)] backdrop-blur";
  const card =
    "rounded-xl border border-hairline text-[11px] font-medium text-night transition-all hover:-translate-y-px hover:border-night/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy motion-reduce:hover:translate-y-0";

  const tiles: {
    key: Deck;
    label: string;
    icon: React.ElementType;
    stat: React.ReactNode;
  }[] = [
    {
      key: "guests",
      label: "Guests",
      icon: Users,
      stat: unseatedSeats ? `${unseatedSeats} to seat` : "All seated",
    },
    {
      key: "room",
      label: "Room",
      icon: Ruler,
      stat: `${layout.width} × ${layout.length} m`,
    },
    {
      key: "fit",
      label: "Fit",
      icon: LayoutGrid,
      stat: `${fitEmpty.count} fit`,
    },
    {
      key: "seat",
      label: "Seat",
      icon: Wand2,
      stat: `${data.stats.readinessPct}% done`,
    },
    {
      key: "decor",
      label: "Décor",
      icon: Palette,
      stat: (
        <span className="flex justify-center -space-x-1" aria-hidden="true">
          {[
            layout.decor.linen,
            layout.decor.sash ?? layout.decor.linen,
            layout.decor.flower,
          ].map((c, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full ring-2 ring-current"
              style={{ background: c }}
            />
          ))}
        </span>
      ),
    },
  ];

  return (
    <section
      ref={studio}
      aria-label="Hall studio"
      className={cn("relative flex min-h-0 flex-1 flex-col text-night")}
      data-testid="hall-studio"
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {/* The hall fills the whole studio; the controls and the side panel float over it, so
          panning never crops it at a box edge. */}
      <div ref={body} className="relative min-h-0 flex-1">
        <Hall3D
          ref={view3d}
          scene={scene}
          onMessage={onMessage}
          className="fixed inset-0 z-0"
        />
        {/* Canvas controls */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-[right,bottom] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            panelOpen && "max-lg:bottom-[calc(44%+0.75rem)] lg:right-[372px]"
          )}
        >
          {/* Hall size, live numbers and status */}
          <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-15rem)] flex-col items-start gap-1.5">
            <div
              className={cn(
                float,
                "pointer-events-auto flex max-w-full items-center gap-x-4 overflow-hidden rounded-2xl px-4 py-2"
              )}
            >
              <p className="whitespace-nowrap text-sm font-semibold">
                {layout.width} × {layout.length} m
                <span className="ml-1.5 hidden text-[11px] font-normal text-label-2 2xl:inline">
                  {formatFeet(layout.width)} × {formatFeet(layout.length)}
                  {hall.saving
                    ? " · saving…"
                    : hall.storedLocally
                      ? " · saved on this device"
                      : ""}
                </span>
              </p>
              <dl className="hidden gap-x-4 xl:flex" data-testid="hall-meter">
                {[
                  {
                    k: "Guests",
                    v: guests,
                    note: buffer ? `${target} with buffer` : undefined,
                  },
                  {
                    k: "Seats",
                    v: seats,
                    note:
                      seats >= target ? "enough" : `${target - seats} short`,
                    bad: seats < target,
                  },
                  { k: "Hall fits", v: fitEmpty.seats, wide: true },
                  { k: "Fire guide", v: fireGuide, note: "max", wide: true },
                ].map((m) => (
                  <div
                    key={m.k}
                    className={cn(
                      "items-baseline gap-1 whitespace-nowrap",
                      "wide" in m ? "hidden 2xl:flex" : "flex"
                    )}
                  >
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-label-2">
                      {m.k}
                    </dt>
                    <dd className="flex items-baseline gap-1">
                      <span className="text-sm font-bold tabular-nums">
                        {m.v}
                      </span>
                      {m.note && (
                        <span
                          className={cn(
                            "text-[10px]",
                            m.bad ? "text-[#9e2a2b]" : "text-label-2"
                          )}
                        >
                          {m.note}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {assigning && (
                <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-burgundy py-1.5 pl-3 pr-1.5 text-xs font-semibold text-white shadow-lg">
                  Click a table for{" "}
                  {data.unseatedGuests.find((g) => g.id === assigning)?.name}
                  <button
                    type="button"
                    onClick={() => setAssigning(null)}
                    className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/20"
                    aria-label="Stop choosing a table"
                  >
                    <X size={13} />
                  </button>
                </span>
              )}
              {warnCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelection([]);
                    setDeck("fit");
                  }}
                  className={cn(
                    float,
                    "pointer-events-auto px-3 py-1.5 text-[11px] font-semibold text-[#9e2a2b] hover:bg-white"
                  )}
                >
                  {warnCount} {warnCount === 1 ? "table needs" : "tables need"}{" "}
                  more space · Fix
                </button>
              )}
              {data.tables.length === 0 && !assigning && (
                <span
                  className={cn(
                    float,
                    "pointer-events-auto px-3 py-1.5 text-[11px] font-semibold text-night"
                  )}
                >
                  Add tables from the toolbar, or use Fit to fill the hall
                </span>
              )}
            </div>
          </div>

          {/* Undo, redo, picture */}
          <div
            className={cn(
              float,
              "pointer-events-auto absolute right-3 top-3 flex items-center gap-0.5 p-1"
            )}
          >
            <button
              type="button"
              className={chip}
              onClick={undo}
              disabled={!hall.canUndo}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={17} />
            </button>
            <button
              type="button"
              className={chip}
              onClick={redo}
              disabled={!hall.canRedo}
              aria-label="Redo"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 size={17} />
            </button>
            <span className="mx-0.5 h-5 w-px bg-hairline" aria-hidden="true" />
            <button
              type="button"
              className={chip}
              onClick={() => view3d.current?.command("snapshot")}
              aria-label="Save a picture of the hall"
              title="Save a picture"
            >
              <Camera size={17} />
            </button>
            <span className="mx-0.5 h-5 w-px bg-hairline" aria-hidden="true" />
            {/* With the panel tucked away, its tools wait here: one click springs it open on one. */}
            {!panelOpen &&
              tiles.map(({ key, label, icon: I }, n) => (
                <button
                  key={key}
                  type="button"
                  className={cn(chip, "hall-pop")}
                  style={{ animationDelay: `${n * 45}ms` }}
                  onClick={() => {
                    setSelection([]);
                    setDeck(key);
                    togglePanel(true);
                  }}
                  aria-label={`Open ${label}`}
                  title={label}
                >
                  <I size={17} />
                </button>
              ))}
            <button
              type="button"
              className={cn(
                chip,
                "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-90",
                !panelOpen && "bg-night text-white hover:bg-burgundy"
              )}
              onClick={() => togglePanel()}
              aria-pressed={!panelOpen}
              aria-label={
                panelOpen ? "Hide the side panel" : "Show the side panel"
              }
              title={
                panelOpen
                  ? "Hide the panel for a bigger hall (\\)"
                  : "Show the panel (\\)"
              }
            >
              {panelOpen ? (
                <PanelRightClose size={17} />
              ) : (
                <PanelRightOpen size={17} />
              )}
            </button>
          </div>

          {notice && (
            <div
              role="status"
              className={cn(
                float,
                "pointer-events-none absolute bottom-20 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 px-4 py-2 text-xs font-semibold"
              )}
            >
              {notice}
            </div>
          )}

          {/* Tool rail */}
          <div
            role="toolbar"
            aria-label="Hall tools"
            aria-orientation="vertical"
            className={cn(
              float,
              "pointer-events-auto absolute right-3 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 rounded-[26px] p-1.5"
            )}
          >
            <button
              type="button"
              className={rail}
              aria-pressed={tool === "select"}
              onClick={() => setTool("select")}
              aria-label="Select and move"
              title="Select and move (V)"
            >
              <MousePointer2 size={18} />
            </button>
            <button
              type="button"
              className={rail}
              aria-pressed={tool === "hand"}
              onClick={() => setTool("hand")}
              aria-label="Pan around"
              title="Pan around (H, or hold Space)"
            >
              <Hand size={18} />
            </button>
            <button
              type="button"
              className={rail}
              onClick={autoLayout}
              disabled={busy !== null}
              aria-label="Auto layout"
              title="Auto layout: arrange the hall for you"
            >
              <Sparkles size={18} />
            </button>
            <span className="my-0.5 h-px w-6 bg-hairline" aria-hidden="true" />
            <button
              type="button"
              className={rail}
              aria-expanded={flyout === "table"}
              onClick={() => setFlyout(flyout === "table" ? null : "table")}
              aria-label="Add a table"
              title="Add a table"
            >
              <CirclePlus size={18} />
            </button>
            <button
              type="button"
              className={rail}
              aria-expanded={flyout === "chair"}
              onClick={() => setFlyout(flyout === "chair" ? null : "chair")}
              aria-label="Add chairs"
              title="Add chairs"
            >
              <Armchair size={18} />
            </button>
            <button
              type="button"
              className={rail}
              aria-expanded={flyout === "zone"}
              onClick={() => setFlyout(flyout === "zone" ? null : "zone")}
              aria-label="Add a stage, dance floor or area"
              title="Add a stage, dance floor or area"
            >
              <Shapes size={18} />
            </button>
            <span className="my-0.5 h-px w-6 bg-hairline" aria-hidden="true" />
            <button
              type="button"
              className={rail}
              aria-pressed={deck === "decor" && selection.length === 0}
              onClick={() => {
                setSelection([]);
                setDeck("decor");
              }}
              aria-label="Décor"
              title="Décor"
            >
              <Palette size={18} />
            </button>
            <button
              type="button"
              className={rail}
              aria-pressed={labels}
              onClick={() => setLabels((v) => !v)}
              aria-label="Show table names"
              title="Show table names"
            >
              <Tag size={18} />
            </button>
            <button
              type="button"
              className={rail}
              onClick={() =>
                updateLayout((l) => ({
                  ...l,
                  mood: l.mood === "evening" ? "day" : "evening",
                }))
              }
              aria-label={
                evening ? "Switch to daytime light" : "Switch to evening light"
              }
              title={evening ? "Daytime light" : "Evening light"}
            >
              {evening ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Flyouts */}
          {flyout && (
            <div
              className="pointer-events-auto absolute right-[4.25rem] top-1/2 z-10 w-[min(300px,calc(100%-6rem))] -translate-y-1/2 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_20px_50px_-20px_rgba(28,7,13,0.45)]"
              role="dialog"
              aria-label={
                flyout === "table"
                  ? "Add a table"
                  : flyout === "chair"
                    ? "Add chairs"
                    : "Add an area"
              }
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-label-2">
                  {flyout === "table"
                    ? "Tables"
                    : flyout === "chair"
                      ? "Chairs"
                      : "Stage, floor & areas"}
                </p>
                <button
                  type="button"
                  onClick={() => setFlyout(null)}
                  className="grid h-7 w-7 place-items-center rounded-full hover:bg-[#f1ece4]"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
              {flyout === "table" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {TABLE_PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setFlyout(null);
                        void placeNew(p.shape, p.capacity);
                      }}
                      className={cn(
                        card,
                        "flex flex-col items-center gap-1 px-1 py-2"
                      )}
                    >
                      <TableGlyph
                        shape={p.shape}
                        seats={p.capacity}
                        size={36}
                      />
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              {flyout === "chair" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {CHAIR_GROUPS.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      onClick={() => {
                        setFlyout(null);
                        addChairs(g.n, g.spacing);
                      }}
                      className={cn(
                        card,
                        "flex flex-col items-center gap-1 px-1 py-2.5"
                      )}
                    >
                      <span className="flex">
                        {Array.from({ length: Math.min(g.n, 3) }, (_, i) => (
                          <ChairGlyph
                            key={i}
                            type={layout.decor.chair}
                            size={g.n > 1 ? 18 : 26}
                          />
                        ))}
                      </span>
                      {g.label}
                    </button>
                  ))}
                  <p className="col-span-3 mt-1 text-[11px] text-label-2">
                    New chairs use the hall’s chair style; change any of them in
                    the inspector.
                  </p>
                </div>
              )}
              {flyout === "zone" && (
                <div className="grid max-h-[340px] grid-cols-2 gap-1.5 overflow-y-auto">
                  {ZONE_GALLERY.map((g) => (
                    <button
                      key={g.label}
                      type="button"
                      onClick={() => {
                        setFlyout(null);
                        addZone(g);
                      }}
                      className={cn(
                        card,
                        "flex items-center gap-2 px-2 py-2 text-left"
                      )}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f6f1e8] text-burgundy">
                        <ShapeGlyph shape={g.shape ?? "rect"} size={18} />
                      </span>
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Zoom and camera */}
          <div className="pointer-events-auto absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
            <div className={cn(float, "flex items-center gap-0.5 p-1")}>
              <button
                type="button"
                className={chip}
                onClick={() => view3d.current?.command("zoomOut")}
                aria-label="Zoom out"
                title="Zoom out (−)"
              >
                <Minus size={17} />
              </button>
              <span
                className="w-12 text-center text-xs font-semibold tabular-nums text-night"
                aria-hidden="true"
              >
                {cam.pct}%
              </span>
              <button
                type="button"
                className={chip}
                onClick={() => view3d.current?.command("zoomIn")}
                aria-label="Zoom in"
                title="Zoom in (+)"
              >
                <Plus size={17} />
              </button>
              <span
                className="mx-0.5 h-5 w-px bg-hairline"
                aria-hidden="true"
              />
              <button
                type="button"
                className={chip}
                onClick={() => view3d.current?.command("fit")}
                aria-label="Fit the hall in view"
                title="Fit (0)"
              >
                <Maximize size={16} />
              </button>
            </div>
            <div
              className={cn(float, "flex items-center gap-0.5 p-1")}
              role="radiogroup"
              aria-label="Camera"
            >
              {(
                [
                  ["top", "Top", Square, "top"],
                  ["3d", "3D", Box, "perspective"],
                ] as const
              ).map(([k, l, I, cmd]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={cam.view === k}
                  onClick={() => view3d.current?.command(cmd)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-night transition-colors hover:bg-[#f1ece4] aria-checked:bg-night aria-checked:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                >
                  <I size={15} /> {l}
                </button>
              ))}
              <button
                type="button"
                className={chip}
                onClick={() => view3d.current?.command("rotateLeft")}
                aria-label="Turn the view left"
                title="Turn the view (or drag empty space)"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                className={chip}
                onClick={() => view3d.current?.command("rotateRight")}
                aria-label="Turn the view right"
                title="Turn the view (or drag empty space)"
              >
                <RotateCw size={16} />
              </button>
              <button
                type="button"
                className={chip}
                onClick={() => view3d.current?.command("tiltUp")}
                aria-label="Look down from higher"
                title="Look from higher (or drag down on empty space)"
              >
                <ChevronUp size={17} />
              </button>
              <button
                type="button"
                className={chip}
                onClick={() => view3d.current?.command("tiltDown")}
                aria-label="Look from lower"
                title="Look from lower, down to eye level"
              >
                <ChevronDown size={17} />
              </button>
            </div>
          </div>
        </div>

        {/* Side bar: planning tools and the inspector */}
        <div
          ref={panel}
          inert={!panelOpen}
          aria-hidden={!panelOpen || undefined}
          className={cn(
            "absolute inset-x-0 bottom-0 flex h-[44%] min-h-0 flex-col overflow-hidden rounded-[22px] border border-hairline bg-[#fbf9f5] shadow-[0_0_0_rgba(0,0,0,0)] transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-0 lg:h-auto lg:w-[360px]",
            !panelOpen &&
              "pointer-events-none translate-y-[calc(100%+1rem)] scale-[0.98] opacity-0 blur-[2px] lg:translate-x-[calc(100%+1.5rem)] lg:translate-y-0"
          )}
        >
          <div
            role="tablist"
            aria-label="Planning tools"
            className="grid grid-cols-5 gap-1 border-b border-hairline p-2"
          >
            {tiles.map(({ key, label, icon: I, stat }) => {
              const on = deck === key && selection.length === 0;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`hall-tab-${key}`}
                  aria-selected={on}
                  aria-controls="hall-panel"
                  onClick={() => {
                    setSelection([]);
                    setDeck(key);
                  }}
                  className={cn(
                    "group relative flex min-h-[76px] flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl px-1 text-center transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                    on
                      ? "bg-night text-white shadow-[0_8px_20px_-10px_rgba(28,7,13,0.7)]"
                      : "text-night hover:bg-white hover:shadow-sm"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full transition-transform group-hover:scale-110 motion-reduce:transition-none",
                      on
                        ? "bg-white/10 text-[#e9c98a]"
                        : "bg-white text-burgundy shadow-sm"
                    )}
                  >
                    <I size={16} />
                  </span>
                  <span className="text-[11px] font-semibold leading-none">
                    {label}
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate px-0.5 text-[10px] leading-none",
                      on ? "text-white/80" : "text-label-2"
                    )}
                  >
                    {stat}
                  </span>
                </button>
              );
            })}
          </div>
          <div
            key={single ? `${single.type}:${single.id}` : `deck:${deck}`}
            id="hall-panel"
            role="tabpanel"
            aria-labelledby={`hall-tab-${deck}`}
            className="min-h-0 flex-1 overflow-y-auto bg-white"
          >
            {selTable ? (
              <TableInspector
                table={selTable}
                layout={layout}
                pos={positions[selTable.id] ?? { x: 0, y: 0 }}
                rot={rotationOf(selTable.id)}
                onClose={() => setSelection([])}
                onRotate={rotateBy}
                onRot={(d) =>
                  setRotation({ type: "table", id: selTable.id }, d)
                }
                onMove={(x, y) =>
                  moveItems([{ type: "table", id: selTable.id, x, y }])
                }
                onDuplicate={duplicate}
                onDelete={remove}
                onUpdate={(patch) => void updateTable(selTable.id, patch)}
                onStyle={(patch) => styleTables([selTable.id], patch)}
                onStyleAll={() => {
                  const st = styleOf(layout, selTable.id);
                  updateLayout((l) => ({
                    ...l,
                    tableStyles: {},
                    decor: {
                      ...l.decor,
                      linen: st.cloth,
                      chair: st.chair,
                      cover: st.cover,
                      sash: st.sash,
                      centrepiece: st.centrepiece,
                      flower: st.flower,
                    },
                  }));
                  say("Every table now has this look");
                }}
                onResetStyle={() =>
                  updateLayout((l) => {
                    const rest = { ...l.tableStyles };
                    delete rest[selTable.id];
                    return { ...l, tableStyles: rest };
                  })
                }
                onUnseat={(guestId) => onAssignTable(guestId, null)}
              />
            ) : selZone ? (
              <ZoneInspector
                zone={selZone}
                layout={layout}
                onClose={() => setSelection([])}
                onChange={(p) => patchZone(selZone.id, p)}
                onRotate={rotateBy}
                onDuplicate={duplicate}
                onDelete={remove}
              />
            ) : selChair ? (
              <ChairInspector
                chair={selChair}
                layout={layout}
                onClose={() => setSelection([])}
                onChange={(p) => patchChair(selChair.id, p)}
                onRotate={rotateBy}
                onDuplicate={duplicate}
                onDelete={remove}
              />
            ) : selection.length > 1 ? (
              <MultiInspector
                count={selection.length}
                tables={selTables.length}
                onClose={() => setSelection([])}
                onAlign={align}
                onDelete={remove}
                onStyle={(p) =>
                  styleTables(
                    selTables.map((t) => t.id),
                    p
                  )
                }
              />
            ) : deck === "guests" ? (
              <GuestsPanel
                guests={data.unseatedGuests}
                tables={data.tables}
                assigning={assigning}
                onStartAssign={setAssigning}
                onAssign={assignTo}
                onFocusTable={(id) => {
                  setSelection([{ type: "table", id }]);
                  view3d.current?.focus(`table:${id}`);
                }}
              />
            ) : deck === "room" ? (
              <RoomPanel
                layout={layout}
                onChange={(patch) => updateLayout((l) => ({ ...l, ...patch }))}
                onResetZones={() =>
                  updateLayout((l) => ({
                    ...l,
                    zones: defaultZones(l.width, l.length),
                  }))
                }
                layers={layers}
                selection={selection}
                onSelectLayer={(p) => {
                  setSelection([p]);
                  view3d.current?.focus(`${p.type}:${p.id}`);
                }}
              />
            ) : deck === "fit" ? (
              <FitPanel
                presets={fitPresets}
                preset={preset}
                onPreset={setFitPreset}
                fitEmpty={fitEmpty}
                fitAround={fitAround}
                aisle={aisle}
                onAisle={setAisle}
                buffer={buffer}
                onBuffer={setBuffer}
                target={target}
                shortBy={shortBy}
                tablesNeeded={tablesNeeded}
                gap={gap}
                busy={busy}
                onFill={fill}
                tableCount={data.tables.length}
                emptyCount={
                  data.tables.filter((t) => t.occupiedSeats === 0).length
                }
                crowded={warnCount}
                onAddOne={() =>
                  void placeNew(preset.shape, preset.capacity, undefined, false)
                }
                onRemove={(n) => void removeTables(n)}
                onFixCrowding={() => void fixCrowding()}
                onAutoLayout={autoLayout}
              />
            ) : deck === "seat" ? (
              <SeatPanel
                plan={seatPlan.plan}
                units={seatPlan.units}
                readiness={data.stats.readinessPct}
                busy={busy}
                onSeat={seatEveryone}
              />
            ) : (
              <DecorPanel
                layout={layout}
                onDecor={(decor) => updateLayout((l) => ({ ...l, decor }))}
                onLayout={(patch) => updateLayout((l) => ({ ...l, ...patch }))}
                styledCount={Object.keys(layout.tableStyles).length}
                onResetTables={() =>
                  updateLayout((l) => ({ ...l, tableStyles: {} }))
                }
              />
            )}
          </div>
          <p className="hidden border-t border-hairline px-4 py-2 text-[11px] leading-snug text-label-2 lg:block">
            Drag a table to move it · drag empty space to turn the hall ·
            right-drag or Space to pan · Shift-drag to select many
          </p>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Copy,
  Download,
  Eye,
  LayoutGrid,
  MonitorSmartphone,
  Palette,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Ruler,
  Sparkles,
  Trash2,
  Undo2,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateTableInput } from "../schemas";
import type { SeatingDeskData, TableShape, TableWithGuests } from "../types";
import { UnseatedGuestList } from "../components/UnseatedGuestList";
import { HallPlan, type Selection, type Warning } from "./HallPlan";
import { HallDecorated } from "./HallDecorated";
import { useHallLayout } from "./useHallLayout";
import {
  AREA_PER_DINER,
  DECOR_PRESETS,
  HALL_PRESETS,
  SPACING_GAP,
  ZONE_DEFAULTS,
  clamp,
  defaultZones,
  footprint,
  formatFeet,
  gapBetween,
  gapToWalls,
  gapToZone,
  round2,
  tableSizeLabel,
  toCm,
  toMetres,
  zoneId,
  type ChairStyle,
  type Centrepiece,
  type Decor,
  type FloorFinish,
  type HallLayout,
  type Spacing,
  type ZoneKind,
} from "./model";
import { findFreeSpot, fitTables, frontOf, nearestToFront } from "./fit";
import { planSeating } from "./autoseat";

type Positions = Record<string, { x: number; y: number }>;

const TABLE_PRESETS: {
  key: string;
  label: string;
  shape: TableShape;
  capacity: number;
}[] = [
  { key: "r10", label: "Round · 10 seats (60″)", shape: "round", capacity: 10 },
  { key: "r8", label: "Round · 8 seats (60″)", shape: "round", capacity: 8 },
  { key: "r12", label: "Round · 12 seats (72″)", shape: "round", capacity: 12 },
  {
    key: "b8",
    label: "Banquet · 8 seats (8 ft)",
    shape: "rectangular",
    capacity: 8,
  },
  {
    key: "b10",
    label: "Banquet · 10 seats",
    shape: "rectangular",
    capacity: 10,
  },
  { key: "o10", label: "Oval · 10 seats", shape: "oval", capacity: 10 },
  { key: "h8", label: "High table · 8 seats", shape: "head", capacity: 8 },
];

const ZONE_KINDS: ZoneKind[] = [
  "stage",
  "dance",
  "buffet",
  "bar",
  "dj",
  "entrance",
  "gifts",
  "photo",
  "pillar",
];

type Tab = "guests" | "room" | "fit" | "seat" | "decor";

interface HallStudioProps {
  eventId: string;
  data: SeatingDeskData;
  initialLayout: unknown;
  layoutAvailable: boolean;
  addTables: (items: CreateTableInput[]) => Promise<TableWithGuests[]>;
  setTablePositions: (
    items: { id: string; x: number; y: number }[],
    persist?: boolean
  ) => Promise<void>;
  bulkAssign: (
    pairs: { guestId: string; tableId: string }[]
  ) => Promise<{ seated: number; failed: number }>;
  onAssignTable: (guestId: string, tableId: string) => void;
  onEditTable: (table: TableWithGuests) => void;
  onDeleteTable: (tableId: string) => void;
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

/**
 * The hall studio: the event's real room to scale, a live capacity meter, tables and zones to
 * drag, "fill the hall" and "seat everyone" helpers, and a decorated night view of the result.
 */
export function HallStudio({
  eventId,
  data,
  initialLayout,
  layoutAvailable,
  addTables,
  setTablePositions,
  bulkAssign,
  onAssignTable,
  onEditTable,
  onDeleteTable,
}: HallStudioProps) {
  const hall = useHallLayout({
    eventId,
    initialLayout,
    available: layoutAvailable,
  });
  const { layout } = hall;
  const [view, setView] = useState<"plan" | "decorated">("plan");
  const [tab, setTab] = useState<Tab>("guests");
  const [selected, setSelected] = useState<Selection>(null);
  const [menu, setMenu] = useState<"table" | "zone" | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [hideNarrowTip, setHideNarrowTip] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const mq = window.matchMedia(
      "(max-width: 767px), (pointer: coarse) and (max-width: 1023px)"
    );
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

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

  // Tables that have never been placed (new ones sit at 0,0) are set down in free spots.
  const placing = useRef(new Set<string>());
  useEffect(() => {
    const unplaced = data.tables.filter(
      (t) =>
        t.position_x === 0 && t.position_y === 0 && !placing.current.has(t.id)
    );
    if (unplaced.length === 0) return;
    const placed = data.tables.filter(
      (t) => !(t.position_x === 0 && t.position_y === 0)
    );
    const obstacles = placed.map((t) => fpOf(t));
    const front = frontOf(layout.zones, layout.width);
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
  ]);

  const warnings = useMemo(() => {
    const w: Record<string, Warning> = {};
    const fps = data.tables.map((t) => ({ id: t.id, f: fpOf(t) }));
    for (const { id, f } of fps) {
      if (gapToWalls(f, layout.width, layout.length) < 0) w[id] = "wall";
      for (const z of layout.zones) if (gapToZone(f, z) < 0) w[id] = "overlap";
    }
    for (let i = 0; i < fps.length; i++)
      for (let j = i + 1; j < fps.length; j++) {
        const g = gapBetween(fps[i].f, fps[j].f);
        const kind: Warning | null =
          g < 0 ? "overlap" : g < 0.3 ? "tight" : null;
        if (!kind) continue;
        for (const id of [fps[i].id, fps[j].id])
          if (w[id] !== "overlap") w[id] = kind;
      }
    return w;
  }, [data.tables, fpOf, layout]);

  // ---------- capacity meter ----------
  const guests = data.stats.seatedAttendees + data.stats.unseatedAttendees;
  const seats = data.tables.reduce((a, t) => a + t.capacity, 0);
  const area = layout.width * layout.length;
  const zoneArea = layout.zones.reduce((a, z) => a + z.w * z.h, 0);
  const fireGuide = Math.floor(Math.max(0, area - zoneArea) / AREA_PER_DINER);

  const [fitPreset, setFitPreset] = useState("r10");
  const [aisle, setAisle] = useState(true);
  const [buffer, setBuffer] = useState(10);
  const preset =
    TABLE_PRESETS.find((p) => p.key === fitPreset) ?? TABLE_PRESETS[0];
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
  const front = frontOf(layout.zones, layout.width);

  // ---------- commands ----------
  const say = (msg: string) => setAnnounce(msg);

  const moveTable = (id: string, x: number, y: number) => {
    hall.remember(positions);
    void setTablePositions([{ id, x: toCm(x), y: toCm(y) }]);
  };

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

  const updateLayout = (fn: (l: HallLayout) => HallLayout) =>
    hall.update(fn, positions);

  const selTable =
    selected?.type === "table"
      ? data.tables.find((t) => t.id === selected.id)
      : undefined;
  const selZone =
    selected?.type === "zone"
      ? layout.zones.find((z) => z.id === selected.id)
      : undefined;

  const rotate = (delta: number) => {
    if (selTable) {
      updateLayout((l) => ({
        ...l,
        rotations: {
          ...l.rotations,
          [selTable.id]: ((l.rotations[selTable.id] ?? 0) + delta + 360) % 360,
        },
      }));
      say(`${selTable.name} rotated`);
    } else if (selZone) {
      updateLayout((l) => ({
        ...l,
        zones: l.zones.map((z) =>
          z.id === selZone.id ? { ...z, w: z.h, h: z.w } : z
        ),
      }));
    }
  };

  const nudge = (dx: number, dy: number) => {
    if (selTable) {
      const p = positions[selTable.id];
      moveTable(
        selTable.id,
        round2(clamp(p.x + dx, 0, layout.width)),
        round2(clamp(p.y + dy, 0, layout.length))
      );
    } else if (selZone) {
      updateLayout((l) => ({
        ...l,
        zones: l.zones.map((z) =>
          z.id === selZone.id
            ? { ...z, x: round2(z.x + dx), y: round2(z.y + dy) }
            : z
        ),
      }));
    }
  };

  const placeNew = async (
    shape: TableShape,
    capacity: number,
    near?: { x: number; y: number }
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
    if (created[0]) setSelected({ type: "table", id: created[0].id });
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
      setSelected({ type: "zone", id: copy.id });
    }
  };

  const remove = () => {
    if (selTable) onDeleteTable(selTable.id);
    else if (selZone) {
      updateLayout((l) => ({
        ...l,
        zones: l.zones.filter((z) => z.id !== selZone.id),
      }));
      setSelected(null);
      say(`${selZone.label} removed`);
    }
  };

  const addZone = (kind: ZoneKind) => {
    const def = ZONE_DEFAULTS[kind];
    const z = {
      id: zoneId(),
      kind,
      label: def.label,
      x: round2(layout.width / 2),
      y: round2(layout.length / 2),
      w: def.w,
      h: def.h,
    };
    updateLayout((l) => ({ ...l, zones: [...l.zones, z] }));
    setSelected({ type: "zone", id: z.id });
    setMenu(null);
  };

  const fill = async (onlyNeeded: boolean) => {
    const list = onlyNeeded
      ? nearestToFront(fitAround.placements, front, tablesNeeded)
      : fitAround.placements;
    if (list.length === 0) return;
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
    if (created.length && list.some((p) => p.rot)) {
      updateLayout((l) => ({
        ...l,
        rotations: {
          ...l.rotations,
          ...Object.fromEntries(created.map((t, i) => [t.id, list[i].rot])),
        },
      }));
    }
    setBusy(null);
    say(`${created.length} tables added`);
  };

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

  const seatEveryone = async () => {
    setBusy("seat");
    await bulkAssign(seatPlan.plan.assignments);
    setBusy(null);
  };

  const exportPng = () => {
    const svg = document.querySelector<SVGSVGElement>(
      '[data-testid="hall-plan"]'
    );
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute(
      "viewBox",
      `-2.2 -2.2 ${layout.width + 4.4} ${layout.length + 4.4}`
    );
    clone.setAttribute("width", "2400");
    clone.setAttribute(
      "height",
      String(Math.round((2400 * (layout.length + 4.4)) / (layout.width + 4.4)))
    );
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("font-family", "Arial, sans-serif");
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Number(clone.getAttribute("width"));
      c.height = Number(clone.getAttribute("height"));
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0d0406";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = "hall-floor-plan.png";
      a.href = c.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  const ghosts =
    tab === "fit" && view === "plan"
      ? {
          placements: fitAround.placements,
          shape: preset.shape,
          capacity: preset.capacity,
        }
      : null;

  const warnCount = Object.keys(warnings).length;
  const toolBtn =
    "inline-flex h-10 items-center gap-1.5 rounded-full border border-[#e9c98a]/35 bg-white/[0.04] px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f6dca8] transition-colors hover:border-[#e9c98a] hover:bg-white/[0.08] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]";
  const iconBtn =
    "grid h-10 w-10 place-items-center rounded-full border border-[#e9c98a]/35 bg-white/[0.04] text-[#f6dca8] transition-colors hover:border-[#e9c98a] disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]";

  return (
    <section
      aria-label="Hall studio"
      className="overflow-hidden rounded-[28px] border border-[#e9c98a]/20 bg-[#12050a] text-[#f6efe3] shadow-[0_30px_60px_-30px_rgba(28,7,13,0.85)]"
      data-testid="hall-studio"
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {narrow && !hideNarrowTip && (
        <div
          className="flex items-start gap-3 border-b border-[#e9c98a]/20 bg-[#2a0d16] px-4 py-3 text-sm"
          role="note"
        >
          <MonitorSmartphone
            size={18}
            className="mt-0.5 shrink-0 text-[#e9c98a]"
          />
          <p className="flex-1 text-[13px] leading-snug text-[#f6efe3]/90">
            The hall designer is best on a tablet or laptop. On this screen you
            can look around, pinch to zoom and seat guests from the Guests tab.
          </p>
          <button
            type="button"
            onClick={() => setHideNarrowTip(true)}
            aria-label="Dismiss tip"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#f6dca8] hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header: title, view switch and tools */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e9c98a]/15 px-4 py-3 sm:px-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
            Hall studio
          </p>
          <p className="font-display text-xl font-bold text-[#f6efe3]">
            {layout.width} × {layout.length} m
            <span className="ml-2 text-sm font-normal text-[#f6efe3]/60">
              {formatFeet(layout.width)} × {formatFeet(layout.length)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="View"
            className="flex rounded-full border border-[#e9c98a]/30 p-1"
          >
            {(
              [
                ["plan", "Floor plan", LayoutGrid],
                ["decorated", "See it decorated", Eye],
              ] as const
            ).map(([key, label, I]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={view === key}
                onClick={() => setView(key)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]",
                  view === key
                    ? "bg-[#e9c98a] text-[#1c070d]"
                    : "text-[#f6dca8] hover:bg-white/10"
                )}
              >
                <I size={14} /> {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={iconBtn}
            onClick={undo}
            disabled={!hall.canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className={iconBtn}
            onClick={redo}
            disabled={!hall.canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
          <div className="relative">
            <button
              type="button"
              className={toolBtn}
              aria-expanded={menu === "table"}
              onClick={() => setMenu(menu === "table" ? null : "table")}
            >
              <Plus size={14} /> Table
            </button>
            {menu === "table" && (
              <div
                className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-[#e9c98a]/30 bg-[#1c070d] p-1.5 shadow-2xl"
                role="menu"
              >
                {TABLE_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(null);
                      void placeNew(p.shape, p.capacity);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-[#f6efe3] hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              className={toolBtn}
              aria-expanded={menu === "zone"}
              onClick={() => setMenu(menu === "zone" ? null : "zone")}
            >
              <Plus size={14} /> Zone
            </button>
            {menu === "zone" && (
              <div
                className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-[#e9c98a]/30 bg-[#1c070d] p-1.5 shadow-2xl"
                role="menu"
              >
                {ZONE_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="menuitem"
                    onClick={() => addZone(k)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-[#f6efe3] hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
                  >
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ background: ZONE_DEFAULTS[k].fill }}
                      aria-hidden="true"
                    />
                    {ZONE_DEFAULTS[k].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            className={iconBtn}
            onClick={exportPng}
            aria-label="Download the floor plan as an image"
            title="Download PNG"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Capacity meter */}
      <dl
        className="grid grid-cols-2 gap-px border-b border-[#e9c98a]/15 bg-[#e9c98a]/10 text-center sm:grid-cols-4"
        data-testid="hall-meter"
      >
        {[
          {
            k: "Guests coming",
            v: guests,
            note: buffer ? `+${buffer}% buffer = ${target}` : undefined,
          },
          {
            k: "Seats placed",
            v: seats,
            note: seats >= target ? "Enough seats" : `${target - seats} short`,
            bad: seats < target,
          },
          {
            k: `Hall fits (${preset.capacity}-seat tables)`,
            v: fitEmpty.seats,
            note: `${fitEmpty.count} tables`,
          },
          {
            k: "Fire guidance",
            v: fireGuide,
            note: "diners max, venue decides",
          },
        ].map((m) => (
          <div key={m.k} className="bg-[#12050a] px-3 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e9c98a]/90">
              {m.k}
            </dt>
            <dd className="mt-0.5 font-display text-2xl font-bold tabular-nums text-[#f6efe3]">
              {m.v}
            </dd>
            {m.note && (
              <dd
                className={cn(
                  "text-[11px]",
                  m.bad ? "text-[#ffb4bf]" : "text-[#f6efe3]/65"
                )}
              >
                {m.note}
              </dd>
            )}
          </div>
        ))}
      </dl>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Canvas */}
        <div className="relative h-[360px] border-b border-[#e9c98a]/15 sm:h-[560px] lg:h-[640px] lg:border-b-0 lg:border-r">
          {view === "plan" ? (
            <HallPlan
              layout={layout}
              tables={data.tables}
              positions={positions}
              selected={selected}
              warnings={warnings}
              ghosts={ghosts}
              onSelect={setSelected}
              onMoveTable={moveTable}
              onZoneChange={(id, patch) =>
                updateLayout((l) => ({
                  ...l,
                  zones: l.zones.map((z) =>
                    z.id === id ? { ...z, ...patch } : z
                  ),
                }))
              }
              onKeyCommand={(cmd) =>
                cmd === "undo"
                  ? undo()
                  : cmd === "redo"
                    ? redo()
                    : cmd === "rotate"
                      ? rotate(15)
                      : cmd === "rotate-back"
                        ? rotate(-15)
                        : cmd === "delete"
                          ? remove()
                          : duplicate()
              }
              onNudge={nudge}
            />
          ) : (
            <HallDecorated
              layout={layout}
              tables={data.tables}
              positions={positions}
            />
          )}

          {view === "plan" && (
            <div className="pointer-events-none absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-1.5">
              {warnCount > 0 && (
                <span className="pointer-events-auto rounded-full border border-[#ffb4bf]/40 bg-[#2a0d16]/90 px-3 py-1.5 text-[11px] font-semibold text-[#ffcdd4]">
                  {warnCount} {warnCount === 1 ? "table needs" : "tables need"}{" "}
                  more space
                </span>
              )}
              {data.tables.length === 0 && (
                <span className="pointer-events-auto rounded-full border border-[#e9c98a]/40 bg-[#1c070d]/90 px-3 py-1.5 text-[11px] font-semibold text-[#f6dca8]">
                  Add a table, or open Fit to fill the hall
                </span>
              )}
              {hall.storedLocally && (
                <span className="pointer-events-auto rounded-full border border-[#e9c98a]/30 bg-[#1c070d]/90 px-3 py-1.5 text-[11px] text-[#f6efe3]/80">
                  Room layout saved on this device
                </span>
              )}
            </div>
          )}

          {/* Inspector */}
          {view === "plan" && (selTable || selZone) && (
            <div
              className="absolute bottom-3 left-3 w-[min(320px,calc(100%-4.5rem))] rounded-2xl border border-[#e9c98a]/30 bg-[#1c070d]/92 p-3 shadow-2xl backdrop-blur"
              data-testid="hall-inspector"
            >
              {selTable ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e9c98a]">
                    {tableSizeLabel(selTable.shape, selTable.capacity)}
                  </p>
                  <p className="font-display text-lg font-bold leading-tight">
                    {selTable.name}
                  </p>
                  <p className="text-xs text-[#f6efe3]/70">
                    {selTable.occupiedSeats} of {selTable.capacity} seats taken
                    {selTable.guests.length > 0 &&
                      `: ${selTable.guests
                        .map((g) => g.name)
                        .slice(0, 4)
                        .join(", ")}${selTable.guests.length > 4 ? "…" : ""}`}
                  </p>
                </>
              ) : selZone ? (
                <>
                  <label
                    className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e9c98a]"
                    htmlFor="zone-label"
                  >
                    Zone name
                  </label>
                  <input
                    id="zone-label"
                    value={selZone.label}
                    onChange={(e) =>
                      updateLayout((l) => ({
                        ...l,
                        zones: l.zones.map((z) =>
                          z.id === selZone.id
                            ? { ...z, label: e.target.value.slice(0, 60) }
                            : z
                        ),
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-[#e9c98a]/30 bg-white/5 px-2.5 py-1.5 text-base text-[#f6efe3] outline-none focus:border-[#e9c98a]"
                  />
                  <p className="mt-1 text-xs text-[#f6efe3]/70">
                    {round2(selZone.w)} × {round2(selZone.h)} m · drag the gold
                    dot to resize
                  </p>
                </>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => rotate(-15)}
                  className={iconBtn}
                  aria-label="Rotate left"
                  title="Rotate left (Shift+R)"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => rotate(15)}
                  className={iconBtn}
                  aria-label="Rotate right"
                  title="Rotate right (R)"
                >
                  <RotateCw size={15} />
                </button>
                <button
                  type="button"
                  onClick={duplicate}
                  className={iconBtn}
                  aria-label="Duplicate"
                  title="Duplicate (D)"
                >
                  <Copy size={15} />
                </button>
                {selTable && (
                  <button
                    type="button"
                    onClick={() => onEditTable(selTable)}
                    className={iconBtn}
                    aria-label="Edit table"
                    title="Edit name, seats or shape"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={remove}
                  className={iconBtn}
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex min-h-0 flex-col bg-ivory text-night">
          <div
            role="tablist"
            aria-label="Hall studio tools"
            className="grid grid-cols-5 gap-1 border-b border-hairline p-2"
          >
            {(
              [
                ["guests", "Guests", Users],
                ["room", "Room", Ruler],
                ["fit", "Fit", LayoutGrid],
                ["seat", "Seat", Wand2],
                ["decor", "Décor", Palette],
              ] as const
            ).map(([key, label, I]) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`hall-tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`hall-panel-${key}`}
                onClick={() => setTab(key)}
                className={cn(
                  "inline-flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                  tab === key
                    ? "bg-burgundy text-ivory"
                    : "text-label-2 hover:bg-burgundy/10"
                )}
              >
                <I size={14} /> {label}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`hall-panel-${tab}`}
            aria-labelledby={`hall-tab-${tab}`}
            className="min-h-0 flex-1 overflow-y-auto p-4 lg:max-h-[588px]"
          >
            {tab === "guests" && (
              <div className="space-y-3">
                <p className="text-xs text-label-2">
                  Drag a guest onto a table in the plan, or choose a table from
                  their menu.
                </p>
                <UnseatedGuestList
                  guests={data.unseatedGuests}
                  tables={data.tables}
                  onAssignTable={onAssignTable}
                />
              </div>
            )}

            {tab === "room" && (
              <RoomPanel
                layout={layout}
                onChange={(patch) => updateLayout((l) => ({ ...l, ...patch }))}
                onResetZones={() =>
                  updateLayout((l) => ({
                    ...l,
                    zones: defaultZones(l.width, l.length),
                  }))
                }
              />
            )}

            {tab === "fit" && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
                    How many tables fit
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold text-night">
                    {fitEmpty.count}{" "}
                    <span className="text-base font-normal text-label-2">
                      tables · {fitEmpty.seats} seats in an empty hall
                    </span>
                  </p>
                  <p className="text-xs text-label-2">
                    Around what is already placed:{" "}
                    <strong className="text-night">
                      {fitAround.count} more
                    </strong>{" "}
                    ({fitAround.count * preset.capacity} seats), shown dashed on
                    the plan.
                  </p>
                </div>
                <label
                  className="block text-xs font-semibold text-night"
                  htmlFor="fit-table"
                >
                  Table type
                </label>
                <select
                  id="fit-table"
                  value={fitPreset}
                  onChange={(e) => setFitPreset(e.target.value)}
                  className="h-11 w-full rounded-xl border border-hairline bg-white px-3 text-base"
                >
                  {TABLE_PRESETS.filter((p) => p.shape !== "head").map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-hairline bg-white px-3">
                  <span className="text-sm text-night">
                    Keep a centre aisle to the stage
                  </span>
                  <input
                    type="checkbox"
                    checked={aisle}
                    onChange={(e) => setAisle(e.target.checked)}
                    className="h-5 w-5 accent-[#6e1426]"
                  />
                </label>
                <div>
                  <label
                    className="text-xs font-semibold text-night"
                    htmlFor="fit-buffer"
                  >
                    Extra seats for unexpected guests: {buffer}%
                  </label>
                  <input
                    id="fit-buffer"
                    type="range"
                    min={0}
                    max={30}
                    step={5}
                    value={buffer}
                    onChange={(e) => setBuffer(Number(e.target.value))}
                    className="mt-1 h-11 w-full accent-[#6e1426]"
                  />
                </div>
                <p className="rounded-xl bg-tint-sand px-3 py-2.5 text-sm text-night">
                  {shortBy > 0
                    ? `You need ${tablesNeeded} more ${tablesNeeded === 1 ? "table" : "tables"} for ${target} seats.`
                    : `You have seats for everyone, including the buffer.`}
                  {tablesNeeded > fitAround.count &&
                    " That is more than the hall can take: try banquet tables, snug spacing, or a bigger hall."}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={
                      busy !== null ||
                      tablesNeeded === 0 ||
                      fitAround.count === 0
                    }
                    onClick={() => fill(true)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-xs font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-wine disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    <Sparkles size={15} />{" "}
                    {busy === "fill"
                      ? "Placing tables…"
                      : `Add the ${Math.min(tablesNeeded, fitAround.count)} I need`}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null || fitAround.count === 0}
                    onClick={() => fill(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-burgundy/40 px-5 text-xs font-semibold uppercase tracking-[0.14em] text-burgundy transition-colors hover:bg-burgundy/5 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    Fill the hall ({fitAround.count})
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-label-2">
                  Uses real table sizes, {Math.round(gap * 100)} cm between
                  chair backs, 1 m along the walls and around zones, and a 1.12
                  m main aisle. Your venue and the fire service have the final
                  say.
                </p>
              </div>
            )}

            {tab === "seat" && (
              <div className="space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
                  Seat everyone
                </p>
                <p className="text-sm text-night">
                  Seats confirmed guests who have no table yet. Families and
                  groups stay together, VIPs go to the high table and the front,
                  and no table goes over its seats.
                </p>
                <ul className="space-y-1.5 rounded-xl bg-white p-3 text-sm text-night">
                  <li>
                    <strong>{seatPlan.plan.assignments.length}</strong> of{" "}
                    {seatPlan.units.length} confirmed guests can be seated
                  </li>
                  {seatPlan.plan.split.length > 0 && (
                    <li>
                      {seatPlan.plan.split.length}{" "}
                      {seatPlan.plan.split.length === 1
                        ? "group is"
                        : "groups are"}{" "}
                      spread over neighbouring tables:{" "}
                      {seatPlan.plan.split.slice(0, 3).join(", ")}
                    </li>
                  )}
                  {seatPlan.plan.unplaced.length > 0 && (
                    <li className="text-[#9e2a2b]">
                      {seatPlan.plan.unplaced.length} need more seats:{" "}
                      {seatPlan.plan.unplaced
                        .slice(0, 3)
                        .map((u) => `${u.name} (${u.seats})`)
                        .join(", ")}
                      . Add tables in Fit.
                    </li>
                  )}
                </ul>
                <button
                  type="button"
                  disabled={
                    busy !== null || seatPlan.plan.assignments.length === 0
                  }
                  onClick={seatEveryone}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-xs font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-wine disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                >
                  <Wand2 size={15} />{" "}
                  {busy === "seat"
                    ? "Seating guests…"
                    : seatPlan.units.length === 0
                      ? "Everyone who accepted is seated"
                      : `Seat ${seatPlan.plan.assignments.length} guests`}
                </button>
                <p className="text-[11px] text-label-2">
                  Pending replies are left out until they accept. You can move
                  anyone afterwards.
                </p>
              </div>
            )}

            {tab === "decor" && (
              <DecorPanel
                decor={layout.decor}
                onChange={(decor) => updateLayout((l) => ({ ...l, decor }))}
                onPreview={() => setView("decorated")}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function NumberField({
  id,
  label,
  value,
  onCommit,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number;
  onCommit: (v: number) => void;
  min: number;
  max: number;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Number(text.replace(",", "."));
    if (Number.isFinite(v)) onCommit(round2(clamp(v, min, max)));
    else setText(String(value));
  };
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold text-night">
        {label}
      </label>
      <div className="mt-1 flex items-center rounded-xl border border-hairline bg-white pr-3 focus-within:border-burgundy">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="h-11 w-full rounded-xl bg-transparent px-3 text-base text-night outline-none"
        />
        <span className="text-sm text-label-2">m</span>
      </div>
    </div>
  );
}

function RoomPanel({
  layout,
  onChange,
  onResetZones,
}: {
  layout: HallLayout;
  onChange: (patch: Partial<HallLayout>) => void;
  onResetZones: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
        Your hall
      </p>
      <div className="grid grid-cols-2 gap-2">
        {HALL_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() =>
              onChange({
                width: p.width,
                length: p.length,
                zones: defaultZones(p.width, p.length),
              })
            }
            aria-pressed={
              layout.width === p.width && layout.length === p.length
            }
            className="min-h-11 rounded-xl border border-hairline bg-white px-3 py-2 text-left text-xs text-night transition-colors hover:border-burgundy/50 aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <span className="block font-semibold">{p.label}</span>
            <span className="text-label-2">
              {p.width} × {p.length} m
            </span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          id="hall-width"
          label="Width"
          value={layout.width}
          min={6}
          max={120}
          onCommit={(v) => onChange({ width: v })}
        />
        <NumberField
          id="hall-length"
          label="Length"
          value={layout.length}
          min={6}
          max={120}
          onCommit={(v) => onChange({ length: v })}
        />
      </div>
      <p className="text-xs text-label-2">
        Floor area {Math.round(layout.width * layout.length)} m² (
        {Math.round(layout.width * layout.length * 10.764)} sq ft). Ask the
        venue for the exact size.
      </p>
      <fieldset>
        <legend className="text-xs font-semibold text-night">
          Spacing between tables
        </legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["snug", "comfortable", "spacious"] as Spacing[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={layout.spacing === s}
              onClick={() => onChange({ spacing: s })}
              className="min-h-11 rounded-xl border border-hairline bg-white px-2 text-xs font-semibold capitalize text-night aria-pressed:border-burgundy aria-pressed:bg-burgundy aria-pressed:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={onResetZones}
        className="min-h-11 w-full rounded-full border border-burgundy/40 px-4 text-xs font-semibold uppercase tracking-[0.14em] text-burgundy hover:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        Reset to a typical owambe layout
      </button>
      <p className="text-[11px] leading-relaxed text-label-2">
        Stage and band at the front, the dance and spraying floor before it,
        buffet and bar along the sides, entrance at the back. Drag zones to
        match your venue, or add pillars and a photo spot from “+ Zone”.
      </p>
    </div>
  );
}

const SWATCHES = [
  "#6e1426",
  "#3a0f1a",
  "#f4efe6",
  "#fbf8f2",
  "#e9c98a",
  "#c9a465",
  "#1f6b4a",
  "#243f86",
  "#d9644a",
  "#8a6bb8",
  "#2b2326",
  "#f7e8d0",
];
const LIGHTS = [
  "#f2b45c",
  "#ffe2a8",
  "#ff9a6b",
  "#c9a0ff",
  "#8ec5ff",
  "#7fe0b0",
  "#ff5a8a",
];

function DecorPanel({
  decor,
  onChange,
  onPreview,
}: {
  decor: Decor;
  onChange: (d: Decor) => void;
  onPreview: () => void;
}) {
  const set = (patch: Partial<Decor>) => onChange({ ...decor, ...patch });
  const swatchRow = (
    label: string,
    value: string | null,
    pick: (v: string) => void,
    colours: string[],
    allowOff?: () => void
  ) => (
    <fieldset>
      <legend className="text-xs font-semibold text-night">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {colours.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pick(c)}
            aria-pressed={value === c}
            aria-label={`${label}: ${c}`}
            className="grid h-9 w-9 place-items-center rounded-full border border-black/10 transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-burgundy aria-pressed:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            style={{ background: c }}
          />
        ))}
        {allowOff && (
          <button
            type="button"
            onClick={allowOff}
            aria-pressed={value === null}
            className="h-9 rounded-full border border-hairline bg-white px-3 text-xs font-semibold text-night aria-pressed:border-burgundy aria-pressed:text-burgundy"
          >
            None
          </button>
        )}
      </div>
    </fieldset>
  );
  const chip = <T extends string>(
    label: string,
    value: T,
    options: [T, string][],
    pick: (v: T) => void
  ) => (
    <fieldset>
      <legend className="text-xs font-semibold text-night">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => pick(v)}
            className="min-h-10 rounded-full border border-hairline bg-white px-3 text-xs font-semibold text-night aria-pressed:border-burgundy aria-pressed:bg-burgundy aria-pressed:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
        Colour of the day
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DECOR_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.decor)}
            aria-pressed={
              decor.linen === p.decor.linen && decor.sash === p.decor.sash
            }
            className="flex min-h-11 items-center gap-2 rounded-xl border border-hairline bg-white px-2.5 text-left text-xs font-semibold text-night aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <span
              className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10"
              style={{
                background: `linear-gradient(135deg, ${p.decor.linen} 0 55%, ${p.decor.sash} 55%)`,
              }}
              aria-hidden="true"
            />
            {p.label}
          </button>
        ))}
      </div>
      {swatchRow(
        "Table linen",
        decor.linen,
        (c) => set({ linen: c }),
        SWATCHES
      )}
      {swatchRow("Chair sash", decor.sash, (c) => set({ sash: c }), SWATCHES)}
      {chip<ChairStyle>(
        "Chairs",
        decor.chair,
        [
          ["gold", "Gold chiavari"],
          ["white", "White"],
          ["black", "Black"],
          ["clear", "Clear"],
        ],
        (v) => set({ chair: v })
      )}
      {chip<Centrepiece>(
        "Centrepieces",
        decor.centrepiece,
        [
          ["tall", "Tall florals"],
          ["low", "Low florals"],
          ["candles", "Candles"],
          ["none", "None"],
        ],
        (v) => set({ centrepiece: v })
      )}
      {swatchRow("Flowers", decor.flower, (c) => set({ flower: c }), SWATCHES)}
      {swatchRow(
        "Uplighting",
        decor.uplight,
        (c) => set({ uplight: c }),
        LIGHTS,
        () => set({ uplight: null })
      )}
      {swatchRow(
        "Drapes",
        decor.drape,
        (c) => set({ drape: c }),
        SWATCHES,
        () => set({ drape: null })
      )}
      {chip<FloorFinish>(
        "Floor",
        decor.floor,
        [
          ["marble", "Marble"],
          ["wood", "Wood"],
          ["dark", "Dark"],
        ],
        (v) => set({ floor: v })
      )}
      <button
        type="button"
        onClick={onPreview}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-xs font-semibold uppercase tracking-[0.14em] text-ivory hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <Eye size={15} /> See it decorated
      </button>
    </div>
  );
}

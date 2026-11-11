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
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Hand,
  CloudRain,
  LayoutGrid,
  Maximize,
  Minus,
  Moon,
  MousePointer2,
  Palette,
  Plus,
  Redo2,
  SunMoon,
  RotateCcw,
  RotateCw,
  Ruler,
  Shapes,
  Sparkles,
  Square,
  ShieldAlert,
  Sun,
  Thermometer,
  UtensilsCrossed,
  Keyboard,
  Layers as LayersIcon,
  Tag,
  Undo2,
  Users,
  Wand2,
  X,
  History as HistoryIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CreateTableInput } from "../schemas";
import type { SeatingDeskData, TableShape, TableWithGuests } from "../types";
import { useHallLayout } from "./useHallLayout";
import { LeftDock } from "./LeftDock";
import { WorkspaceBar } from "./WorkspaceBar";
import { seatingCounts } from "../counts";
import { SeatRulesPanel } from "./SeatRulesPanel";
import { HistoryMenu, HistoryPanel, type HistoryEntry } from "./HistoryMenu";
import { ShareMenu } from "./ShareMenu";
import { shareOf } from "./share";
import { clearanceOf, gapText } from "./clearance";
import { ruleBreaks, type SeatRule } from "./rules";
import { ConflictBanner, SaveStatus } from "./SaveStatus";
import {
  moveLayer,
  nudgeLayer,
  renameLayer,
  setLayersHidden,
  setLayersLocked,
} from "./layers";
import {
  areaPerDiner,
  nextStageSpot,
  stageItemPlacement,
  SPACING_GAP,
  ZONE_DEFAULTS,
  chairAfterDrop,
  chairPlacement,
  chairPositions,
  chairType,
  clamp,
  defaultZones,
  footprint,
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
  type SeatKind,
  type StageItem,
  type TableStyle,
  type Zone,
} from "./model";
import {
  findFreeSpot,
  fitTables,
  frontOf,
  nearestToFront,
  type FitOptions,
  type FitResult,
} from "./fit";
import { useStudioEngine } from "./useStudioEngine";
import { planSeating } from "./autoseat";
import { autoArrange } from "./arrange";
import {
  applyOption,
  seedFrom,
  toArrangeRequest,
  type SuggestTable,
} from "./suggested-layouts";
import { SuggestedLayouts } from "./SuggestedLayouts";
import { LayoutComparison, type Compared } from "./LayoutComparison";
import type {
  AcUnit,
  CateringPlan,
  CateringReport,
  Cooling,
  LayoutOption,
  RiskReport,
  ThermalReport,
} from "@ariya/studio";
import {
  Hall3D,
  type Hall3DHandle,
  type HallMessage,
  type Pick,
  type Scene,
} from "./Hall3D";
import {
  DecorPanel,
  CateringPanel,
  FitPanel,
  GuestsPanel,
  RiskPanel,
  RoomPanel,
  SeatPanel,
  ThermalPanel,
} from "./StudioPanels";
import {
  DEFAULT_UNIT_HP,
  defaultCooling,
  thermalRequest,
  unitId,
  unitsOf,
} from "./thermal";
import {
  cateringRequest,
  normaliseCatering,
  type CateringAnswers,
} from "./catering";
import { downloadCateringList } from "./catering-pdf";
import { riskRequest } from "./risk";
import { LayoutSummary } from "./LayoutSummary";
import {
  ChairInspector,
  MultiInspector,
  TableInspector,
  ZoneInspector,
  type Align,
} from "./Inspector";
import { ChairGlyph, Section, ShapeGlyph, TableGlyph } from "./studio-ui";
import { SimpleMode } from "./SimpleMode";
import {
  chairRow,
  copyChair,
  copyZone,
  expandSelection,
  forgetItems,
  groupHolding,
  makeGroup,
  tableRowSlots,
  type Picked,
} from "./grouping";
import {
  CHAIR_GROUPS,
  Deck,
  Flyout,
  Move,
  Positions,
  STAGE_ITEM_WORD,
  TABLE_PRESETS,
  TABLE_ROWS,
  TOOL_GROUPS,
  ZONE_GALLERY,
  isTyping,
  nextTableNames,
} from "./studio-config";
import { GroupBar, ModeSwitch, RailTip, ShortcutSheet } from "./studio-chrome";

interface HallStudioProps {
  eventId: string;
  data: SeatingDeskData;
  initialLayout: unknown;
  layoutAvailable: boolean;
  /** The event date, `yyyy-mm-dd`, so every risk gets a real deadline. */
  eventDate?: string | null;
  /** Risk rules that already have a checklist task, so the button does not offer them twice. */
  addedRiskIds?: string[];
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
  /** Take back the last "Seat everyone"; true when it worked. */
  onUndoSeatEveryone?: () => Promise<boolean>;
  canUndoSeatEveryone?: boolean;
  /** The event's name, shown beside the Back button. */
  eventTitle?: string;
  /** Hall and seating suggestions from connected apps waiting on the approvals desk. */
  pendingProposals?: number;
  /** Where Back goes. */
  backHref?: string;
  /** Opens the new-table form. */
  onNewTable?: () => void;
}

export function HallStudio({
  eventId,
  data,
  initialLayout,
  layoutAvailable,
  eventDate = null,
  addedRiskIds = [],
  addTables,
  updateTable,
  setTablePositions,
  bulkAssign,
  onAssignTable,
  onDeleteTable,
  deleteTables,
  notice,
  eventTitle,
  pendingProposals = 0,
  backHref,
  onNewTable,
  onUndoSeatEveryone,
  canUndoSeatEveryone = false,
}: HallStudioProps) {
  const hall = useHallLayout({
    eventId,
    initialLayout,
    available: layoutAvailable,
  });
  const { layout } = hall;
  const { engine: studioEngine, status: studioStatus } = useStudioEngine();
  const view3d = useRef<Hall3DHandle>(null);
  const studio = useRef<HTMLElement>(null);
  const [tool, setTool] = useState<"select" | "hand">("select");
  const [selection, setSelection] = useState<Pick[]>([]);
  const [deck, setDeck] = useState<Deck>("guests");
  const [flyout, setFlyout] = useState<Flyout>(null);
  const [labels, setLabels] = useState(true);
  const [rain, setRain] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [cam, setCam] = useState<{ pct: number; view: "top" | "3d" }>({
    pct: 100,
    view: "3d",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [suggestions, setSuggestions] = useState<LayoutOption[] | null>(null);
  // The layout the host had, kept beside the one they just applied, so the two can be flipped
  // between before either is settled on.
  const [compare, setCompare] = useState<{
    before: { layout: HallLayout; positions: Positions };
    after: { layout: HallLayout; positions: Positions };
    showing: Compared;
  } | null>(null);
  // What the studio just did. Read out to screen readers and shown for a few seconds to everyone:
  // it used to be screen-reader only, so a sighted host never saw "Only 24 more tables fit".
  const [toast, setToast] = useState<{ msg: string; n: number } | null>(null);
  // A first-visit guide, remembered on this device once dismissed. Storage can be blocked, in
  // which case the guide simply shows again next time.
  const [showTips, setShowTips] = useState(false);
  useEffect(() => {
    try {
      setShowTips(localStorage.getItem("ariya:studio-tips") !== "seen");
    } catch {
      setShowTips(true);
    }
  }, []);
  const dismissTips = () => {
    setShowTips(false);
    try {
      localStorage.setItem("ariya:studio-tips", "seen");
    } catch {
      /* private mode */
    }
  };
  const say = (msg: string) => {
    setAnnounce(msg);
    setToast((prev) => ({ msg, n: (prev?.n ?? 0) + 1 }));
  };
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  // ---------- cooling ----------
  const [thermal, setThermal] = useState<ThermalReport | null>(null);
  const [placingUnit, setPlacingUnit] = useState(false);
  const [heat, setHeat] = useState(true);

  // ---------- catering ----------
  const [catering, setCatering] = useState<CateringReport | null>(null);
  const [exporting, setExporting] = useState(false);

  // ---------- risk ----------
  const [risk, setRisk] = useState<RiskReport | null>(null);

  // Simple mode and the studio edit the same document (7.2), so the switch is a view, not a
  // save: whichever mode is left behind keeps every answer it wrote.
  const [mode, setMode] = useState<"simple" | "studio">("studio");
  useEffect(() => {
    try {
      if (localStorage.getItem("ariya:hall-mode") === "simple")
        setMode("simple");
    } catch {
      /* no storage */
    }
  }, []);
  const chooseMode = (next: "simple" | "studio") => {
    setMode(next);
    // Simple mode answers live in the side panel, so make sure it is there to be seen.
    if (next === "simple") setPanelOpen(true);
    try {
      localStorage.setItem("ariya:hall-mode", next);
    } catch {
      /* not remembered */
    }
  };

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

  // The left dock (layers and tables) opens by itself on a wide screen and waits behind its button
  // on a narrow one, where it would cover the hall. Simple mode has no dock: its questions are the
  // panel.
  const [dockOpen, setDockOpenRaw] = useState(false);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("ariya:hall-dock");
    } catch {
      /* no storage */
    }
    setDockOpenRaw(
      saved
        ? saved === "open"
        : window.matchMedia("(min-width: 1280px)").matches
    );
  }, []);
  const setDockOpen = (next: boolean | ((cur: boolean) => boolean)) =>
    setDockOpenRaw((cur) => {
      const value = typeof next === "function" ? next(cur) : next;
      try {
        localStorage.setItem("ariya:hall-dock", value ? "open" : "closed");
      } catch {
        /* not remembered */
      }
      return value;
    });
  const dockShown = dockOpen && mode === "studio";
  // Where the canvas controls start, clear of the tool rail and the dock.
  const leftEdge =
    mode === "simple"
      ? "left-3"
      : dockShown
        ? "left-[4.25rem] lg:left-[368px]"
        : "left-[4.25rem] lg:left-[68px]";

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
        // The tool rail covers the left edge at every width, so the hall is centred in what is left
        // of it, not in the whole screen.
        left: Math.round(
          r.left +
            (wide
              ? dockShown
                ? 356
                : mode === "studio"
                  ? 56
                  : 0
              : mode === "studio"
                ? 72
                : 12)
        ),
        top: Math.round(r.top + (wide ? 56 : 64)),
        right: Math.round(
          outRight + (wide ? (panelOpen ? p.offsetWidth : 0) : 12)
        ),
        bottom: Math.round(
          outBottom + (!wide && panelOpen ? p.offsetHeight + 12 : wide ? 32 : 0)
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
  }, [panelOpen, dockShown, mode]);

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
  // The interface can be light or dark, whatever the hall's own lighting is. Remembered per device.
  const [theme, setThemeRaw] = useState<"light" | "dark">("light");
  useEffect(() => {
    try {
      if (localStorage.getItem("ariya:hall-theme") === "dark")
        setThemeRaw("dark");
    } catch {
      /* no storage */
    }
  }, []);
  const toggleTheme = () =>
    setThemeRaw((cur) => {
      const next = cur === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("ariya:hall-theme", next);
      } catch {
        /* not remembered */
      }
      return next;
    });
  const dark = theme === "dark";
  // The hall is transparent by day and shows the page behind it, so the page goes dark with the UI.
  useEffect(() => {
    const html = document.documentElement;
    if (dark) html.dataset.studioTheme = "dark";
    else delete html.dataset.studioTheme;
    return () => {
      delete html.dataset.studioTheme;
    };
  }, [dark]);

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
  // One set of numbers for every panel (see counts.ts): accepted people can be seated, replies
  // still awaited are planned for but never counted as waiting for a seat.
  const counts = useMemo(() => seatingCounts(data), [data]);
  const guests = counts.expectedPeople;

  // The cooling verdict follows the plan: every edit to the room, the crowd or the units re-asks.
  useEffect(() => {
    if (!studioEngine || studioStatus !== "ready") return;
    try {
      setThermal(studioEngine.thermal(thermalRequest(layout, guests)));
    } catch {
      setThermal(null);
    }
  }, [studioEngine, studioStatus, layout, guests]);

  // The shopping list follows the same plan: the answers live on the venue profile.
  const cateringPlan = useMemo(
    () => normaliseCatering(layout.venue.catering),
    [layout.venue.catering]
  );
  useEffect(() => {
    if (!studioEngine || studioStatus !== "ready") return;
    try {
      setCatering(studioEngine.catering(cateringRequest(cateringPlan, guests)));
    } catch {
      setCatering(null);
    }
  }, [studioEngine, studioStatus, cateringPlan, guests]);

  // The register follows the plan and the date: change either and the deadlines move with it.
  useEffect(() => {
    if (!studioEngine || studioStatus !== "ready") return;
    try {
      setRisk(
        studioEngine.risk(
          riskRequest(layout, data.tables.length, guests, eventDate)
        )
      );
    } catch {
      setRisk(null);
    }
  }, [
    studioEngine,
    studioStatus,
    layout,
    data.tables.length,
    guests,
    eventDate,
  ]);

  const seats = data.tables.reduce((a, t) => a + t.capacity, 0);
  const area = layout.width * layout.length;
  const zoneArea = layout.zones.reduce((a, z) => a + z.w * z.h, 0);
  const fireGuide = Math.floor(
    Math.max(0, area - zoneArea) / areaPerDiner(layout.venue)
  );
  const [fitPreset, setFitPreset] = useState("r10");
  const [aisle, setAisle] = useState(true);
  const [buffer, setBuffer] = useState(10);
  const fitPresets = TABLE_PRESETS.filter(
    (p) => p.shape !== "head" && p.key !== "s4"
  );
  const preset = fitPresets.find((p) => p.key === fitPreset) ?? fitPresets[0];
  // The Rust core does the packing once it has loaded; the TypeScript path is the fallback.
  const fitWith = useCallback(
    (opts: FitOptions): FitResult => {
      if (studioEngine) {
        try {
          return studioEngine.fit({
            width: opts.width,
            length: opts.length,
            zones: opts.zones.map((z) => ({
              ...z,
              shape: z.shape ?? null,
              rot: z.rot ?? null,
            })),
            obstacles: opts.obstacles ?? [],
            shape: opts.shape,
            capacity: opts.capacity,
            rotation: opts.rotation ?? 0,
            gap: opts.gap,
            aisle: opts.aisle ?? false,
          });
        } catch {
          /* fall back to the TypeScript packing */
        }
      }
      return fitTables(opts);
    },
    [studioEngine]
  );
  const fitEmpty = useMemo(
    () =>
      fitWith({
        width: layout.width,
        length: layout.length,
        zones: layout.zones,
        shape: preset.shape,
        capacity: preset.capacity,
        gap,
        aisle,
      }),
    [fitWith, layout.width, layout.length, layout.zones, preset, gap, aisle]
  );
  const fitAround = useMemo(
    () =>
      fitWith({
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
      fitWith,
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
    return {
      units,
      plan: planSeating(units, tables, front, {
        rules: layout.seatRules,
        occupants: new Map(
          data.tables.map((t) => [t.id, t.guests.map((g) => g.id)])
        ),
      }),
    };
  }, [data.unseatedGuests, data.tables, positions, front, layout.seatRules]);

  // ---------- seating rules ----------
  const ruleGuests = useMemo(
    () =>
      [...data.tables.flatMap((t) => t.guests), ...data.unseatedGuests]
        .map((g) => ({ id: g.id, name: g.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.tables, data.unseatedGuests]
  );
  const breaks = useMemo(() => {
    const tableOf = new Map<string, string | null>();
    for (const t of data.tables)
      for (const g of t.guests) tableOf.set(g.id, t.id);
    const names = new Map(ruleGuests.map((g) => [g.id, g.name]));
    const tableNames = new Map(data.tables.map((t) => [t.id, t.name]));
    return ruleBreaks(
      layout.seatRules,
      tableOf,
      (id) => names.get(id) ?? "A guest",
      (id) => tableNames.get(id) ?? "a table"
    );
  }, [layout.seatRules, data.tables, ruleGuests]);
  const addRule = (rule: SeatRule) => {
    updateLayout((l) => ({ ...l, seatRules: [...l.seatRules, rule] }));
    say(
      rule.kind === "together"
        ? "Keep-together rule saved"
        : "Keep-apart rule saved"
    );
  };
  const removeRule = (id: string) => {
    updateLayout((l) => ({
      ...l,
      seatRules: l.seatRules.filter((r) => r.id !== id),
    }));
    say("Rule removed");
  };

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
      chairs: layout.chairs.map((c) => {
        const at = chairPlacement(c, layout.zones);
        return {
          id: c.id,
          x: at.x,
          y: at.y,
          rot: at.yaw,
          lift: at.lift,
          type: chairType(c.chair ?? layout.decor.chair),
          cover: c.cover ?? layout.decor.cover,
          sash: c.sash !== undefined ? c.sash : layout.decor.sash,
          seat: c.seat ?? "guest",
        };
      }),
      // Resolved here, with the same maths as the plan, so the hall only has to draw them.
      stageItems: layout.stageItems.flatMap((item) => {
        const stage = layout.zones.find((z) => z.id === item.stageId);
        return stage ? [{ ...item, ...stageItemPlacement(item, stage) }] : [];
      }),
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
      board: dark ? "#1c1317" : pageBg,
      inset,
      units: unitsOf(layout),
      field: thermal?.field ?? null,
      heat,
      placing: placingUnit,
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
      dark,
      inset,
      thermal,
      heat,
      placingUnit,
    ]
  );

  // ---------- edits ----------
  const updateLayout = (fn: (l: HallLayout) => HallLayout) => {
    // Any edit makes the "new" side of a comparison stale, so stop comparing.
    setCompare(null);
    hall.update(fn, positions);
  };

  // ---------- layers: hidden, locked, ordered ----------
  const lockedKeys = new Set(layout.layers.locked);
  const isLocked = (p: Pick) => lockedKeys.has(`${p.type}:${p.id}`);
  const hideLayers = (keys: string[], hide: boolean) => {
    updateLayout((l) => setLayersHidden(l, keys, hide));
    // A hidden layer cannot stay selected: there would be nothing to see it by.
    if (hide)
      setSelection((cur) =>
        cur.filter((p) => !keys.includes(`${p.type}:${p.id}`))
      );
    say(hide ? "Hidden from the hall" : "Shown in the hall");
  };
  const lockLayers = (keys: string[], lock: boolean) => {
    updateLayout((l) => setLayersLocked(l, keys, lock));
    say(lock ? "Locked: it will not move" : "Unlocked");
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
  // When "Seat everyone" is the newest step, Undo (and Ctrl+Z) takes back the seats first.
  const [bulkAt, setBulkAt] = useState<{ at: number; n: number } | null>(null);
  const lastEditAt = hall.history.at(-1)?.at ?? 0;
  const seatUndoFirst =
    !!bulkAt && canUndoSeatEveryone && bulkAt.at >= lastEditAt;
  const undoSeats = async () => {
    if (!onUndoSeatEveryone) return;
    if (await onUndoSeatEveryone()) {
      setBulkAt(null);
      say("Seats taken back");
    }
  };
  const undo = () => {
    if (seatUndoFirst) {
      void undoSeats();
      return;
    }
    const snap = hall.undo(positions);
    if (snap) {
      setCompare(null);
      restorePositions(snap.positions);
      say("Undone");
    }
  };
  /** Undo several steps at once, back to just before a step in the History list. */
  const undoSteps = (n: number) => {
    let pos = positions;
    let last: { positions: Positions } | null = null;
    for (let i = 0; i < n; i++) {
      const snap = hall.undo(pos);
      if (!snap) break;
      last = snap;
      pos = snap.positions;
    }
    if (last) {
      setCompare(null);
      restorePositions(last.positions);
      say(n === 1 ? "Undone" : `Went back ${n} steps`);
    }
  };
  const historyEntries: HistoryEntry[] = [
    ...hall.history.map((h, i) => ({
      key: `h${i}-${h.at}`,
      label: h.label,
      at: h.at,
      onRevert: () => undoSteps(hall.history.length - i),
    })),
    ...(bulkAt && canUndoSeatEveryone
      ? [
          {
            key: `seat-${bulkAt.at}`,
            label: `Seated ${bulkAt.n} guests`,
            at: bulkAt.at,
            onRevert: () => void undoSeats(),
          },
        ]
      : []),
  ];
  const redo = () => {
    const snap = hall.redo(positions);
    if (snap) {
      setCompare(null);
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
  // The named group the whole selection sits in, if any: what "rename" and "ungroup" act on.
  const selGroup = groupHolding(selection, layout.groups);

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

  // ---------- cooling edits ----------
  const withCooling = (
    l: HallLayout,
    fn: (c: Cooling) => Cooling
  ): HallLayout => ({
    ...l,
    venue: { ...l.venue, cooling: fn(l.venue.cooling ?? defaultCooling()) },
  });
  const patchCooling = (patch: Partial<Cooling>) =>
    updateLayout((l) => withCooling(l, (c) => ({ ...c, ...patch })));

  // ---------- catering edits ----------
  const patchCatering = (patch: Partial<CateringAnswers>) =>
    updateLayout((l) => ({
      ...l,
      venue: {
        ...l.venue,
        catering: {
          ...normaliseCatering(l.venue.catering),
          ...patch,
        } as CateringPlan,
      },
    }));

  const exportCatering = async () => {
    if (!catering) return;
    setExporting(true);
    try {
      await downloadCateringList(catering);
      say("Shopping list downloaded.");
    } catch {
      say("The shopping list could not be prepared on this device.");
    } finally {
      setExporting(false);
    }
  };
  const addUnit = (x: number, y: number) => {
    const unit: AcUnit = {
      id: unitId(),
      x: round2(x),
      y: round2(y),
      hp: DEFAULT_UNIT_HP,
      mount: "wall",
      inverter: false,
    };
    updateLayout((l) =>
      withCooling(l, (c) => ({ ...c, units: [...c.units, unit] }))
    );
    setPlacingUnit(false);
    say("Unit placed");
  };
  /** A keyboard path to the same thing the floor click does: one unit, in a tidy grid. */
  const addUnitAtCentre = () => {
    const n = unitsOf(layout).length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(n + 1)));
    const rows = Math.ceil((n + 1) / cols);
    const x = (layout.width * ((n % cols) + 1)) / (cols + 1);
    const y = (layout.length * (Math.floor(n / cols) + 1)) / (rows + 1);
    addUnit(x, y);
  };
  const updateUnit = (id: string, patch: Partial<AcUnit>) =>
    updateLayout((l) =>
      withCooling(l, (c) => ({
        ...c,
        units: c.units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }))
    );
  const deleteUnit = (id: string) =>
    updateLayout((l) =>
      withCooling(l, (c) => ({
        ...c,
        units: c.units.filter((u) => u.id !== id),
      }))
    );
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
    if (isLocked(single)) {
      say("Locked: unlock it to turn it");
      return;
    }
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
    const acs = new Map(
      items.filter((i) => i.type === "ac").map((i) => [i.id, i])
    );
    if (zones.size || chairs.size || acs.size) {
      hall.update(
        (l) => ({
          ...l,
          zones: l.zones.map((z) => {
            const m = zones.get(z.id);
            return m ? { ...z, x: round2(m.x), y: round2(m.y) } : z;
          }),
          chairs: l.chairs.map((c) => {
            const m = chairs.get(c.id);
            if (!m) return c;
            // A chair on a stage that is moving in the same drag rides with it.
            if (c.stageId && zones.has(c.stageId)) return c;
            // The hall reports room metres; where it lands decides whether it stands on a
            // stage (stored from that stage's top-left) or on the floor.
            return chairAfterDrop(c, m, l.zones);
          }),
          venue: acs.size
            ? {
                ...l.venue,
                cooling: {
                  ...(l.venue.cooling ?? defaultCooling()),
                  units: (l.venue.cooling?.units ?? []).map((u) => {
                    const m = acs.get(u.id);
                    return m ? { ...u, x: round2(m.x), y: round2(m.y) } : u;
                  }),
                },
              }
            : l.venue,
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
      if (isLocked(p)) continue;
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
    else if (selection.some(isLocked)) say("Locked: unlock it to move it");
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

  const addChairs = (n: number, spacing: number, seat: SeatKind = "guest") => {
    const cx = layout.width / 2;
    const cy = clamp(front.y + 4, 1, layout.length - 1);
    const chairs = chairRow(n, spacing, cx, cy, 0, seat);
    updateLayout((l) => ({ ...l, chairs: [...l.chairs, ...chairs] }));
    setSelection(chairs.map((c) => ({ type: "chair", id: c.id })));
    const what =
      seat === "couch"
        ? n === 1
          ? "couch"
          : "couches"
        : n === 1
          ? "chair"
          : "chairs";
    say(`${n} ${what} added`);
  };

  /** Put a podium, lectern or arch on a stage. It moves when the stage moves. */
  const addStageItem = (kind: StageItem["kind"], onStageId?: string) => {
    // Read the stage from the live layout, not this render's copy: the stage it names may have
    // been added moments ago, and attaching to the version before that edit loses the fixture.
    const stage = hall.latest.current.zones.find((z) =>
      onStageId ? z.id === onStageId : z.kind === "stage"
    );
    if (!stage) {
      say("Add a stage first, then the items go on it.");
      return;
    }
    const item: StageItem = {
      id: zoneId(),
      stageId: stage.id,
      kind,
      // Where it goes, and clear of whatever already stands on this stage, comes from the model.
      ...nextStageSpot(
        kind,
        hall.latest.current.stageItems.filter((s) => s.stageId === stage.id)
      ),
    };
    updateLayout((l) => ({ ...l, stageItems: [...l.stageItems, item] }));
    setSelection([{ type: "zone", id: stage.id }]);
    // Otherwise the stage top is a speck from the whole-room view and the host cannot see it land.
    // `frame` aims at the centre of the area, and a zone's x and y are already its centre.
    view3d.current?.frame({
      x: stage.x,
      y: stage.y,
      w: stage.w,
      h: stage.h,
      height: stage.height ?? 0.8,
    });
    say(`${STAGE_ITEM_WORD[kind]} added to the stage`);
  };

  const addZone = (g: (typeof ZONE_GALLERY)[number]) => {
    const def = ZONE_DEFAULTS[g.kind];
    // The custom variants below carry their own `kind`, so they go before `kind` so it always
    // wins; spreading them after would turn every gallery entry into a custom block.
    const custom =
      g.kind === "custom"
        ? g.label === "Custom table"
          ? { variant: "table" as const, height: 0.76 }
          : { variant: "block" as const, height: 1 }
        : {};
    const z: Zone = {
      id: zoneId(),
      ...custom,
      kind: g.kind,
      label:
        g.kind === "dance"
          ? "Dance floor"
          : g.kind === "custom"
            ? g.label === "Custom table"
              ? "Custom table"
              : "Item"
            : def.label,
      x: round2(hall.latest.current.width / 2),
      // A stage belongs at the front of the room, as the starting plan has it, not on top of the
      // dance floor in the middle. Everything else still starts at the centre, easy to find.
      y:
        g.kind === "stage"
          ? round2((g.h ?? def.h) / 2 + 0.4)
          : round2(hall.latest.current.length / 2),
      w: g.w ?? def.w,
      h: g.h ?? def.h,
      ...(g.shape ? { shape: g.shape } : {}),
      ...(g.kind === "stage" ? { height: 0.8 } : {}),
    };
    updateLayout((l) => ({ ...l, zones: [...l.zones, z] }));
    setSelection([{ type: "zone", id: z.id }]);
    say(`${z.label} added`);
  };

  /**
   * A copy of everything selected, offset so it lands clear of the original. Chairs and areas copy
   * in place; tables have to be created on the server, so they come back a moment later and are
   * selected together once they do.
   */
  const duplicate = (of: Pick[] = selection) => {
    if (of.length === 0) return;
    const zones: Zone[] = [];
    const chairs: FreeChair[] = [];
    for (const p of of) {
      if (p.type === "zone") {
        const z = layout.zones.find((x) => x.id === p.id);
        if (z) zones.push(copyZone(z, layout));
      } else if (p.type === "chair") {
        const c = layout.chairs.find((x) => x.id === p.id);
        if (c) chairs.push(copyChair(c, layout));
      }
    }
    const tables = of
      .filter((p) => p.type === "table")
      .map((p) => data.tables.find((t) => t.id === p.id))
      .filter((t): t is TableWithGuests => !!t);
    if (zones.length || chairs.length)
      updateLayout((l) => ({
        ...l,
        zones: [...l.zones, ...zones],
        chairs: [...l.chairs, ...chairs],
      }));
    if (tables.length) {
      const names = nextTableNames(data.tables, tables.length);
      void addTables(
        tables.map((t, i) => ({
          name: names[i],
          shape: t.shape as TableShape,
          capacity: t.capacity,
          position_x: toCm(
            Math.min((positions[t.id]?.x ?? 0) + 1, layout.width - 1)
          ),
          position_y: toCm(
            Math.min((positions[t.id]?.y ?? 0) + 1, layout.length - 1)
          ),
        }))
      ).then((created) => {
        if (created.length === 0) return;
        // Copies keep the styling and rotation of what they came from.
        const from = tables.slice(0, created.length);
        updateLayout((l) => ({
          ...l,
          rotations: {
            ...l.rotations,
            ...Object.fromEntries(
              created.map((c, i) => [c.id, l.rotations[from[i].id] ?? 0])
            ),
          },
          tableStyles: {
            ...l.tableStyles,
            ...Object.fromEntries(
              created
                .map((c, i) => [c.id, l.tableStyles[from[i].id]] as const)
                .filter(
                  (e): e is [string, NonNullable<(typeof e)[1]>] => !!e[1]
                )
            ),
          },
        }));
        setSelection([
          ...zones.map((z) => ({ type: "zone" as const, id: z.id })),
          ...chairs.map((c) => ({ type: "chair" as const, id: c.id })),
          ...created.map((c) => ({ type: "table" as const, id: c.id })),
        ]);
      });
    }
    const made = zones.length + chairs.length + tables.length;
    if (made) say(`${made} ${made === 1 ? "copy" : "copies"} made`);
  };

  /** Group what is selected under a name, so it moves as one thing. */
  const groupSelected = (name: string) => {
    if (selection.length < 2) {
      say("Select two or more items to group them.");
      return;
    }
    const { groups, group } = makeGroup(layout, selection, name);
    updateLayout((l) => ({ ...l, groups }));
    say(`“${group.name}” now holds ${group.items.length} items`);
  };

  const renameGroup = (id: string, name: string) =>
    updateLayout((l) => ({
      ...l,
      groups: l.groups.map((g) =>
        g.id === id ? { ...g, name: name.trim().slice(0, 60) || g.name } : g
      ),
    }));

  const ungroup = (id: string) => {
    updateLayout((l) => ({
      ...l,
      groups: l.groups.filter((g) => g.id !== id),
    }));
    say("Group taken apart");
  };

  /** Add a row of tables, spaced across the hall in front of the stage. */
  const addTableRow = async (n: number, perRow: number) => {
    const slots = tableRowSlots(n, perRow, layout, front.x, front.y + 6);
    const names = nextTableNames(data.tables, slots.length);
    const created = await addTables(
      slots.map((p, i) => ({
        name: names[i],
        shape: preset.shape,
        capacity: preset.capacity,
        position_x: toCm(p.x),
        position_y: toCm(p.y),
      }))
    );
    if (created.length)
      setSelection(created.map((c) => ({ type: "table", id: c.id })));
    say(`${created.length} ${created.length === 1 ? "table" : "tables"} added`);
  };

  const remove = () => {
    if (selection.length === 0) return;
    // A locked layer is protected from the Delete key and the bin alike.
    const doomed = selection.filter((p) => !isLocked(p));
    if (doomed.length < selection.length) {
      say("Locked layers stay: unlock them to delete them");
      if (doomed.length === 0) return;
    }
    const zones = new Set(
      doomed.filter((s) => s.type === "zone").map((s) => s.id)
    );
    const chairs = new Set(
      doomed.filter((s) => s.type === "chair").map((s) => s.id)
    );
    if (zones.size || chairs.size) {
      const gone = new Set([...zones, ...chairs]);
      updateLayout((l) => ({
        ...l,
        zones: l.zones.filter((z) => !zones.has(z.id)),
        chairs: l.chairs.filter((c) => !chairs.has(c.id)),
        // A podium or arch on a deleted stage goes with it.
        stageItems: l.stageItems.filter((s) => !zones.has(s.stageId)),
        groups: forgetItems(l.groups, gone),
      }));
    }
    const tables = doomed.filter((s) => s.type === "table");
    if (tables.length === 1) onDeleteTable(tables[0].id);
    else if (tables.length > 1)
      say("Delete tables one at a time, so nobody loses a seat by accident.");
    setSelection((cur) => cur.filter(isLocked));
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
    // Record the room even when every table sits square: the checklist builds its tasks from the
    // saved layout, so filling the hall without a rotation still has to write one.
    if (created.length)
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
        ? `Only ${created.length} more ${created.length === 1 ? "table fits" : "tables fit"} in a ${layout.width} × ${layout.length} m hall. Make the room bigger, use snug spacing or choose smaller tables.`
        : `${created.length} tables added`
    );
    // Show the whole hall again: after a bulk change the camera could be left zoomed in, with
    // half the hall under the side panel.
    if (created.length > 1) view3d.current?.command("fit");
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

  /** Ask the Rust engine for three ranked layouts of the whole hall. */
  const suggestLayouts = () => {
    if (!studioEngine) {
      say("The layout engine is still loading.");
      return;
    }
    const tables: SuggestTable[] = data.tables.map((t) => ({
      id: t.id,
      shape: t.shape,
      capacity: t.capacity,
      occupied: t.occupiedSeats,
    }));
    try {
      const res = studioEngine.arrange(
        toArrangeRequest(layout, tables, gap, seedFrom(eventId, layout.version))
      );
      setSuggestions(res.options);
      say(
        res.options.length
          ? `${res.options.length} layouts to choose from.`
          : "No layouts could be worked out for this hall."
      );
    } catch {
      say("Could not work out layouts just now.");
    }
  };

  /** Apply one of the suggested layouts, as a single undoable step. */
  const chooseSuggestion = (option: LayoutOption) => {
    const tableIds = data.tables.map((t) => t.id);
    const applied = applyOption(option, tableIds, layout);
    const next: HallLayout = {
      ...layout,
      zones: applied.zones,
      rotations: {
        ...layout.rotations,
        ...Object.fromEntries(applied.positions.map((p) => [p.id, p.rot])),
      },
    };
    const nextPositions: Positions = { ...positions };
    for (const p of applied.positions) nextPositions[p.id] = { x: p.x, y: p.y };

    hall.update(next, positions);
    void setTablePositions(
      applied.positions.map((p) => ({ id: p.id, x: toCm(p.x), y: toCm(p.y) }))
    );
    setCompare({
      before: { layout, positions },
      after: { layout: next, positions: nextPositions },
      showing: "new",
    });
    setSelection([]);
    setSuggestions(null);
    view3d.current?.command("fit");
    say(`${option.archetype_label} applied. Compare it with what you had.`);
  };

  /** Flip the hall between the layout the host had and the one just applied. */
  const showCompared = (which: Compared) => {
    if (!compare || compare.showing === which) return;
    const target = which === "current" ? compare.before : compare.after;
    hall.replace(target.layout);
    restorePositions(target.positions);
    setCompare({ ...compare, showing: which });
    say(
      which === "current"
        ? "Showing the layout you had."
        : "Showing the new layout."
    );
  };

  /** Settle on whichever layout is showing, and stop comparing. */
  const keepCompared = (which: Compared) => {
    if (!compare) return;
    if (which === "current") {
      hall.replace(compare.before.layout);
      restorePositions(compare.before.positions);
      say("Kept the layout you had.");
    } else {
      say("Kept the new layout.");
    }
    setCompare(null);
  };

  const seatEveryone = async () => {
    setBusy("seat");
    const res = await bulkAssign(seatPlan.plan.assignments);
    if (res.seated > 0) setBulkAt({ at: Date.now(), n: res.seated });
    setBusy(null);
    view3d.current?.command("fit");
  };

  const assignTo = (guestId: string, tableId: string) => {
    onAssignTable(guestId, tableId);
    setAssigning(null);
  };

  const toggleKeys = () => {
    setFlyout(null);
    setKeysOpen((v) => !v);
  };
  const openDecor = () => {
    setSelection([]);
    setDeck("decor");
  };
  const toggleMood = () =>
    updateLayout((l) => ({
      ...l,
      mood: l.mood === "evening" ? "day" : "evening",
    }));

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
      if (keysOpen) setKeysOpen(false);
      else if (assigning) setAssigning(null);
      else if (flyout) setFlyout(null);
      else setSelection([]);
    } else if (key === "?") toggleKeys();
    else if (k === "v" || k === "m") setTool("select");
    else if (k === "h" || k === "d") setTool("hand");
    else if (k === "a") {
      if (busy === null) autoLayout();
    } else if (k === "t") setFlyout(flyout === "table" ? null : "table");
    else if (k === "c") setFlyout(flyout === "chair" ? null : "chair");
    else if (k === "s") setFlyout(flyout === "zone" ? null : "zone");
    else if (k === "p") openDecor();
    else if (k === "y") {
      if (mode === "studio") setDockOpen((v) => !v);
    } else if (k === "l") setLabels((v) => !v);
    else if (k === "n") toggleMood();
    else if (k === "w") {
      if (!openVenue) return false;
      view3d.current?.command("rain");
      setRain((v) => !v);
    } else if (k === "f") view3d.current?.command("fit");
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
      // Clicking one member of a group picks up the whole group: it is one thing to move.
      const picked: Picked[] = m.items
        .filter((i) => i.type !== "ac")
        .map(({ type, id }) => ({ type, id }));
      setSelection(expandSelection(picked, layout.groups));
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
    else if (m.t === "duplicate" && m.items) {
      // Ctrl-click on the canvas: copy what was clicked, and leave the copies selected.
      const picked: Picked[] = m.items
        .filter((i) => i.type !== "ac")
        .map(({ type, id }) => ({ type, id }));
      const whole = expandSelection(picked, layout.groups);
      setSelection(whole);
      duplicate(whole);
    } else if (m.t === "placeAc" && m.x !== undefined && m.y !== undefined)
      addUnit(m.x, m.y);
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
    else if (m.t === "rain") setRain(!!m.on);
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
  const unseatedSeats = counts.toSeat.people;
  const evening = layout.mood === "evening";
  // Rain only makes sense where there is sky above the tables.
  const openVenue =
    layout.venue.environment === "outdoor" ||
    ["garden", "field", "beach", "rooftop"].includes(layout.venue.type);

  const rail =
    "group/rail relative grid h-11 w-11 place-items-center rounded-full text-night transition-colors hover:bg-[#f1ece4] aria-pressed:bg-night aria-pressed:text-white aria-expanded:bg-night aria-expanded:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";
  const chip =
    "grid h-11 w-11 place-items-center rounded-full text-night transition-colors hover:bg-[#f1ece4] disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";
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
      stat: unseatedSeats
        ? `${unseatedSeats} to seat`
        : counts.accepted.people
          ? "All seated"
          : "No yes yet",
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
      stat: `${counts.seatedPct}% seated`,
    },
    {
      key: "thermal",
      label: "Cooling",
      icon: Thermometer,
      stat: thermal?.advice
        ? {
            viable: "Holds",
            damp: "Damp",
            "too-many": "Too many",
            "under-cooled": "Too hot",
            "not-viable": "Not viable",
          }[thermal.advice.level]
        : "—",
    },
    {
      key: "catering",
      label: "Catering",
      icon: UtensilsCrossed,
      stat: catering ? `${catering.portions} portions` : "—",
    },
    {
      key: "history",
      label: "History",
      icon: HistoryIcon,
      stat: hall.history.length
        ? `${hall.history.length} ${hall.history.length === 1 ? "step" : "steps"}`
        : "No steps yet",
    },
    {
      key: "risk",
      label: "Risks",
      icon: ShieldAlert,
      stat: risk
        ? `${risk.items.filter((i) => i.safetyCritical).length} safety`
        : "—",
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

  const meter = (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2" data-testid="hall-meter">
      {[
        {
          k: "Coming",
          v: counts.accepted.people,
          note: counts.awaiting.people
            ? `+${counts.awaiting.people} awaiting reply`
            : undefined,
        },
        {
          k: "Seats",
          v: seats,
          note:
            seats >= target
              ? "enough"
              : `${target - seats} short${buffer ? ` with ${buffer}% buffer` : ""}`,
          bad: seats < target,
        },
        { k: "Hall fits", v: fitEmpty.seats, wide: true },
        {
          k: "Fire guide",
          v: fireGuide,
          note: "max",
          wide: true,
        },
      ].map((m) => (
        <div
          key={m.k}
          className="flex min-w-0 flex-wrap items-baseline gap-x-1"
        >
          <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-label-2">
            {m.k}
          </dt>
          <dd className="flex min-w-0 flex-wrap items-baseline gap-x-1">
            <span className="text-sm font-bold tabular-nums">{m.v}</span>
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
  );

  return (
    <section
      ref={studio}
      aria-label="Hall studio"
      className={cn(
        "relative flex h-full min-h-0 flex-1 flex-col text-night",
        dark && "dark studio-dark"
      )}
      data-testid="hall-studio"
    >
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {/* About 25 Tab presses used to stand between the page top and the panel. These links
          appear on focus and jump straight there. */}
      <nav
        aria-label="Skip links"
        className="pointer-events-none fixed left-3 top-3 z-50 flex flex-col gap-1"
      >
        {[
          ["#hall-tools", "Skip to planning tools"],
          ["#hall-panel", "Skip to the open panel"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            onClick={(e) => {
              const el = document.querySelector<HTMLElement>(href);
              if (!el) return;
              e.preventDefault();
              if (!el.hasAttribute("tabindex"))
                el.setAttribute("tabindex", "-1");
              el.focus();
            }}
            className="pointer-events-auto sr-only rounded-full bg-night px-4 py-2 text-xs font-semibold text-white focus:not-sr-only focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            {label}
          </a>
        ))}
      </nav>

      {
        <>
          {/* The hall fills the whole studio; the controls and the side panel float over it, so
              panning never crops it at a box edge. */}
          <div ref={body} className="relative min-h-0 flex-1">
            {/* On a laptop or desktop the studio is three fixed zones under one top bar, like a
                design tool: this strip is that bar's background; the title and actions sit on it. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-14 border-b border-hairline bg-[#fbf9f5]"
            />
            <Hall3D
              ref={view3d}
              scene={scene}
              onMessage={onMessage}
              className="fixed inset-0 z-0"
            />
            {/* Canvas controls */}
            <div
              className={cn(
                // z-10 keeps the floating controls above the canvas, which is `fixed inset-0 z-0`:
                // without it the compare bar and the zoom buttons sit under the iframe and cannot
                // be clicked.
                "pointer-events-none absolute inset-0 z-10 transition-[right,bottom] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                panelOpen &&
                  "max-lg:bottom-[calc(44%+0.75rem)] lg:right-[360px]"
              )}
            >
              {/* Back, the page's name and the mode switch: the only chrome the app leaves. */}
              <div className="pointer-events-auto absolute left-3 top-0 flex h-14 max-w-[calc(100%-30rem)] items-center">
                <WorkspaceBar
                  backHref={backHref ?? `/events/${eventId}`}
                  eventTitle={eventTitle}
                  detail={`${layout.width} × ${layout.length} m`}
                  status={
                    <SaveStatus state={hall.saveState} onRetry={hall.retry} />
                  }
                />
              </div>
              {/* What needs attention, under the bar and clear of the tool rail and dock. */}
              <div
                className={cn(
                  "pointer-events-none absolute right-3 top-[80px] flex flex-col items-center gap-1.5 lg:top-[68px]",
                  leftEdge
                )}
              >
                {/* On a phone the bar has no room for the switch, so it sits here. */}
                <div className="pointer-events-auto sm:hidden">
                  <ModeSwitch mode={mode} onChange={chooseMode} />
                </div>
                {pendingProposals > 0 && (
                  // A connected app has suggested a room or a seating plan. It is reviewed, with
                  // a preview and an undo, on the approvals desk: the studio only points there.
                  <Link
                    href="/approvals"
                    data-testid="hall-proposals"
                    className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-night px-4 text-xs font-semibold text-white shadow-lg hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    <Sparkles
                      size={14}
                      aria-hidden="true"
                      className="text-[#e9c98a]"
                    />
                    {pendingProposals === 1
                      ? "A connected app suggested a change. Review it"
                      : `Connected apps suggested ${pendingProposals} changes. Review them`}
                  </Link>
                )}
                {hall.conflict && (
                  <ConflictBanner
                    onTakeTheirs={hall.takeTheirs}
                    onKeepMine={hall.keepMine}
                  />
                )}
                {/* Below the hall numbers rather than centred on the top edge: at the widths the
                    studio actually runs at, a centred bar sits underneath this card and cannot be
                    clicked. */}
                {compare && (
                  <div className="pointer-events-auto">
                    <LayoutComparison
                      showing={compare.showing}
                      onShow={showCompared}
                      onKeep={keepCompared}
                    />
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {studioStatus === "unavailable" && (
                    <span className="pointer-events-auto inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-[11px] text-label-2 shadow-sm">
                      Running the built-in layout engine.
                    </span>
                  )}
                  {assigning && (
                    <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-burgundy py-1.5 pl-3 pr-1.5 text-xs font-semibold text-white shadow-lg">
                      Click a table for{" "}
                      {
                        data.unseatedGuests.find((g) => g.id === assigning)
                          ?.name
                      }
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
                  {mode === "studio" && warnCount > 0 && (
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
                      {warnCount}{" "}
                      {warnCount === 1 ? "table needs" : "tables need"} more
                      space · Fix
                    </button>
                  )}
                  {mode === "studio" &&
                    data.tables.length === 0 &&
                    !assigning && (
                      <span
                        className={cn(
                          float,
                          "pointer-events-auto px-3 py-1.5 text-[11px] font-semibold text-night"
                        )}
                      >
                        Add a table with +, or fill the hall from Fit
                      </span>
                    )}
                </div>
              </div>

              {/* Undo, redo, picture */}
              <div
                className={cn(
                  "pointer-events-auto absolute top-0 flex h-14 items-center gap-0.5",
                  // The canvas controls stop at the side panel on a laptop; the top bar runs to
                  // the screen's edge, so its actions reach past that by the panel's width.
                  panelOpen ? "right-3 lg:right-[-348px]" : "right-3"
                )}
              >
                <div className="mr-2 hidden sm:block">
                  <ModeSwitch mode={mode} onChange={chooseMode} />
                </div>
                {onNewTable && (
                  <>
                    <button
                      type="button"
                      className={cn(
                        chip,
                        "bg-burgundy text-ivory hover:bg-wine"
                      )}
                      onClick={onNewTable}
                      aria-label="New table"
                      title="New table (choose its name and size)"
                    >
                      <Plus size={17} />
                    </button>
                    <span
                      className="mx-0.5 h-5 w-px bg-hairline"
                      aria-hidden="true"
                    />
                  </>
                )}
                <button
                  type="button"
                  className={chip}
                  onClick={undo}
                  disabled={!hall.canUndo && !seatUndoFirst}
                  aria-label="Undo"
                  title="Undo (Ctrl + Z)"
                >
                  <Undo2 size={17} />
                </button>
                <button
                  type="button"
                  className={chip}
                  onClick={redo}
                  disabled={!hall.canRedo}
                  aria-label="Redo"
                  title="Redo (Ctrl + Shift + Z)"
                >
                  <Redo2 size={17} />
                </button>
                <HistoryMenu entries={historyEntries} className={chip} />
                <ShareMenu
                  eventId={eventId}
                  eventTitle={eventTitle}
                  layout={layout}
                  tables={data.tables.map((t) => ({
                    name: t.name,
                    shape: t.shape,
                    capacity: t.capacity,
                    x: positions[t.id]?.x ?? 0,
                    y: positions[t.id]?.y ?? 0,
                    rot: rotationOf(t.id),
                    seated: t.occupiedSeats,
                  }))}
                  initialToken={shareOf(initialLayout)?.token ?? null}
                  currentRev={hall.currentRev}
                  adoptRev={hall.adoptRev}
                  whenIdle={hall.whenIdle}
                  onSnapshot={() => view3d.current?.command("snapshot")}
                  printHref={`/events/${eventId}/seating/print`}
                  className={chip}
                  onSay={say}
                />
                <span
                  className="mx-0.5 h-5 w-px bg-hairline"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className={chip}
                  onClick={toggleTheme}
                  aria-pressed={dark}
                  aria-label={dark ? "Light interface" : "Dark interface"}
                  title={
                    dark
                      ? "Switch to the light interface"
                      : "Switch to the dark interface"
                  }
                >
                  <SunMoon size={17} />
                </button>
                {mode === "studio" && (
                  <span
                    className="mx-0.5 h-5 w-px bg-hairline"
                    aria-hidden="true"
                  />
                )}
                {/* With the panel tucked away, its tools wait here: one click springs it open on one. */}
                {mode === "studio" &&
                  !panelOpen &&
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
                {mode === "studio" && (
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
                )}
              </div>

              {(toast || notice) && (
                // Centred in the space the hall actually has, between the dock and the panel, so
                // the left dock never covers the start of a message.
                <div
                  className={cn(
                    "pointer-events-none absolute bottom-20 right-3 flex justify-center lg:bottom-[6.5rem]",
                    leftEdge
                  )}
                >
                  {toast && !notice && (
                    <div
                      key={toast.n}
                      aria-hidden="true"
                      data-testid="hall-toast"
                      className={cn(
                        float,
                        "pointer-events-none max-w-full px-4 py-2 text-xs font-semibold text-night"
                      )}
                    >
                      {toast.msg}
                    </div>
                  )}
                  {notice && (
                    <div
                      role="status"
                      className={cn(
                        float,
                        // Above both bottom bars, so it is never hidden behind the zoom controls, and
                        // clickable so its Undo button works.
                        "pointer-events-auto max-w-full px-4 py-2 text-xs font-semibold"
                      )}
                    >
                      {notice}
                    </div>
                  )}
                </div>
              )}

              {mode === "studio" && (
                <>
                  {/* Tool rail: centred on the page on a desktop; under the Back bar and scrollable on a tablet or phone, where the panel and camera controls take the rest of the height. */}
                  <div
                    role="toolbar"
                    aria-label="Hall tools"
                    aria-orientation="vertical"
                    className={cn(
                      float,
                      "pointer-events-auto absolute left-3 flex flex-col items-center gap-1 rounded-[26px] p-1.5 max-lg:top-[80px] max-lg:max-h-[calc(100%-6rem)] max-lg:overflow-y-auto lg:bottom-0 lg:left-0 lg:top-14 lg:w-14 lg:overflow-y-auto lg:rounded-none lg:border-y-0 lg:border-l-0 lg:py-3 lg:shadow-none"
                    )}
                  >
                    <button
                      type="button"
                      className={rail}
                      aria-pressed={dockOpen}
                      onClick={() => setDockOpen((v) => !v)}
                      aria-label="Layers and tables"
                      aria-controls={dockShown ? "left-dock" : undefined}
                    >
                      <LayersIcon size={18} />
                      <RailTip label="Layers and tables" keys={["Y"]} />
                    </button>
                    <span
                      className="my-0.5 h-px w-6 bg-hairline"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      className={rail}
                      aria-pressed={tool === "select"}
                      onClick={() => setTool("select")}
                      aria-label="Select and move"
                      aria-keyshortcuts="V M"
                    >
                      <MousePointer2 size={18} />
                      <RailTip label="Move" keys={["V", "M"]} />
                    </button>
                    <button
                      type="button"
                      className={rail}
                      aria-pressed={tool === "hand"}
                      onClick={() => setTool("hand")}
                      aria-label="Pan around"
                      aria-keyshortcuts="H D"
                    >
                      <Hand size={18} />
                      <RailTip
                        label="Drag the view (or hold Space)"
                        keys={["H", "D"]}
                      />
                    </button>
                    <button
                      type="button"
                      className={rail}
                      onClick={autoLayout}
                      disabled={busy !== null}
                      aria-label="Auto layout"
                      aria-keyshortcuts="A"
                    >
                      <Sparkles size={18} />
                      <RailTip label="Auto layout" keys={["A"]} />
                    </button>
                    <span
                      className="my-0.5 h-px w-6 bg-hairline"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      className={rail}
                      aria-expanded={flyout === "table"}
                      onClick={() =>
                        setFlyout(flyout === "table" ? null : "table")
                      }
                      aria-label="Add a table"
                      aria-keyshortcuts="T"
                    >
                      <CirclePlus size={18} />
                      <RailTip label="Add a table" keys={["T"]} />
                    </button>
                    <button
                      type="button"
                      className={rail}
                      aria-expanded={flyout === "chair"}
                      onClick={() =>
                        setFlyout(flyout === "chair" ? null : "chair")
                      }
                      aria-label="Add chairs"
                      aria-keyshortcuts="C"
                    >
                      <Armchair size={18} />
                      <RailTip label="Add chairs" keys={["C"]} />
                    </button>
                    <button
                      type="button"
                      className={rail}
                      aria-expanded={flyout === "zone"}
                      onClick={() =>
                        setFlyout(flyout === "zone" ? null : "zone")
                      }
                      aria-label="Add a stage, dance floor or area"
                      aria-keyshortcuts="S"
                    >
                      <Shapes size={18} />
                      <RailTip
                        label="Stage, dance floor or area"
                        keys={["S"]}
                      />
                    </button>
                    <span
                      className="my-0.5 h-px w-6 bg-hairline"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      className={rail}
                      aria-pressed={deck === "decor" && selection.length === 0}
                      onClick={openDecor}
                      aria-label="Décor"
                      aria-keyshortcuts="P"
                    >
                      <Palette size={18} />
                      <RailTip label="Décor palette" keys={["P"]} />
                    </button>
                    <button
                      type="button"
                      className={rail}
                      aria-pressed={labels}
                      onClick={() => setLabels((v) => !v)}
                      aria-label="Show table names"
                      aria-keyshortcuts="L"
                    >
                      <Tag size={18} />
                      <RailTip label="Table names" keys={["L"]} />
                    </button>
                    <button
                      type="button"
                      className={rail}
                      onClick={toggleMood}
                      aria-label={
                        evening
                          ? "Switch to daytime light"
                          : "Switch to evening light"
                      }
                      aria-keyshortcuts="N"
                    >
                      {evening ? <Sun size={18} /> : <Moon size={18} />}
                      <RailTip
                        label={evening ? "Daytime light" : "Evening light"}
                        keys={["N"]}
                      />
                    </button>
                    {openVenue && (
                      <button
                        type="button"
                        className={rail}
                        aria-pressed={rain}
                        onClick={() => {
                          view3d.current?.command("rain");
                          setRain((v) => !v);
                        }}
                        aria-label={rain ? "Stop the rain" : "Show rain"}
                      >
                        <CloudRain size={18} />
                        <RailTip
                          label={rain ? "Stop the rain" : "Rain"}
                          keys={["W"]}
                        />
                      </button>
                    )}
                    <span
                      className="my-0.5 h-px w-6 bg-hairline"
                      aria-hidden="true"
                    />
                    <button
                      type="button"
                      className={cn(rail, "text-label-2")}
                      aria-expanded={keysOpen}
                      onClick={toggleKeys}
                      aria-label="Keyboard shortcuts"
                      aria-keyshortcuts="Shift+?"
                    >
                      <Keyboard size={16} />
                      <RailTip label="Keyboard shortcuts" keys={["?"]} />
                    </button>
                  </div>

                  {keysOpen && !flyout && (
                    <ShortcutSheet onClose={() => setKeysOpen(false)} />
                  )}

                  {/* Flyouts */}
                  {flyout && (
                    <div
                      className="pointer-events-auto absolute left-[4.25rem] top-[80px] z-30 max-h-[calc(100%-6rem)] lg:left-[4.5rem] lg:top-[68px] w-[min(300px,calc(100%-6rem))] overflow-y-auto rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_20px_50px_-20px_rgba(28,7,13,0.45)]"
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
                      {flyout === "table" && (
                        <div className="mt-2">
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-label-2">
                            Rows of tables
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {TABLE_ROWS.map((r) => (
                              <button
                                key={r.key}
                                type="button"
                                onClick={() => {
                                  setFlyout(null);
                                  void addTableRow(r.n, r.perRow);
                                }}
                                className={cn(
                                  card,
                                  "flex flex-col items-center gap-1 px-1 py-2"
                                )}
                              >
                                <span className="flex flex-wrap justify-center gap-0.5">
                                  {Array.from(
                                    { length: Math.min(r.n, 6) },
                                    (_, i) => (
                                      <span
                                        key={i}
                                        className="h-2 w-2 rounded-full bg-burgundy/70"
                                      />
                                    )
                                  )}
                                </span>
                                {r.label}
                              </button>
                            ))}
                          </div>
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
                                addChairs(g.n, g.spacing, g.seat);
                              }}
                              className={cn(
                                card,
                                "flex flex-col items-center gap-1 px-1 py-2.5"
                              )}
                            >
                              <span className="flex">
                                {Array.from(
                                  { length: Math.min(g.n, 3) },
                                  (_, i) => (
                                    <ChairGlyph
                                      key={i}
                                      type={layout.decor.chair}
                                      size={g.n > 1 ? 18 : 26}
                                    />
                                  )
                                )}
                              </span>
                              {g.label}
                            </button>
                          ))}
                          <p className="col-span-3 mt-1 text-[11px] text-label-2">
                            New chairs use the hall’s chair style; change any of
                            them in the inspector.
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
                                <ShapeGlyph
                                  shape={g.shape ?? "rect"}
                                  size={18}
                                />
                              </span>
                              {g.label}
                            </button>
                          ))}
                          <p className="col-span-2 mt-1 text-[11px] font-semibold uppercase tracking-wide text-label-2">
                            On the stage
                          </p>
                          {(
                            [
                              ["podium", "Podium"],
                              ["lectern", "Lectern"],
                              ["arch", "Arch"],
                            ] as const
                          ).map(([kind, label]) => (
                            <button
                              key={kind}
                              type="button"
                              onClick={() => {
                                setFlyout(null);
                                addStageItem(kind);
                              }}
                              className={cn(
                                card,
                                "flex items-center gap-2 px-2 py-2 text-left"
                              )}
                            >
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f6f1e8] text-burgundy">
                                <ShapeGlyph shape="rect" size={18} />
                              </span>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Layers and the table list, beside the tool rail. */}
                  {dockShown && (
                    <div
                      id="left-dock"
                      className="animate-in fade-in slide-in-from-left-2 pointer-events-auto absolute bottom-3 left-[4.25rem] top-[80px] z-20 w-[min(310px,calc(100%-5.5rem))] duration-300 lg:bottom-0 lg:left-14 lg:top-14 lg:w-[300px] lg:border-r lg:border-hairline lg:bg-[#fbf9f5] lg:[&>*]:h-full lg:[&>*]:rounded-none lg:[&>*]:border-0 lg:[&>*]:shadow-none"
                    >
                      <LeftDock
                        layout={layout}
                        tables={data.tables}
                        unseated={data.unseatedGuests}
                        selection={selection}
                        onSelect={(picks, additive) => {
                          setSelection((cur) =>
                            additive
                              ? picks.reduce(
                                  (acc, p) =>
                                    acc.some(
                                      (a) => a.type === p.type && a.id === p.id
                                    )
                                      ? acc.filter(
                                          (a) =>
                                            !(
                                              a.type === p.type && a.id === p.id
                                            )
                                        )
                                      : [...acc, p],
                                  cur
                                )
                              : picks
                          );
                          if (!additive && picks[0])
                            view3d.current?.focus(
                              `${picks[0].type}:${picks[0].id}`
                            );
                        }}
                        onRenameTable={(id, name) =>
                          void updateTable(id, { name })
                        }
                        onRenameLayer={(row, name) =>
                          updateLayout((l) => renameLayer(l, row, name))
                        }
                        onAssign={onAssignTable}
                        onHover={(key) => view3d.current?.hover(key)}
                        onToggleHidden={hideLayers}
                        onToggleLocked={lockLayers}
                        onReorder={(listed, moving, onto) =>
                          updateLayout((l) =>
                            moveLayer(l, listed, moving, onto)
                          )
                        }
                        onNudge={(listed, key, by) =>
                          updateLayout((l) => nudgeLayer(l, listed, key, by))
                        }
                        onNewTable={() => onNewTable?.()}
                        onAutoSeat={() => {
                          setSelection([]);
                          setDeck("seat");
                          togglePanel(true);
                        }}
                        meter={meter}
                        onClose={() => setDockOpen(false)}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Status line on a laptop, like a design tool's: the mouse and keys on the left, the
                  plan's totals and the zoom on the right. It replaces the hints that used to
                  crowd the bottom of the side panel. */}
              <div
                className={cn(
                  "pointer-events-auto absolute bottom-0 right-0 hidden h-8 items-center justify-between gap-4 border-t border-hairline bg-[#fbf9f5] px-3 text-[11px] text-label-2 lg:flex",
                  mode === "simple"
                    ? "left-0"
                    : dockShown
                      ? "left-[356px]"
                      : "left-14"
                )}
                data-testid="hall-status-line"
              >
                <p className="min-w-0 truncate">
                  <kbd className="font-sans font-semibold text-night">Drag</kbd>{" "}
                  a table to move ·{" "}
                  <kbd className="font-sans font-semibold text-night">Drag</kbd>{" "}
                  empty space to turn ·{" "}
                  <kbd className="font-sans font-semibold text-night">
                    Space
                  </kbd>{" "}
                  to pan ·{" "}
                  <kbd className="font-sans font-semibold text-night">
                    Shift
                  </kbd>
                  -drag to select many ·{" "}
                  <kbd className="font-sans font-semibold text-night">?</kbd>{" "}
                  for shortcuts
                </p>
                <p className="shrink-0 tabular-nums">
                  {data.tables.length}{" "}
                  {data.tables.length === 1 ? "table" : "tables"} · {seats}{" "}
                  seats · {counts.seated.people} of {counts.accepted.people}{" "}
                  seated · {cam.pct}%
                </p>
              </div>

              <div
                // Centred in the free space between the rail (or dock) and the panel, and wrapping
                // rather than running off the edge when that space is narrow.
                className={cn(
                  "pointer-events-none absolute bottom-3 right-3 flex flex-wrap items-center justify-center gap-2 lg:bottom-10",
                  leftEdge
                )}
              >
                {/* One bar for the view: zoom, fit, camera and turning. It used to be two bars that
                    stacked on a laptop and covered the toasts above them. */}
                <div
                  role="toolbar"
                  aria-label="View"
                  className={cn(
                    float,
                    "pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto p-1"
                  )}
                >
                  <div className="flex shrink-0 items-center gap-0.5">
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
                      title="Fit (F or 0)"
                    >
                      <Maximize size={16} />
                    </button>
                  </div>
                  <span
                    className="mx-1 h-6 w-px shrink-0 bg-hairline"
                    aria-hidden="true"
                  />
                  <div
                    className="flex shrink-0 items-center gap-0.5"
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
                        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-night transition-colors hover:bg-[#f1ece4] aria-checked:bg-night aria-checked:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
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
            </div>

            {/* Side bar: planning tools and the inspector */}
            <div
              ref={panel}
              inert={!panelOpen}
              aria-hidden={!panelOpen || undefined}
              className={cn(
                "absolute inset-x-0 bottom-0 flex h-[44%] min-h-0 flex-col overflow-hidden rounded-[22px] border border-hairline bg-[#fbf9f5] shadow-[0_0_0_rgba(0,0,0,0)] transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:inset-x-auto lg:bottom-0 lg:right-0 lg:top-14 lg:h-auto lg:w-[360px] lg:rounded-none lg:border-y-0 lg:border-r-0",
                !panelOpen &&
                  "pointer-events-none translate-y-[calc(100%+1rem)] scale-[0.98] opacity-0 blur-[2px] lg:translate-x-[calc(100%+1.5rem)] lg:translate-y-0"
              )}
            >
              {mode === "simple" && (
                <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-night text-[#e9c98a]">
                    <Sparkles size={16} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight text-night">
                      Simple
                    </p>
                    <p className="text-[11px] leading-tight text-label-2">
                      The hall changes as you choose
                    </p>
                  </div>
                </div>
              )}
              {mode === "studio" && showTips && (
                <div
                  data-testid="studio-tips"
                  className="border-b border-hairline bg-[#f6f1e8] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
                      Three things to know
                    </h2>
                    <button
                      type="button"
                      onClick={dismissTips}
                      className="-mr-2 -mt-2 min-h-11 rounded-full px-3 text-xs font-semibold text-night hover:bg-white focus-visible:outline-2 focus-visible:outline-burgundy"
                    >
                      Got it
                    </button>
                  </div>
                  <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-night">
                    <li>
                      <strong>Fit</strong> fills the hall with tables, or add
                      one with +.
                    </li>
                    <li>
                      <strong>Seat</strong> seats everyone who accepted in one
                      go, and you can undo it.
                    </li>
                    <li>
                      Your work saves by itself. The bar at the top says when it
                      is saved.
                    </li>
                  </ol>
                </div>
              )}
              {/* Eight tools in three groups, so every label and number has room: Design (the room
                  itself), Seat (who sits where) and Plan (what the day needs). All eight stay tabs
                  of one list, so arrow keys and links to a tool keep working. */}
              <div
                id="hall-tools"
                role="tablist"
                aria-label="Planning tools"
                hidden={mode === "simple"}
                className="flex flex-col gap-1.5 border-b border-hairline p-2"
              >
                {TOOL_GROUPS.map((g) => (
                  <div key={g.label} role="presentation">
                    <p
                      className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-ink"
                      aria-hidden="true"
                    >
                      {g.label}
                    </p>
                    <div role="presentation" className="grid grid-cols-3 gap-1">
                      {tiles
                        .filter((tile) => g.keys.includes(tile.key))
                        .map(({ key, label, icon: I, stat }) => {
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
                                "group flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                                on
                                  ? "bg-night text-white"
                                  : "text-night hover:bg-white hover:shadow-sm"
                              )}
                            >
                              <span
                                className={cn(
                                  "grid h-7 w-7 shrink-0 place-items-center rounded-full",
                                  on
                                    ? "bg-white/10 text-[#e9c98a]"
                                    : "bg-white text-burgundy shadow-sm"
                                )}
                              >
                                <I size={14} aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-[12px] font-semibold leading-tight">
                                  {label}
                                </span>
                                <span
                                  className={cn(
                                    "block text-[10px] leading-tight",
                                    on ? "text-white/80" : "text-label-2"
                                  )}
                                >
                                  {stat}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
              <div
                key={single ? `${single.type}:${single.id}` : `deck:${deck}`}
                id="hall-panel"
                role="tabpanel"
                aria-labelledby={`hall-tab-${deck}`}
                className="min-h-0 flex-1 overflow-y-auto bg-white"
              >
                {mode === "simple" && (
                  <SimpleMode
                    docked
                    layout={layout}
                    // Simple mode's edits are layout edits like any other, and undo covers them.
                    onLayoutChange={(next) => hall.update(next, positions)}
                    totalCapacity={data.stats.totalCapacity}
                    guestCount={guests}
                  />
                )}
                {mode === "studio" && selection.length > 0 && (
                  <GroupBar
                    count={selection.length}
                    group={selGroup}
                    onGroup={groupSelected}
                    onRename={renameGroup}
                    onUngroup={ungroup}
                  />
                )}
                {mode === "simple" ? null : selTable ? (
                  <>
                    {(() => {
                      // The space around this table, measured from the plan, so a squeezed aisle
                      // shows up while the table is still being placed.
                      const c = clearanceOf(
                        fpOf(selTable),
                        data.tables
                          .filter((o) => o.id !== selTable.id)
                          .map((o) => ({ name: o.name, f: fpOf(o) })),
                        layout.zones,
                        layout
                      );
                      return (
                        <div
                          data-testid="table-clearance"
                          className={cn(
                            "mx-4 mt-3 rounded-xl p-3 text-xs",
                            c.tightest < SPACING_GAP[layout.spacing] - 0.05
                              ? "bg-[#fbeeee] text-[#7a1f20]"
                              : "bg-[#f6f1e8] text-night"
                          )}
                        >
                          <p className="font-semibold">
                            {c.tightest < SPACING_GAP[layout.spacing] - 0.05
                              ? `Tight: ${gapText(c.tightest)}, less than the ${SPACING_GAP[layout.spacing]} m this plan keeps between tables`
                              : "Space around this table"}
                          </p>
                          <ul className="mt-1 space-y-0.5">
                            {c.table && (
                              <li>
                                {gapText(c.table.gap)} to {c.table.name}
                              </li>
                            )}
                            <li>{gapText(c.wall)} to the nearest wall</li>
                            {c.zone && (
                              <li>
                                {gapText(c.zone.gap)} to {c.zone.label}
                              </li>
                            )}
                          </ul>
                        </div>
                      );
                    })()}
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
                  </>
                ) : selZone ? (
                  <ZoneInspector
                    zone={selZone}
                    layout={layout}
                    onClose={() => setSelection([])}
                    onChange={(p) => patchZone(selZone.id, p)}
                    onRotate={rotateBy}
                    onDuplicate={duplicate}
                    onDelete={remove}
                    stageItems={layout.stageItems.filter(
                      (s) => s.stageId === selZone.id
                    )}
                    onStageItem={(id, patch) =>
                      updateLayout((l) => ({
                        ...l,
                        stageItems: l.stageItems.map((s) =>
                          s.id === id ? { ...s, ...patch } : s
                        ),
                      }))
                    }
                    onRemoveStageItem={(id) =>
                      updateLayout((l) => ({
                        ...l,
                        stageItems: l.stageItems.filter((s) => s.id !== id),
                      }))
                    }
                    onAddStageItem={(kind) => addStageItem(kind, selZone.id)}
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
                    onOpenFit={() => setDeck("fit")}
                  />
                ) : deck === "room" ? (
                  <>
                    <RoomPanel
                      layout={layout}
                      onChange={(patch) =>
                        updateLayout((l) => ({ ...l, ...patch }))
                      }
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
                    <LayoutSummary
                      layout={layout}
                      tables={scene.tables}
                      onFocus={(id) => {
                        setSelection([{ type: "table", id }]);
                        view3d.current?.focus(`table:${id}`);
                      }}
                    />
                  </>
                ) : deck === "fit" ? (
                  <>
                    {studioStatus === "ready" && (
                      <Section title="Three ways to lay out the hall">
                        <button
                          type="button"
                          onClick={suggestLayouts}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#9e2a2b] px-4 text-xs font-semibold text-white hover:bg-[#82211f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                        >
                          <Sparkles size={15} /> Suggest three layouts
                        </button>
                        <p className="mt-2 text-[11px] text-label-2">
                          Ranked by seats, sightlines, circulation and service.
                          Each option explains its trade-off.
                        </p>
                      </Section>
                    )}
                    {suggestions && (
                      <SuggestedLayouts
                        options={suggestions}
                        tables={data.tables.map((t) => ({
                          id: t.id,
                          shape: t.shape,
                          capacity: t.capacity,
                          occupied: t.occupiedSeats,
                        }))}
                        onChoose={chooseSuggestion}
                        onClose={() => setSuggestions(null)}
                      />
                    )}
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
                      onRemove={(n) => void removeTables(n)}
                      onFixCrowding={() => void fixCrowding()}
                      onAutoLayout={autoLayout}
                    />
                  </>
                ) : deck === "seat" ? (
                  <>
                    <SeatPanel
                      plan={seatPlan.plan}
                      units={seatPlan.units}
                      readiness={counts.seatedPct}
                      busy={busy}
                      onSeat={seatEveryone}
                    />
                    <SeatRulesPanel
                      rules={layout.seatRules}
                      guests={ruleGuests}
                      breaks={breaks}
                      onAdd={addRule}
                      onRemove={removeRule}
                    />
                  </>
                ) : deck === "thermal" ? (
                  <ThermalPanel
                    report={thermal}
                    status={studioStatus}
                    cooling={layout.venue.cooling}
                    onCooling={patchCooling}
                    placing={placingUnit}
                    onTogglePlacing={() => setPlacingUnit((p) => !p)}
                    onAddUnit={addUnitAtCentre}
                    onDeleteUnit={deleteUnit}
                    onUpdateUnit={updateUnit}
                    onFocusArea={(id) => {
                      setSelection([{ type: "zone", id }]);
                      view3d.current?.focus(`zone:${id}`);
                    }}
                    heat={heat}
                    onToggleHeat={() => setHeat((h) => !h)}
                  />
                ) : deck === "catering" ? (
                  <CateringPanel
                    report={catering}
                    status={studioStatus}
                    plan={cateringPlan}
                    guests={guests}
                    onPlan={patchCatering}
                    onExport={exportCatering}
                    exporting={exporting}
                  />
                ) : deck === "history" ? (
                  <HistoryPanel entries={historyEntries} />
                ) : deck === "risk" ? (
                  <RiskPanel
                    report={risk}
                    status={studioStatus}
                    eventDate={eventDate}
                    eventId={eventId}
                    addedRiskIds={addedRiskIds}
                  />
                ) : (
                  <DecorPanel
                    layout={layout}
                    onDecor={(decor) => updateLayout((l) => ({ ...l, decor }))}
                    onLayout={(patch) =>
                      updateLayout((l) => ({ ...l, ...patch }))
                    }
                    styledCount={Object.keys(layout.tableStyles).length}
                    onResetTables={() =>
                      updateLayout((l) => ({ ...l, tableStyles: {} }))
                    }
                  />
                )}
              </div>
            </div>
          </div>
        </>
      }
    </section>
  );
}

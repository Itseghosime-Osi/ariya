"use client";

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDroppable } from "@dnd-kit/core";
import { Maximize, Minus, Plus } from "lucide-react";
import type { TableWithGuests } from "../types";
import {
  ZONE_DEFAULTS,
  chairPositions,
  clamp,
  footprint,
  formatFeet,
  round2,
  tableSizeLabel,
  tableTop,
  type ChairStyle,
  type Decor,
  type HallLayout,
  type Zone,
} from "./model";
import type { FitPlacement } from "./fit";

export type Selection = { type: "table" | "zone"; id: string } | null;
export type Warning = "overlap" | "tight" | "wall";
type Positions = Record<string, { x: number; y: number }>;

interface HallPlanProps {
  layout: HallLayout;
  tables: TableWithGuests[];
  positions: Positions;
  selected: Selection;
  warnings: Record<string, Warning>;
  ghosts?: {
    placements: FitPlacement[];
    shape: string;
    capacity: number;
  } | null;
  readOnly?: boolean;
  onSelect: (sel: Selection) => void;
  onMoveTable: (id: string, x: number, y: number) => void;
  onZoneChange: (id: string, patch: Partial<Zone>) => void;
  onKeyCommand: (
    cmd: "rotate" | "rotate-back" | "delete" | "duplicate" | "undo" | "redo"
  ) => void;
  onNudge: (dx: number, dy: number) => void;
}

const CHAIR_FILL: Record<ChairStyle, string> = {
  gold: "#c9a465",
  white: "#efe9df",
  black: "#2b2326",
  clear: "#d9d4cc",
};

const SNAP = 0.1;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

interface DragState {
  kind: "table" | "zone" | "resize" | "pan";
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  origin: { x: number; y: number; w?: number; h?: number };
  screenX: number;
  screenY: number;
  moved: boolean;
}

/**
 * The hall from above, to scale: drag tables and zones, pinch or scroll to zoom, drag the floor to
 * pan, and drop guests from the list straight onto a table. Every table is also a focusable button
 * that moves with the arrow keys, so nothing here needs a mouse.
 */
export function HallPlan({
  layout,
  tables,
  positions,
  selected,
  warnings,
  ghosts,
  readOnly,
  onSelect,
  onMoveTable,
  onZoneChange,
  onKeyCommand,
  onNudge,
}: HallPlanProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pad = 2.2;
  const fitView = useCallback(
    () => ({
      x: -pad,
      y: -pad,
      w: layout.width + pad * 2,
      h: layout.length + pad * 2,
    }),
    [layout.width, layout.length]
  );
  const [view, setView] = useState(fitView);
  const drag = useRef<DragState | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; view: typeof view } | null>(null);
  const [live, setLive] = useState<{
    id: string;
    x: number;
    y: number;
    w?: number;
    h?: number;
  } | null>(null);

  // Re-fit when the hall is resized.
  useEffect(() => setView(fitView()), [fitView]);

  const toWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const zoomBy = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      setView((v) => {
        const w = clamp(v.w * factor, 4, 200);
        const h = (v.h / v.w) * w;
        const cx = at ? at.x : v.x + v.w / 2;
        const cy = at ? at.y : v.y + v.h / 2;
        const rx = (cx - v.x) / v.w;
        const ry = (cy - v.y) / v.h;
        return { x: cx - rx * w, y: cy - ry * h, w, h };
      });
    },
    []
  );

  // Wheel zoom needs a non-passive listener so the page does not scroll underneath.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const at = toWorld(e.clientX, e.clientY);
      zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12, at);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const startDrag = (
    e: React.PointerEvent,
    kind: DragState["kind"],
    id: string,
    origin: DragState["origin"]
  ) => {
    const w = toWorld(e.clientX, e.clientY);
    drag.current = {
      kind,
      id,
      pointerId: e.pointerId,
      startX: w.x,
      startY: w.y,
      origin,
      screenX: e.clientX,
      screenY: e.clientY,
      moved: false,
    };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), view };
      drag.current = null;
      setLive(null);
      return;
    }
    if (!drag.current) {
      startDrag(e, "pan", "", { x: view.x, y: view.y });
      onSelect(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const v = pinch.current.view;
      const w = clamp((v.w * pinch.current.dist) / Math.max(dist, 1), 4, 200);
      const h = (v.h / v.w) * w;
      setView({ x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h });
      return;
    }
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (
      !d.moved &&
      Math.hypot(e.clientX - d.screenX, e.clientY - d.screenY) < 3
    )
      return;
    d.moved = true;
    if (d.kind === "pan") {
      const svg = svgRef.current;
      if (!svg) return;
      const scale = view.w / svg.clientWidth;
      setView((v) => ({
        ...v,
        x: d.origin.x - (e.clientX - d.screenX) * scale,
        y: d.origin.y - (e.clientY - d.screenY) * scale,
      }));
      return;
    }
    const w = toWorld(e.clientX, e.clientY);
    const dx = w.x - d.startX;
    const dy = w.y - d.startY;
    if (d.kind === "resize") {
      setLive({
        id: d.id,
        x: d.origin.x,
        y: d.origin.y,
        w: Math.max(0.6, (d.origin.w ?? 1) + dx * 2),
        h: Math.max(0.6, (d.origin.h ?? 1) + dy * 2),
      });
      return;
    }
    setLive({
      id: d.id,
      x: d.origin.x + dx,
      y: d.origin.y + dy,
      w: d.origin.w,
      h: d.origin.h,
    });
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (live && d.moved && !readOnly) {
      if (d.kind === "table") {
        onMoveTable(
          d.id,
          round2(snap(clamp(live.x, 0, layout.width))),
          round2(snap(clamp(live.y, 0, layout.length)))
        );
      } else if (d.kind === "zone") {
        onZoneChange(d.id, {
          x: round2(snap(live.x)),
          y: round2(snap(live.y)),
        });
      } else if (d.kind === "resize") {
        onZoneChange(d.id, {
          w: round2(snap(live.w ?? 1)),
          h: round2(snap(live.h ?? 1)),
        });
      }
    }
    setLive(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.5 : SNAP;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      onKeyCommand(e.shiftKey ? "redo" : "undo");
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      onKeyCommand("redo");
      return;
    }
    if (e.key === "+" || e.key === "=") return zoomBy(1 / 1.2);
    if (e.key === "-") return zoomBy(1.2);
    if (e.key === "0") return setView(fitView());
    if (!selected || readOnly) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      onNudge(...moves[e.key]);
    } else if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      onKeyCommand(e.shiftKey ? "rotate-back" : "rotate");
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onKeyCommand("delete");
    } else if (e.key === "d" || e.key === "D") {
      e.preventDefault();
      onKeyCommand("duplicate");
    } else if (e.key === "Escape") {
      onSelect(null);
    }
  };

  const decor = layout.decor;
  const textOnLinen = luminance(decor.linen) > 0.35 ? "#2a1b16" : "#f6efe3";
  const viewBox = `${round2(view.x)} ${round2(view.y)} ${round2(view.w)} ${round2(view.h)}`;

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-roledescription="floor plan"
        aria-label={`Hall floor plan, ${layout.width} by ${layout.length} metres, ${tables.length} tables. Select a table, then use the arrow keys to move it, R to rotate, D to duplicate.`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="block h-full w-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#e9c98a]"
        data-testid="hall-plan"
      >
        <defs>
          <pattern
            id="hall-grid-1"
            width="1"
            height="1"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M1 0H0V1"
              fill="none"
              stroke="#e9c98a"
              strokeOpacity="0.07"
              strokeWidth="0.02"
            />
          </pattern>
          <pattern
            id="hall-grid-5"
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
          >
            <rect width="5" height="5" fill="url(#hall-grid-1)" />
            <path
              d="M5 0H0V5"
              fill="none"
              stroke="#e9c98a"
              strokeOpacity="0.16"
              strokeWidth="0.03"
            />
          </pattern>
          <radialGradient id="hall-floor" cx="50%" cy="40%" r="75%">
            <stop offset="0" stopColor="#2b1219" />
            <stop offset="1" stopColor="#150709" />
          </radialGradient>
        </defs>

        <rect
          x={view.x - 50}
          y={view.y - 50}
          width={view.w + 100}
          height={view.h + 100}
          fill="#0d0406"
        />
        <rect
          x={0}
          y={0}
          width={layout.width}
          height={layout.length}
          fill="url(#hall-floor)"
        />
        <rect
          x={0}
          y={0}
          width={layout.width}
          height={layout.length}
          fill="url(#hall-grid-5)"
        />
        <rect
          x={0}
          y={0}
          width={layout.width}
          height={layout.length}
          fill="none"
          stroke="#e9c98a"
          strokeOpacity="0.75"
          strokeWidth="0.14"
        />
        <text
          x={layout.width / 2}
          y={-0.7}
          textAnchor="middle"
          fontSize="0.55"
          fill="#e9c98a"
          fontWeight="600"
          letterSpacing="0.04"
        >
          {layout.width} m · {formatFeet(layout.width)}
        </text>
        <text
          x={-0.7}
          y={layout.length / 2}
          textAnchor="middle"
          fontSize="0.55"
          fill="#e9c98a"
          fontWeight="600"
          transform={`rotate(-90 ${-0.7} ${layout.length / 2})`}
        >
          {layout.length} m · {formatFeet(layout.length)}
        </text>

        {layout.zones.map((z) => {
          const l = live && live.id === z.id ? { ...z, ...live } : z;
          const isSel = selected?.type === "zone" && selected.id === z.id;
          const fill = ZONE_DEFAULTS[z.kind]?.fill ?? "#3a2a2a";
          const fs = clamp(Math.min(l.h * 0.28, l.w * 0.12), 0.22, 0.55);
          return (
            <g
              key={z.id}
              role="button"
              tabIndex={0}
              aria-label={`${z.label}, ${round2(l.w)} by ${round2(l.h)} metres`}
              aria-pressed={isSel}
              onFocus={() => onSelect({ type: "zone", id: z.id })}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect({ type: "zone", id: z.id });
                if (!readOnly)
                  startDrag(e, "zone", z.id, {
                    x: z.x,
                    y: z.y,
                    w: z.w,
                    h: z.h,
                  });
              }}
              className="cursor-move outline-none"
            >
              <rect
                x={l.x - l.w / 2}
                y={l.y - l.h / 2}
                width={l.w}
                height={l.h}
                rx={z.kind === "pillar" ? l.w / 2 : 0.25}
                fill={fill}
                fillOpacity={z.kind === "dance" ? 0.55 : 0.85}
                stroke={isSel ? "#f6dca8" : "#e9c98a"}
                strokeOpacity={isSel ? 1 : 0.35}
                strokeWidth={isSel ? 0.1 : 0.05}
                strokeDasharray={z.kind === "dance" ? "0.3 0.18" : undefined}
              />
              {z.kind !== "pillar" && (
                <text
                  x={l.x}
                  y={l.y + fs * 0.35}
                  textAnchor="middle"
                  fontSize={fs}
                  fill="#f6efe3"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {z.label}
                </text>
              )}
              {isSel && !readOnly && (
                <circle
                  cx={l.x + l.w / 2}
                  cy={l.y + l.h / 2}
                  r={0.3}
                  fill="#e9c98a"
                  stroke="#1c070d"
                  strokeWidth={0.06}
                  className="cursor-nwse-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    startDrag(e, "resize", z.id, {
                      x: z.x,
                      y: z.y,
                      w: z.w,
                      h: z.h,
                    });
                  }}
                />
              )}
            </g>
          );
        })}

        {ghosts?.placements.map((p, i) => {
          const top = tableTop(ghosts.shape, ghosts.capacity);
          return top.kind === "circle" ? (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={top.w / 2 + 0.45}
              fill="#e9c98a"
              fillOpacity="0.06"
              stroke="#e9c98a"
              strokeOpacity="0.6"
              strokeWidth="0.05"
              strokeDasharray="0.2 0.14"
              pointerEvents="none"
            />
          ) : (
            <rect
              key={i}
              x={p.x - top.w / 2 - 0.15}
              y={p.y - top.h / 2 - 0.45}
              width={top.w + 0.3}
              height={top.h + 0.9}
              transform={`rotate(${p.rot} ${p.x} ${p.y})`}
              fill="#e9c98a"
              fillOpacity="0.06"
              stroke="#e9c98a"
              strokeOpacity="0.6"
              strokeWidth="0.05"
              strokeDasharray="0.2 0.14"
              pointerEvents="none"
            />
          );
        })}

        {tables.map((t) => {
          const base = positions[t.id] ?? { x: 0, y: 0 };
          const pos =
            live && live.id === t.id ? { x: live.x, y: live.y } : base;
          return (
            <TableGlyph
              key={t.id}
              table={t}
              x={round2(pos.x)}
              y={round2(pos.y)}
              rot={layout.rotations[t.id] ?? 0}
              decor={decor}
              textColour={textOnLinen}
              selected={selected?.type === "table" && selected.id === t.id}
              warning={warnings[t.id]}
              onFocusSelect={() => onSelect({ type: "table", id: t.id })}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect({ type: "table", id: t.id });
                if (!readOnly) startDrag(e, "table", t.id, base);
              }}
            />
          );
        })}
      </svg>

      <div className="pointer-events-none absolute bottom-3 right-3 flex flex-col gap-1.5">
        {[
          { label: "Zoom in", icon: Plus, run: () => zoomBy(1 / 1.25) },
          { label: "Zoom out", icon: Minus, run: () => zoomBy(1.25) },
          {
            label: "Fit the hall",
            icon: Maximize,
            run: () => setView(fitView()),
          },
        ].map(({ label, icon: I, run }) => (
          <button
            key={label}
            type="button"
            onClick={run}
            aria-label={label}
            title={label}
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full border border-[#e9c98a]/40 bg-[#1c070d]/85 text-[#f6dca8] backdrop-blur transition-colors hover:border-[#e9c98a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]"
          >
            <I size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

interface TableGlyphProps {
  table: TableWithGuests;
  x: number;
  y: number;
  rot: number;
  decor: Decor;
  textColour: string;
  selected: boolean;
  warning?: Warning;
  onFocusSelect: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
}

const TableGlyph = memo(function TableGlyph({
  table,
  x,
  y,
  rot,
  decor,
  textColour,
  selected,
  warning,
  onFocusSelect,
  onPointerDown,
}: TableGlyphProps) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  const top = useMemo(
    () => tableTop(table.shape, table.capacity),
    [table.shape, table.capacity]
  );
  const chairs = useMemo(
    () => chairPositions(table.shape, table.capacity),
    [table.shape, table.capacity]
  );
  const fp = footprint(table.shape, table.capacity, 0, 0, 0);
  const occupied = Math.min(table.occupiedSeats, table.capacity);
  const full = table.occupiedSeats >= table.capacity;
  const over = table.occupiedSeats > table.capacity;
  const chairFill = CHAIR_FILL[decor.chair];
  const label = `${table.name} ${table.occupiedSeats}/${table.capacity}${full ? " ✓" : ""}, ${tableSizeLabel(table.shape, table.capacity)}, ${table.occupiedSeats} of ${table.capacity} seats taken`;
  const nameSize = clamp(
    top.kind === "circle" ? top.w * 0.2 : top.h * 0.42,
    0.24,
    0.36
  );

  return (
    <g
      ref={setNodeRef as unknown as React.Ref<SVGGElement>}
      transform={`translate(${x} ${y}) rotate(${rot})`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onFocus={onFocusSelect}
      onPointerDown={onPointerDown}
      className="cursor-grab outline-none active:cursor-grabbing"
      data-testid={`hall-table-${table.id}`}
    >
      {(selected || isOver || warning) &&
        (fp.kind === "circle" ? (
          <circle
            r={fp.r + 0.12}
            fill={isOver ? "#e9c98a" : "none"}
            fillOpacity={isOver ? 0.12 : 0}
            stroke={
              warning === "overlap"
                ? "#ff5a6e"
                : warning
                  ? "#f2b45c"
                  : "#f6dca8"
            }
            strokeWidth={0.07}
            strokeDasharray={warning && !selected ? "0.2 0.12" : undefined}
          />
        ) : (
          <rect
            x={-fp.hw - 0.12}
            y={-fp.hh - 0.12}
            width={fp.hw * 2 + 0.24}
            height={fp.hh * 2 + 0.24}
            rx={0.2}
            fill={isOver ? "#e9c98a" : "none"}
            fillOpacity={isOver ? 0.12 : 0}
            stroke={
              warning === "overlap"
                ? "#ff5a6e"
                : warning
                  ? "#f2b45c"
                  : "#f6dca8"
            }
            strokeWidth={0.07}
            strokeDasharray={warning && !selected ? "0.2 0.12" : undefined}
          />
        ))}
      {chairs.map((c, i) => {
        const taken = i < occupied;
        return (
          <g
            key={i}
            transform={`translate(${round2(c.x)} ${round2(c.y)}) rotate(${round2(c.a)})`}
          >
            <rect
              x={-0.2}
              y={-0.19}
              width={0.4}
              height={0.38}
              rx={0.08}
              fill={taken ? chairFill : "none"}
              fillOpacity={decor.chair === "clear" ? 0.55 : 1}
              stroke={taken ? decor.sash : chairFill}
              strokeOpacity={taken ? 0.9 : 0.55}
              strokeWidth={taken ? 0.05 : 0.035}
            />
            {taken && (
              <rect
                x={-0.2}
                y={0.1}
                width={0.4}
                height={0.07}
                fill={decor.sash}
              />
            )}
          </g>
        );
      })}
      {top.kind === "circle" ? (
        <circle
          r={top.w / 2}
          fill={decor.linen}
          stroke="#e9c98a"
          strokeOpacity="0.55"
          strokeWidth={0.04}
        />
      ) : top.kind === "ellipse" ? (
        <ellipse
          rx={top.w / 2}
          ry={top.h / 2}
          fill={decor.linen}
          stroke="#e9c98a"
          strokeOpacity="0.55"
          strokeWidth={0.04}
        />
      ) : (
        <rect
          x={-top.w / 2}
          y={-top.h / 2}
          width={top.w}
          height={top.h}
          rx={0.06}
          fill={decor.linen}
          stroke="#e9c98a"
          strokeOpacity="0.55"
          strokeWidth={0.04}
        />
      )}
      <g transform={`rotate(${-rot})`} pointerEvents="none">
        <text
          y={top.kind === "circle" ? -0.02 : 0.02}
          textAnchor="middle"
          fontSize={nameSize}
          fill={textColour}
          fontWeight="700"
        >
          {table.name}
        </text>
        {/* Keeps the name and the count apart in the accessible text ("Table 01 6/10"). */}{" "}
        <text
          y={nameSize + 0.08}
          textAnchor="middle"
          fontSize={nameSize * 0.85}
          fill={over ? "#ff8a98" : textColour}
          fillOpacity={0.85}
          fontWeight="600"
        >
          {table.occupiedSeats}/{table.capacity}
          {full ? " ✓" : ""}
        </text>
      </g>
    </g>
  );
});

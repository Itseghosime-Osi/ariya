"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { InvitationCard } from "../InvitationCard";
import {
  designDimensionsPx,
  designRatio,
  isEditable,
  type Handle,
} from "../../layer-ops";
import { resizeBoxFast, snapRotationFast } from "../../engine";
import type { InvitationDesign, InvitationLayer } from "../../types";
import { calculateSnaps, type GuideLine } from "./snapGuides";
import type { StudioTool } from "./ContextualOptionsBar";

import { cursorForHandle, resizeInLocalAxes } from "./resize-transform";
import { drawBox } from "./draw-box";
import { transformSelection } from "./selection-transform";
import { radiusDragDelta } from "./corner-radius";

const PAD = 28;

type Patch = Partial<InvitationLayer>;

interface Gesture {
  type: "move" | "resize" | "rotate" | "pan" | "crop" | "selection-resize";
  id: string;
  ids?: string[];
  handle?: Handle;
  startX: number;
  startY: number;
  card: DOMRect;
  origin: { x: number; y: number; width: number; height: number };
  origins?: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >;
  centre?: { x: number; y: number };
  moved: boolean;
  snapshot: InvitationDesign;
}

interface Measured {
  left: number;
  top: number;
  width: number;
  height: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Layers that carry their own height; the others grow with their words or stay square. */
function hasBox(layer: InvitationLayer) {
  return layer.kind === "shape" || layer.kind === "image";
}

const HANDLES: Record<Handle, string> = {
  nw: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  n: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  ne: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  e: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  se: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  s: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  sw: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  w: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
};

function ViewportHorizontalRuler({
  stageWidth,
  cardLeft,
  cardWidth,
  designWidth,
  cursorX,
  dark,
  onStartGuide,
}: {
  stageWidth: number;
  cardLeft: number;
  cardWidth: number;
  designWidth: number;
  cursorX: number | null;
  dark?: boolean;
  onStartGuide?: (e: React.PointerEvent) => void;
}) {
  const scale = cardWidth / designWidth;
  if (!scale || scale <= 0) return null;

  const minDesignX = Math.floor(-cardLeft / scale / 100) * 100 - 100;
  const maxDesignX =
    Math.ceil((stageWidth - cardLeft) / scale / 100) * 100 + 100;

  const step =
    [10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(
      (n) => n * scale >= 45
    ) ?? 10000;
  const minor = step / 10;
  const ticks = [];

  for (let x = minDesignX; x <= maxDesignX; x += minor) {
    const screenX = cardLeft + x * scale;
    if (screenX < -20 || screenX > stageWidth + 20) continue;
    const isMajor = x % step === 0;
    const isHalf = x % (step / 2) === 0 && !isMajor;
    const isOrigin = x === 0 || x === designWidth;

    ticks.push(
      <line
        key={`vh-${x}`}
        x1={screenX}
        y1={isOrigin ? 4 : isMajor ? 8 : isHalf ? 14 : 18}
        x2={screenX}
        y2={24}
        stroke={isOrigin ? "#dfba73" : "currentColor"}
        strokeWidth={isOrigin ? 1.5 : isMajor ? 1.2 : 0.8}
        opacity={isOrigin ? 1 : isMajor ? 0.7 : isHalf ? 0.4 : 0.25}
      />
    );

    if (isMajor && screenX + 30 <= stageWidth) {
      ticks.push(
        <text
          key={`vht-${x}`}
          x={screenX + 3}
          y={11}
          fontSize="9"
          fontFamily="monospace"
          fill={isOrigin ? "#dfba73" : "currentColor"}
          opacity={isOrigin ? 1 : 0.8}
        >
          {x}
        </text>
      );
    }
  }

  const paperStart = Math.max(0, cardLeft);
  const paperEnd = Math.min(stageWidth, cardLeft + cardWidth);

  return (
    <div
      title="Click and drag down to pull out a horizontal guide line"
      onPointerDown={onStartGuide}
      className={cn(
        "pointer-events-auto cursor-row-resize absolute left-7 right-0 top-0 h-6 select-none overflow-hidden border-b z-(--studio-z-panel) transition-colors",
        dark
          ? "border-[#2f1f27] bg-[#1a1217] text-zinc-400 hover:text-white"
          : "border-[#ded6c9] bg-[#e6dfd3] text-[#6d545e] hover:text-[var(--studio-wine)]"
      )}
    >
      {paperEnd > paperStart && (
        <div
          className="absolute inset-y-0 bg-[var(--studio-gold)]/[0.08] border-x border-[var(--studio-gold)]/40"
          style={{
            left: cardLeft,
            width: cardWidth,
          }}
        />
      )}
      <svg
        width="100%"
        height="100%"
        className="overflow-visible pointer-events-none"
      >
        {ticks}
        {cursorX != null && (
          <line
            x1={cardLeft + cursorX * scale}
            y1={0}
            x2={cardLeft + cursorX * scale}
            y2={24}
            stroke="#dfba73"
            strokeWidth={2}
          />
        )}
      </svg>
    </div>
  );
}

function ViewportVerticalRuler({
  stageHeight,
  cardTop,
  cardHeight,
  designHeight,
  cursorY,
  dark,
  onStartGuide,
}: {
  stageHeight: number;
  cardTop: number;
  cardHeight: number;
  designHeight: number;
  cursorY: number | null;
  dark?: boolean;
  onStartGuide?: (e: React.PointerEvent) => void;
}) {
  const scale = cardHeight / designHeight;
  if (!scale || scale <= 0) return null;

  const minDesignY = Math.floor(-cardTop / scale / 100) * 100 - 100;
  const maxDesignY =
    Math.ceil((stageHeight - cardTop) / scale / 100) * 100 + 100;

  const step =
    [10, 20, 50, 100, 200, 500, 1000, 2000, 5000].find(
      (n) => n * scale >= 45
    ) ?? 10000;
  const minor = step / 10;
  const ticks = [];

  for (let y = minDesignY; y <= maxDesignY; y += minor) {
    const screenY = cardTop + y * scale;
    if (screenY < -20 || screenY > stageHeight + 20) continue;
    const isMajor = y % step === 0;
    const isHalf = y % (step / 2) === 0 && !isMajor;
    const isOrigin = y === 0 || y === designHeight;

    ticks.push(
      <line
        key={`vv-${y}`}
        x1={isOrigin ? 4 : isMajor ? 10 : isHalf ? 16 : 20}
        y1={screenY}
        x2={26}
        y2={screenY}
        stroke={isOrigin ? "#dfba73" : "currentColor"}
        strokeWidth={isOrigin ? 1.5 : isMajor ? 1.2 : 0.8}
        opacity={isOrigin ? 1 : isMajor ? 0.7 : isHalf ? 0.4 : 0.25}
      />
    );

    if (isMajor && screenY + 15 <= stageHeight) {
      ticks.push(
        <text
          key={`vvt-${y}`}
          x={2}
          y={screenY + 9}
          fontSize="8"
          fontFamily="monospace"
          fill={isOrigin ? "#dfba73" : "currentColor"}
          opacity={isOrigin ? 1 : 0.8}
        >
          {y}
        </text>
      );
    }
  }

  return (
    <div
      title="Click and drag right to pull out a vertical guide line"
      onPointerDown={onStartGuide}
      className={cn(
        "pointer-events-auto cursor-col-resize absolute left-0 top-6 bottom-0 w-7 select-none overflow-hidden border-r z-(--studio-z-panel) transition-colors",
        dark
          ? "border-[#2f1f27] bg-[#1a1217] text-zinc-400 hover:text-white"
          : "border-[#ded6c9] bg-[#e6dfd3] text-[#6d545e] hover:text-[var(--studio-wine)]"
      )}
    >
      <div
        className="absolute inset-x-0 bg-[var(--studio-gold)]/[0.08] border-y border-[var(--studio-gold)]/40"
        style={{
          top: cardTop,
          height: cardHeight,
        }}
      />
      <svg
        width="100%"
        height="100%"
        className="overflow-visible pointer-events-none"
      >
        {ticks}
        {cursorY != null && (
          <line
            x1={0}
            y1={cardTop + cursorY * scale}
            x2={26}
            y2={cardTop + cursorY * scale}
            stroke="#dfba73"
            strokeWidth={2}
          />
        )}
      </svg>
    </div>
  );
}

const TEXT_KINDS = new Set([
  "title",
  "subtitle",
  "names",
  "message",
  "kicker",
  "host",
  "date",
  "venue",
  "dressCode",
  "footer",
  "text",
]);

export function DesignerCanvas({
  design,
  coupleName,
  selectedId,
  selectedIds,
  zoom,
  fitRequest = 0,
  onViewportChange,
  navigationTarget,
  onZoomChange,
  showHandles,
  activeTool,
  dark = false,
  showRulers = true,
  showGrid = false,
  showPrintGuides = false,
  snapToGrid = false,
  guidesLocked = false,
  clearGuidesRequest = 0,
  onSelect,
  onToggleSelect,
  onSelectBatch,
  onUpdate,
  onBatchUpdate,
  onRecord,
  onRestoreSnapshot,
  onDropImageFile,
  onEditText,
  onResizeCanvasPx,
  onAddLayerAt,
  onAddLayerWithGeometry,
  activeShapeKind = "rect",
}: {
  design: InvitationDesign;
  coupleName: string;
  selectedId: string | null;
  selectedIds?: string[];
  /** Scale relative to document pixels: 1 is actual size. */
  fitRequest?: number;
  onViewportChange?: (view: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  navigationTarget?: { x: number; y: number } | null;
  zoom: number;
  onZoomChange?: (zoom: number | ((prev: number) => number)) => void;
  /** Pro mode draws the resize and rotate handles; Simple mode just outlines the layer. */
  showHandles: boolean;
  activeTool?: StudioTool;
  dark?: boolean;
  showRulers?: boolean;
  showGrid?: boolean;
  /** Dashed safe-area (0.25 in) and bleed (0.125 in) guides for a 5-inch-wide card. */
  showPrintGuides?: boolean;
  snapToGrid?: boolean;
  guidesLocked?: boolean;
  clearGuidesRequest?: number;
  onSelect: (id: string | null) => void;
  onToggleSelect?: (id: string) => void;
  onSelectBatch?: (ids: string[]) => void;
  onUpdate: (id: string, patch: Patch, options?: { commit?: boolean }) => void;
  onBatchUpdate?: (
    patches: Record<string, Patch>,
    options?: { commit?: boolean }
  ) => void;
  onRecord: (snapshot: InvitationDesign) => void;
  onRestoreSnapshot?: (snapshot: InvitationDesign) => void;
  onDropImageFile?: (file: File) => void;
  onEditText?: (id: string) => void;
  onResizeCanvasPx?: (widthPx: number, heightPx: number) => void;
  onAddLayerAt?: (kind: "text" | "rect" | "line", x: number, y: number) => void;
  onAddLayerWithGeometry?: (
    kind: "text" | "rect" | "ellipse" | "arch" | "line" | "star",
    geom: { x: number; y: number; width: number; height?: number }
  ) => void;
  activeShapeKind?: "rect" | "ellipse" | "arch" | "line" | "star";
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardWrap = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const props = useRef({
    onUpdate,
    snapToGrid,
    onBatchUpdate,
    onRecord,
    onRestoreSnapshot,
    design,
    onSelectBatch,
    onResizeCanvasPx,
    onAddLayerAt,
    onAddLayerWithGeometry,
  });
  props.current = {
    onUpdate,
    snapToGrid,
    onBatchUpdate,
    onRecord,
    onRestoreSnapshot,
    design,
    onSelectBatch,
    onResizeCanvasPx,
    onAddLayerAt,
    onAddLayerWithGeometry,
  };

  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [box, setBox] = useState<Measured | null>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [userGuides, setUserGuides] = useState<
    Array<{ id: string; axis: "horizontal" | "vertical"; pos: number }>
  >([]);
  const [draggingGuide, setDraggingGuide] = useState<{
    id?: string;
    axis: "horizontal" | "vertical";
    pos: number;
    isNew?: boolean;
  } | null>(null);
  useEffect(() => {
    setUserGuides([]);
  }, [clearGuidesRequest]);
  const draggingGuideRef = useRef<typeof draggingGuide>(null);
  draggingGuideRef.current = draggingGuide;
  const userGuidesRef = useRef(userGuides);
  userGuidesRef.current = userGuides;
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const editingSnapshot = useRef<InvitationDesign | null>(null);
  // A text layer just made with the Type tool opens ready to type, its placeholder selected.
  const pendingTextEdit = useRef(false);
  const finishText = (cancel = false) => {
    const snapshot = editingSnapshot.current;
    editingSnapshot.current = null;
    if (
      snapshot &&
      JSON.stringify(snapshot) !== JSON.stringify(props.current.design)
    ) {
      if (cancel) props.current.onRestoreSnapshot?.(snapshot);
      else props.current.onRecord(snapshot);
    }
    setEditingTextId(null);
  };
  const [cursorPx, setCursorPx] = useState<{ x: number; y: number } | null>(
    null
  );
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);
  const marqueeRef = useRef<typeof marquee>(null);
  const [drawingBox, setDrawingBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const drawingCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => drawingCleanup.current?.(), []);
  const [radiusTooltip, setRadiusTooltip] = useState<{
    show: boolean;
    rPx: number;
    x: number;
    y: number;
  } | null>(null);
  marqueeRef.current = marquee;

  const isPanMode = isSpaceDown || activeTool === "hand";

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        tag === "button" ||
        document.querySelector(
          '[role="dialog"]:not([hidden]), [role="menu"]:not([hidden])'
        ) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.code === "Space" && !e.repeat && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceDown(false);
      }
    };
    const onWindowBlur = () => {
      setIsSpaceDown(false);
      if (gesture.current) {
        const g = gesture.current;
        gesture.current = null;
        setActiveGuides([]);
        if (g.moved) props.current.onRestoreSnapshot?.(g.snapshot);
      }
      marqueeRef.current = null;
      setMarquee(null);
      setDraggingGuide(null);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
    };
  }, []);

  useEffect(() => {
    if (!pendingTextEdit.current || !selectedId) return;
    const created = design.layers.find((l) => l.id === selectedId);
    if (!created || !TEXT_KINDS.has(created.kind)) return;
    pendingTextEdit.current = false;
    editingSnapshot.current = props.current.design;
    setEditingTextId(created.id);
  }, [selectedId, design.layers]);

  useEffect(() => {
    if (editingTextId && selectedId !== editingTextId) {
      // Leaving the text by selecting something else still ends the edit: record it so Undo works.
      finishText();
    }
  }, [selectedId, editingTextId]);

  const dims = designDimensionsPx(design);
  const ratio = designRatio(design);
  const fit = Math.min(
    Math.max(stage.w - PAD * 2, 20),
    Math.max(stage.h - PAD * 2, 20) * ratio
  );
  const lastFit = useRef<number | null>(null);
  const lastFitRequest = useRef(fitRequest);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    if (!stage.w || !stage.h) return;
    const next = fit / dims.width;
    const requested = lastFitRequest.current !== fitRequest;
    if (
      lastFit.current === null ||
      requested ||
      Math.abs(zoomRef.current - lastFit.current) < 0.001
    ) {
      onZoomChange?.(next);
      if (requested) setPan({ x: 0, y: 0 });
    }
    lastFit.current = next;
    lastFitRequest.current = fitRequest;
  }, [fit, dims.width, fitRequest, stage.w, stage.h, onZoomChange]);
  const cardWidth = Math.round(dims.width * zoom);
  const cardHeight = Math.round(cardWidth / ratio);
  const cardLeft =
    stage.w > 0 ? Math.round((stage.w - cardWidth) / 2 + pan.x) : 0;
  const cardTop =
    stage.h > 0 ? Math.round((stage.h - cardHeight) / 2 + pan.y) : 0;
  useEffect(() => {
    if (!cardWidth || !cardHeight) return;
    onViewportChange?.({
      x: -cardLeft / cardWidth,
      y: -cardTop / cardHeight,
      width: stage.w / cardWidth,
      height: stage.h / cardHeight,
    });
  }, [
    cardLeft,
    cardTop,
    cardWidth,
    cardHeight,
    stage.w,
    stage.h,
    onViewportChange,
  ]);
  useEffect(() => {
    if (navigationTarget)
      setPan({
        x: (0.5 - navigationTarget.x) * cardWidth,
        y: (0.5 - navigationTarget.y) * cardHeight,
      });
    // A navigator click is a request; changing zoom keeps the user's current pan.
  }, [navigationTarget]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.01);
        onZoomChange?.((z) =>
          Math.min(4, Math.max(0.05, Math.round(z * factor * 100) / 100))
        );
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onZoomChange]);

  // Arrow key nudging in exact canvas pixels (supports multi-selection & bleed bounds)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        tag === "button" ||
        document.querySelector(
          '[role="dialog"]:not([hidden]), [role="menu"]:not([hidden])'
        ) ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const targets =
        selectedIds && selectedIds.length
          ? selectedIds
          : selectedId
            ? [selectedId]
            : [];
      if (!targets.length) return;
      const stepPx = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -stepPx;
      else if (e.key === "ArrowRight") dx = stepPx;
      else if (e.key === "ArrowUp") dy = -stepPx;
      else if (e.key === "ArrowDown") dy = stepPx;
      else return;

      e.preventDefault();
      const dxPct = (dx / dims.width) * 100;
      const dyPct = (dy / dims.height) * 100;
      const patches: Record<string, Patch> = {};
      for (const tid of targets) {
        const current = props.current.design.layers.find((l) => l.id === tid);
        if (!current || !isEditable(current)) continue;
        const minX = -Math.max(0, current.width - 5);
        const minY = -Math.max(0, (current.height ?? 5) - 3);
        patches[tid] = {
          x: clamp(Math.round((current.x + dxPct) * 100) / 100, minX, 95),
          y: clamp(Math.round((current.y + dyPct) * 100) / 100, minY, 97),
        };
      }
      const patchedIds = Object.keys(patches);
      if (!patchedIds.length) return;
      if (patchedIds.length === 1) {
        props.current.onUpdate(patchedIds[0], patches[patchedIds[0]], {
          commit: true,
        });
      } else if (props.current.onBatchUpdate) {
        props.current.onBatchUpdate(patches, { commit: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedIds, dims.width, dims.height]);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => setStage({ w: el.clientWidth, h: el.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected = design.layers.find((l) => l.id === selectedId) ?? null;

  // Where the selected layer sits on screen. Text has no stored height, so it is measured.
  const measure = useCallback(() => {
    const wrap = cardWrap.current;
    if (!wrap || !selectedId) return setBox(null);
    const el = wrap.querySelector<HTMLElement>(
      `[data-layer-id="${CSS.escape(selectedId)}"]`
    );
    if (!el) return setBox(null);
    if (selectedIds && selectedIds.length > 1) {
      const card = wrap
        .querySelector<HTMLElement>("[data-invitation-canvas]")
        ?.getBoundingClientRect();
      const rectangles = selectedIds.flatMap((id) => {
        const layer = wrap.querySelector<HTMLElement>(
          `[data-layer-id="${CSS.escape(id)}"]`
        );
        return layer ? [layer.getBoundingClientRect()] : [];
      });
      if (!card || !rectangles.length) return setBox(null);
      const left = Math.min(...rectangles.map((r) => r.left));
      const top = Math.min(...rectangles.map((r) => r.top));
      setBox({
        left: left - card.left,
        top: top - card.top,
        width: Math.max(...rectangles.map((r) => r.right)) - left,
        height: Math.max(...rectangles.map((r) => r.bottom)) - top,
      });
    } else
      setBox({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
  }, [selectedId, selectedIds]);

  useLayoutEffect(() => {
    measure();
    const wrap = cardWrap.current;
    if (!wrap || !selectedId) return;
    const el = wrap.querySelector<HTMLElement>(
      `[data-layer-id="${CSS.escape(selectedId)}"]`
    );
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, design, cardWidth, selectedId]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (draggingGuideRef.current) {
        const root = cardWrap.current?.querySelector<HTMLElement>(
          "[data-invitation-canvas]"
        );
        const rect = root?.getBoundingClientRect();
        if (!rect) return;
        const currentDims = designDimensionsPx(props.current.design);
        const scale = rect.width / currentDims.width;
        if (!scale) return;
        const dg = draggingGuideRef.current;
        const pos = Math.round(
          dg.axis === "horizontal"
            ? (e.clientY - rect.top) / scale
            : (e.clientX - rect.left) / scale
        );
        setDraggingGuide({ ...dg, pos });
        return;
      }

      // Live rubber-band marquee selection
      if (marqueeRef.current) {
        const m = { ...marqueeRef.current, curX: e.clientX, curY: e.clientY };
        marqueeRef.current = m;
        setMarquee(m);

        const mLeft = Math.min(m.startX, m.curX);
        const mRight = Math.max(m.startX, m.curX);
        const mTop = Math.min(m.startY, m.curY);
        const mBottom = Math.max(m.startY, m.curY);

        if (mRight - mLeft > 4 || mBottom - mTop > 4) {
          const root = cardWrap.current?.querySelector<HTMLElement>(
            "[data-invitation-canvas]"
          );
          const card = root?.getBoundingClientRect();
          if (card) {
            const hitIds: string[] = [];
            for (const l of props.current.design.layers) {
              if (!l.visible) continue;
              const lx = card.left + (l.x / 100) * card.width;
              const ly = card.top + (l.y / 100) * card.height;
              const lw = (l.width / 100) * card.width;
              const lh =
                ((l.height ?? (l.kind === "text" ? 5 : 15)) / 100) *
                card.height;
              const intersects = !(
                lx > mRight ||
                lx + lw < mLeft ||
                ly > mBottom ||
                ly + lh < mTop
              );
              if (intersects) hitIds.push(l.id);
            }
            props.current.onSelectBatch?.(hitIds);
          }
        }
        return;
      }

      const g = gesture.current;
      if (!g) return;
      const { onUpdate: update } = props.current;
      const dx = ((e.clientX - g.startX) / g.card.width) * 100;
      const dy = ((e.clientY - g.startY) / g.card.height) * 100;

      if (g.type === "rotate" && g.centre) {
        g.moved = true;
        const deg =
          (Math.atan2(e.clientY - g.centre.y, e.clientX - g.centre.x) * 180) /
            Math.PI +
          90;
        update(g.id, { rotation: snapRotationFast(deg) }, { commit: false });
        return;
      }

      if (!g.moved && Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;
      g.moved = true;

      if (g.type === "pan") {
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        g.startX = e.clientX;
        g.startY = e.clientY;
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
        return;
      }

      if (g.type === "move") {
        const minX = -Math.max(0, g.origin.width - 5);
        const minY = -Math.max(0, Math.min(g.origin.height, 98) - 3);
        const proposedBox = {
          x: clamp(g.origin.x + dx, minX, 95),
          y: clamp(g.origin.y + dy, minY, 97),
          width: g.origin.width,
          height: g.origin.height,
        };

        let targetX = proposedBox.x;
        let targetY = proposedBox.y;

        if (e.altKey) {
          // Alt temporarily suspends magnetic snapping during move
          setActiveGuides([]);
        } else if (props.current.snapToGrid) {
          const document = designDimensionsPx(props.current.design);
          targetX =
            ((Math.round(((proposedBox.x / 100) * document.width) / 100) *
              100) /
              document.width) *
            100;
          targetY =
            ((Math.round(((proposedBox.y / 100) * document.height) / 100) *
              100) /
              document.height) *
            100;
          setActiveGuides([]);
        } else {
          const otherLayers = props.current.design.layers.filter((l) =>
            g.ids ? !g.ids.includes(l.id) : l.id !== g.id
          );

          const currentDims = designDimensionsPx(props.current.design);
          const userSnapGuides = userGuidesRef.current.map((ug) => ({
            axis: ug.axis,
            posPct:
              ug.axis === "horizontal"
                ? (ug.pos / currentDims.height) * 100
                : (ug.pos / currentDims.width) * 100,
            label: `${ug.axis === "horizontal" ? "Y" : "X"}: ${ug.pos}px`,
          }));

          const snap = calculateSnaps(
            proposedBox,
            otherLayers,
            1.0,
            userSnapGuides
          );
          setActiveGuides(snap.guides);
          targetX = snap.x;
          targetY = snap.y;
        }

        const deltaX = targetX - g.origin.x;
        const deltaY = targetY - g.origin.y;

        if (g.ids && g.origins && g.ids.length > 1) {
          const batchPatches: Record<string, Partial<InvitationLayer>> = {};
          for (const mid of g.ids) {
            const orig = g.origins[mid];
            if (orig) {
              batchPatches[mid] = {
                x: clamp(orig.x + deltaX, -500, 500),
                y: clamp(orig.y + deltaY, -500, 500),
              };
            }
          }
          if (props.current.onBatchUpdate) {
            props.current.onBatchUpdate(batchPatches, { commit: false });
          } else {
            for (const mid of g.ids) {
              if (batchPatches[mid]) {
                update(mid, batchPatches[mid], { commit: false });
              }
            }
          }
        } else {
          update(
            g.id,
            {
              x: targetX,
              y: targetY,
            },
            { commit: false }
          );
        }
        return;
      }

      if (g.type === "crop" && g.handle) {
        g.moved = true;
        const currentDims = g.origin;
        const scale = currentDims.width / (g.card.width || 1);
        const deltaPxX = (e.clientX - g.startX) * scale;
        const deltaPxY = (e.clientY - g.startY) * scale;

        let nextW = currentDims.width;
        let nextH = currentDims.height;

        if (g.handle.includes("e"))
          nextW = Math.max(300, Math.min(8000, currentDims.width + deltaPxX));
        if (g.handle.includes("w"))
          nextW = Math.max(300, Math.min(8000, currentDims.width - deltaPxX));
        if (g.handle.includes("s"))
          nextH = Math.max(300, Math.min(8000, currentDims.height + deltaPxY));
        if (g.handle.includes("n"))
          nextH = Math.max(300, Math.min(8000, currentDims.height - deltaPxY));

        if (e.shiftKey && currentDims.height > 0) {
          const origRatio = currentDims.width / currentDims.height;
          if (g.handle === "e" || g.handle === "w") {
            nextH = nextW / origRatio;
          } else if (g.handle === "n" || g.handle === "s") {
            nextW = nextH * origRatio;
          } else {
            nextH = nextW / origRatio;
          }
        }

        props.current.onResizeCanvasPx?.(Math.round(nextW), Math.round(nextH));
        return;
      }

      if (g.type === "selection-resize" && g.handle && g.origins) {
        const target = resizeBoxFast(g.origin, g.handle, dx, dy, true);
        props.current.onBatchUpdate?.(
          transformSelection(g.snapshot.layers, g.origins, g.origin, target),
          { commit: false }
        );
        return;
      }

      const layer = props.current.design.layers.find((l) => l.id === g.id);
      if (!layer || !g.handle) return;
      if (hasBox(layer)) {
        const keepProportions =
          e.shiftKey ||
          (layer.aspectLocked ??
            (layer.kind === "image" || layer.kind === "seal"));
        const next = resizeInLocalAxes(
          g.origin,
          g.handle,
          e.clientX - g.startX,
          e.clientY - g.startY,
          g.card,
          layer.rotation ?? 0,
          keepProportions,
          e.altKey
        );
        update(g.id, next, { commit: false });
      } else {
        // Text, seal, rule and entry seal change width only; height follows.
        const side: Handle = g.handle.includes("w") ? "w" : "e";
        const next = resizeBoxFast(g.origin, side, dx, 0, false);
        update(g.id, { x: next.x, width: next.width }, { commit: false });
      }
    }
    function onCancelKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (gesture.current) {
        e.preventDefault();
        e.stopPropagation();
        const g = gesture.current;
        gesture.current = null;
        setActiveGuides([]);
        props.current.onRestoreSnapshot?.(g.snapshot);
      } else if (marqueeRef.current) {
        marqueeRef.current = null;
        setMarquee(null);
      } else if (draggingGuideRef.current) {
        setDraggingGuide(null);
      }
    }
    function onUp(e: PointerEvent) {
      if (draggingGuideRef.current) {
        const dg = draggingGuideRef.current;
        setDraggingGuide(null);
        // Photoshop & Photopea standard: dragging back onto the ruler discards the guide;
        // dragging anywhere onto the canvas creates/moves the guide.
        const isDroppedBackOnRuler =
          dg.axis === "horizontal" ? e.clientY <= 26 : e.clientX <= 30;

        if (isDroppedBackOnRuler) {
          if (dg.id) {
            setUserGuides((prev) => prev.filter((g) => g.id !== dg.id));
          }
        } else {
          if (dg.isNew) {
            const id = `guide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            setUserGuides((prev) => [
              ...prev,
              { id, axis: dg.axis, pos: dg.pos },
            ]);
          } else if (dg.id) {
            setUserGuides((prev) =>
              prev.map((g) => (g.id === dg.id ? { ...g, pos: dg.pos } : g))
            );
          }
        }
        return;
      }

      if (marqueeRef.current) {
        const m = marqueeRef.current;
        marqueeRef.current = null;
        setMarquee(null);
        if (
          Math.abs(m.curX - m.startX) < 4 &&
          Math.abs(m.curY - m.startY) < 4
        ) {
          props.current.onSelectBatch?.([]);
        }
        return;
      }

      const g = gesture.current;
      gesture.current = null;
      setActiveGuides([]);
      if (g?.moved) props.current.onRecord(g.snapshot);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    const onPointerCancel = () =>
      onCancelKey(new KeyboardEvent("keydown", { key: "Escape" }));
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("blur", onPointerCancel);
    window.addEventListener("keydown", onCancelKey, true);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("blur", onPointerCancel);
      window.removeEventListener("keydown", onCancelKey, true);
    };
  }, []);

  function cardRect(): DOMRect | null {
    const root = cardWrap.current?.querySelector<HTMLElement>(
      "[data-invitation-canvas]"
    );
    const rect = root?.getBoundingClientRect();
    return rect && rect.width && rect.height ? rect : null;
  }

  function heightPct(layer: InvitationLayer, card: DOMRect): number {
    if (layer.height) return layer.height;
    const element = cardWrap.current?.querySelector<HTMLElement>(
      `[data-layer-id="${CSS.escape(layer.id)}"]`
    );
    return element ? (element.offsetHeight / card.height) * 100 : 4;
  }

  function onLayerPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    layer: InvitationLayer
  ) {
    if (isPanMode || e.isPrimary === false || e.button !== 0) return;
    if (["shape", "pen", "zoom", "crop"].includes(activeTool ?? "")) return;
    if (activeTool === "text") {
      if (!TEXT_KINDS.has(layer.kind) || !isEditable(layer)) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(layer.id);
      editingSnapshot.current = props.current.design;
      setEditingTextId(layer.id);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      onToggleSelect?.(layer.id);
      return;
    }
    let currentSelected =
      selectedIds && selectedIds.length
        ? selectedIds
        : selectedId
          ? [selectedId]
          : [];
    if (layer.groupId) {
      currentSelected = [
        ...design.layers
          .filter(
            (item) => item.groupId === layer.groupId && item.id !== layer.id
          )
          .map((item) => item.id),
        layer.id,
      ];
      props.current.onSelectBatch?.(currentSelected);
    }
    const isMulti =
      currentSelected.length > 1 && currentSelected.includes(layer.id);

    if (!isMulti) {
      onSelect(layer.id);
      props.current.onSelectBatch?.([layer.id]);
    }

    if (!isEditable(layer)) return;
    const card = cardRect();
    if (!card) return;

    if (isMulti) {
      const origins: Record<
        string,
        { x: number; y: number; width: number; height: number }
      > = {};
      for (const sid of currentSelected) {
        const l = design.layers.find((item) => item.id === sid);
        if (l) {
          origins[sid] = {
            x: l.x,
            y: l.y,
            width: l.width,
            height: heightPct(l, card),
          };
        }
      }
      gesture.current = {
        type: "move",
        id: layer.id,
        ids: currentSelected,
        startX: e.clientX,
        startY: e.clientY,
        card,
        origin: origins[layer.id] ?? {
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: heightPct(layer, card),
        },
        origins,
        moved: false,
        snapshot: design,
      };
    } else {
      gesture.current = {
        type: "move",
        id: layer.id,
        startX: e.clientX,
        startY: e.clientY,
        card,
        origin: {
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: heightPct(layer, card),
        },
        moved: false,
        snapshot: design,
      };
    }
  }

  function startCropHandle(e: React.PointerEvent, handle: Handle) {
    e.preventDefault();
    e.stopPropagation();
    const card = cardRect();
    if (!card) return;
    const currentDims = designDimensionsPx(props.current.design);
    gesture.current = {
      type: "crop",
      id: "crop",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      card,
      origin: {
        x: 0,
        y: 0,
        width: currentDims.width,
        height: currentDims.height,
      },
      moved: false,
      snapshot: props.current.design,
    };
  }

  function startHandle(e: React.PointerEvent, handle: Handle | "rotate") {
    if (!selected) return;
    e.preventDefault();
    e.stopPropagation();
    const card = cardRect();
    if (!card) return;
    const r = overlayRef.current?.getBoundingClientRect();
    if (selectedIds && selectedIds.length > 1 && box && handle !== "rotate") {
      const origins = Object.fromEntries(
        design.layers
          .filter((layer) => selectedIds.includes(layer.id))
          .map((layer) => [
            layer.id,
            {
              x: layer.x,
              y: layer.y,
              width: layer.width,
              height: heightPct(layer, card),
            },
          ])
      );
      gesture.current = {
        type: "selection-resize",
        id: selected.id,
        ids: selectedIds,
        origins,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        card,
        origin: {
          x: (box.left / card.width) * 100,
          y: (box.top / card.height) * 100,
          width: (box.width / card.width) * 100,
          height: (box.height / card.height) * 100,
        },
        moved: false,
        snapshot: design,
      };
      return;
    }
    gesture.current = {
      type: handle === "rotate" ? "rotate" : "resize",
      id: selected.id,
      handle: handle === "rotate" ? undefined : handle,
      startX: e.clientX,
      startY: e.clientY,
      card,
      origin: {
        x: selected.x,
        y: selected.y,
        width: selected.width,
        height: heightPct(selected, card),
      },
      centre: r
        ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        : undefined,
      moved: false,
      snapshot: design,
    };
  }

  const radiusCleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => radiusCleanup.current?.(), []);

  const startRadiusHandle = (
    e: React.PointerEvent,
    corner: "tl" | "tr" | "br" | "bl",
    startRPx: number,
    maxRPx: number
  ) => {
    if (!selected || !isEditable(selected) || e.isPrimary === false) return;
    e.stopPropagation();
    e.preventDefault();
    const card = cardRect();
    if (!card) return;

    radiusCleanup.current?.();
    const snapshot = props.current.design;
    const startX = e.clientX;
    const startY = e.clientY;
    const hasPerCorner =
      selected.radiusTL !== undefined ||
      selected.radiusTR !== undefined ||
      selected.radiusBR !== undefined ||
      selected.radiusBL !== undefined;
    const independent = hasPerCorner || e.altKey;
    const baseUniform = selected.radius ?? 0;
    let moved = false;
    let cancelled = false;

    setRadiusTooltip({
      show: true,
      rPx: (startRPx / card.width) * dims.width,
      x: e.clientX,
      y: e.clientY,
    });

    const onPointerMove = (ev: PointerEvent) => {
      if (cancelled) return;
      const delta = radiusDragDelta(
        ev.clientX - startX,
        ev.clientY - startY,
        selected.rotation ?? 0,
        corner
      );

      if (!moved && Math.abs(delta) > 0.5) moved = true;
      const newRadiusPx = Math.max(0, Math.min(maxRPx, startRPx + delta));
      const newRadiusCqw =
        Math.round((newRadiusPx / card.width) * 100 * 10) / 10;

      if (independent) {
        const keyMap = {
          tl: "radiusTL",
          tr: "radiusTR",
          br: "radiusBR",
          bl: "radiusBL",
        } as const;
        props.current.onUpdate(
          selected.id,
          {
            radiusTL: selected.radiusTL ?? baseUniform,
            radiusTR: selected.radiusTR ?? baseUniform,
            radiusBR: selected.radiusBR ?? baseUniform,
            radiusBL: selected.radiusBL ?? baseUniform,
            [keyMap[corner]]: newRadiusCqw,
          },
          { commit: false }
        );
      } else {
        props.current.onUpdate(
          selected.id,
          {
            radius: newRadiusCqw,
            radiusTL: undefined,
            radiusTR: undefined,
            radiusBR: undefined,
            radiusBL: undefined,
          },
          { commit: false }
        );
      }
      setRadiusTooltip({
        show: true,
        rPx: (newRadiusPx / card.width) * dims.width,
        x: ev.clientX,
        y: ev.clientY,
      });
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      window.removeEventListener("keydown", onKeyCancel, true);
      setRadiusTooltip(null);
    };

    const onCancel = () => {
      cancelled = true;
      cleanup();
      props.current.onRestoreSnapshot?.(snapshot);
    };

    const onKeyCancel = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.preventDefault();
      ev.stopPropagation();
      cancelled = true;
      cleanup();
      props.current.onRestoreSnapshot?.(snapshot);
    };

    const onPointerUp = () => {
      cleanup();
      if (!cancelled && moved) {
        props.current.onRecord(snapshot);
      }
    };

    radiusCleanup.current = cleanup;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    window.addEventListener("keydown", onKeyCancel, true);
  };

  const multiple = (selectedIds?.length ?? 0) > 1;
  const handles: Handle[] = selected
    ? multiple || hasBox(selected)
      ? ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
      : ["w", "e"]
    : [];
  const editable = selected
    ? isEditable(selected) &&
      (!multiple ||
        !design.layers.some(
          (layer) => selectedIds?.includes(layer.id) && layer.locked
        ))
    : false;

  const startRulerGuide = useCallback(
    (axis: "horizontal" | "vertical", e: React.PointerEvent) => {
      if (guidesLocked) return;
      e.preventDefault();
      e.stopPropagation();
      const root = cardWrap.current?.querySelector<HTMLElement>(
        "[data-invitation-canvas]"
      );
      const rect = root?.getBoundingClientRect();
      if (!rect) return;
      const scale = rect.width / dims.width;
      if (!scale) return;
      const pos = Math.round(
        axis === "horizontal"
          ? (e.clientY - rect.top) / scale
          : (e.clientX - rect.left) / scale
      );
      setDraggingGuide({ axis, pos, isNew: true });
    },
    [dims.width, guidesLocked]
  );

  const startExistingGuide = useCallback(
    (
      guide: { id: string; axis: "horizontal" | "vertical"; pos: number },
      e: React.PointerEvent
    ) => {
      e.preventDefault();
      e.stopPropagation();
      if (guidesLocked) return;
      setDraggingGuide({
        id: guide.id,
        axis: guide.axis,
        pos: guide.pos,
        isNew: false,
      });
    },
    [guidesLocked]
  );

  return (
    <div
      style={{ touchAction: "none" }}
      ref={stageRef}
      data-testid="designer-stage"
      className={cn(
        "absolute inset-0 overflow-hidden select-none",
        dark ? "bg-[var(--studio-night)]" : "bg-[#ede6da]",
        isPanMode &&
          (gesture.current?.type === "pan" ? "cursor-grabbing" : "cursor-grab")
      )}
      onDragOver={(e) => {
        if (e.dataTransfer?.types?.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(e) => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file && onDropImageFile) {
          onDropImageFile(file);
        }
      }}
      onPointerMove={(e) => {
        const card = cardRect();
        if (!card) return setCursorPx(null);
        const relX = e.clientX - card.left;
        const relY = e.clientY - card.top;
        if (
          relX >= 0 &&
          relX <= card.width &&
          relY >= 0 &&
          relY <= card.height
        ) {
          setCursorPx({
            x: Math.round((relX / card.width) * dims.width),
            y: Math.round((relY / card.height) * dims.height),
          });
        } else {
          setCursorPx(null);
        }
      }}
      onPointerLeave={() => setCursorPx(null)}
      onPointerDown={(e) => {
        if (e.isPrimary === false) return;
        if (isPanMode || e.button === 1) {
          gesture.current = {
            type: "pan",
            id: "",
            startX: e.clientX,
            startY: e.clientY,
            card: cardRect() ?? new DOMRect(),
            origin: { x: 0, y: 0, width: 0, height: 0 },
            moved: false,
            snapshot: props.current.design,
          };
          return;
        }
        if (e.button !== 0) return;
        const t = e.target as HTMLElement;
        const isLayer = !!t.closest("[data-layer-id]");
        const isHandle = !!t.closest("[data-handle]");
        const isCropHandle = !!t.closest("[data-crop-handle]");
        const isGuide =
          !!t.closest("[data-ruler]") ||
          !!t.closest(".cursor-row-resize") ||
          !!t.closest(".cursor-col-resize");

        if (isCropHandle) return;

        if (activeTool === "zoom") {
          e.preventDefault();
          const delta = e.altKey ? -0.25 : 0.25;
          onZoomChange?.((z) =>
            Math.min(
              4,
              Math.max(0.05, Math.round((Number(z) + delta) * 100) / 100)
            )
          );
          return;
        }

        if (
          (activeTool === "shape" ||
            activeTool === "text" ||
            activeTool === "pen") &&
          !isCropHandle &&
          !isHandle &&
          !isGuide
        ) {
          const card = cardRect();
          if (card) {
            e.preventDefault();
            e.stopPropagation();

            const startCardX = e.clientX - card.left;
            const startCardY = e.clientY - card.top;
            const startClientX = e.clientX;
            const startClientY = e.clientY;

            setDrawingBox({
              left: startCardX,
              top: startCardY,
              width: 0,
              height: 0,
            });

            drawingCleanup.current?.();
            let cancelled = false;
            const geometry = (ev: PointerEvent) =>
              drawBox(
                { x: startCardX, y: startCardY },
                { x: ev.clientX - card.left, y: ev.clientY - card.top },
                ev.shiftKey &&
                  activeTool === "shape" &&
                  activeShapeKind !== "line",
                ev.altKey
              );
            const cleanup = () => {
              window.removeEventListener("pointermove", onDrawMove);
              window.removeEventListener("pointerup", onDrawUp);
              window.removeEventListener("pointercancel", cancelDraw);
              window.removeEventListener("blur", cancelDraw);
              window.removeEventListener("keydown", cancelKey);
              drawingCleanup.current = null;
            };
            const cancelDraw = () => {
              cancelled = true;
              cleanup();
              setDrawingBox(null);
            };
            const cancelKey = (ev: KeyboardEvent) => {
              if (ev.key === "Escape") {
                ev.preventDefault();
                cancelDraw();
              }
            };
            const onDrawMove = (ev: PointerEvent) => {
              setDrawingBox(geometry(ev));
            };
            const onDrawUp = (ev: PointerEvent) => {
              cleanup();
              setDrawingBox(null);
              if (cancelled) return;
              const dist = Math.hypot(
                ev.clientX - startClientX,
                ev.clientY - startClientY
              );

              let xPercent = 0;
              let yPercent = 0;
              let wPercent = 0;
              let hPercent = 0;

              if (dist < 15) {
                const clickXPct = (startCardX / card.width) * 100;
                const clickYPct = (startCardY / card.height) * 100;
                if (activeTool === "text") {
                  wPercent = 50;
                  hPercent = 12;
                } else if (activeTool === "pen") {
                  wPercent = 60;
                  hPercent = 3;
                } else {
                  wPercent = 35;
                  hPercent = 25;
                }
                xPercent = Math.max(
                  -200,
                  Math.min(90, clickXPct - wPercent / 2)
                );
                yPercent = Math.max(
                  -200,
                  Math.min(90, clickYPct - hPercent / 2)
                );
              } else {
                const box = geometry(ev);
                const minW =
                  activeTool === "text" ? 20 : activeTool === "pen" ? 10 : 8;
                const minH =
                  activeTool === "text" ? 5 : activeTool === "pen" ? 1 : 5;
                if (
                  ev.shiftKey &&
                  activeTool === "shape" &&
                  activeShapeKind !== "line"
                ) {
                  const side = Math.max(
                    box.width,
                    (minW / 100) * card.width,
                    (minH / 100) * card.height
                  );
                  if (ev.altKey) {
                    box.left = startCardX - side / 2;
                    box.top = startCardY - side / 2;
                  } else {
                    if (ev.clientX < startClientX) box.left = startCardX - side;
                    if (ev.clientY < startClientY) box.top = startCardY - side;
                  }
                  box.width = side;
                  box.height = side;
                } else {
                  const width = Math.max(box.width, (minW / 100) * card.width),
                    height = Math.max(box.height, (minH / 100) * card.height);
                  if (ev.altKey) {
                    box.left = startCardX - width / 2;
                    box.top = startCardY - height / 2;
                  } else {
                    if (ev.clientX < startClientX)
                      box.left = startCardX - width;
                    if (ev.clientY < startClientY)
                      box.top = startCardY - height;
                  }
                  box.width = width;
                  box.height = height;
                }
                xPercent = (box.left / card.width) * 100;
                yPercent = (box.top / card.height) * 100;
                wPercent = (box.width / card.width) * 100;
                hPercent = (box.height / card.height) * 100;
              }

              const kindToCreate =
                activeTool === "text"
                  ? "text"
                  : activeTool === "pen"
                    ? "line"
                    : (activeShapeKind ?? "rect");

              if (kindToCreate === "text") pendingTextEdit.current = true;
              if (props.current.onAddLayerWithGeometry) {
                props.current.onAddLayerWithGeometry(kindToCreate, {
                  x: xPercent,
                  y: yPercent,
                  width: wPercent,
                  height: hPercent,
                });
              } else {
                props.current.onAddLayerAt?.(
                  activeTool === "text" ? "text" : "line",
                  xPercent,
                  yPercent
                );
              }
            };

            window.addEventListener("pointermove", onDrawMove);
            window.addEventListener("pointerup", onDrawUp);
            window.addEventListener("pointercancel", cancelDraw);
            window.addEventListener("blur", cancelDraw);
            window.addEventListener("keydown", cancelKey);
            drawingCleanup.current = cleanup;
            return;
          }
        }

        if (!isLayer && !isHandle && !isGuide) {
          if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
            onSelect(null);
            props.current.onSelectBatch?.([]);
          }
          const m = {
            startX: e.clientX,
            startY: e.clientY,
            curX: e.clientX,
            curY: e.clientY,
          };
          marqueeRef.current = m;
          setMarquee(m);
        }
      }}
      onDoubleClick={(e) => {
        if (isPanMode) return;
        const el = (e.target as HTMLElement).closest<HTMLElement>(
          "[data-layer-id]"
        );
        if (el?.dataset.layerId) {
          const l = design.layers.find(
            (layer) => layer.id === el.dataset.layerId
          );
          if (l && TEXT_KINDS.has(l.kind) && isEditable(l) && showHandles) {
            onSelect(l.id);
            editingSnapshot.current = props.current.design;
            setEditingTextId(l.id);
          } else if (l && isEditable(l)) onEditText?.(el.dataset.layerId);
        }
      }}
    >
      {/* Viewport-fixed Studio Rulers (Photopea / Figma style) */}
      {showRulers && (
        <>
          <button
            type="button"
            data-testid="canvas-rulers-corner"
            title="Double-click to reset pan and zoom (Cmd+0)"
            aria-label="px: reset pan and zoom"
            onDoubleClick={() => {
              setPan({ x: 0, y: 0 });
              onZoomChange?.(1);
            }}
            className={cn(
              "pointer-events-auto absolute left-0 top-0 z-(--studio-z-floating) flex h-6 w-7 select-none items-center justify-center border-b border-r font-mono text-xs font-bold transition-colors",
              dark
                ? "border-[#2f1f27] bg-[#1a1217] text-zinc-400 hover:text-white"
                : "border-[#ded6c9] bg-[#e6dfd3] text-[#6d545e] hover:text-[var(--studio-wine)]"
            )}
          >
            px
          </button>
          <ViewportHorizontalRuler
            stageWidth={stage.w}
            cardLeft={cardLeft}
            cardWidth={cardWidth}
            designWidth={dims.width}
            cursorX={cursorPx?.x ?? null}
            dark={dark}
            onStartGuide={(e) => startRulerGuide("horizontal", e)}
          />
          <ViewportVerticalRuler
            stageHeight={stage.h}
            cardTop={cardTop}
            cardHeight={cardHeight}
            designHeight={dims.height}
            cursorY={cursorPx?.y ?? null}
            dark={dark}
            onStartGuide={(e) => startRulerGuide("vertical", e)}
          />
        </>
      )}

      {/* Infinite Artboard Workspace */}
      <div
        ref={cardWrap}
        data-stage-card
        className="absolute select-none shadow-(--studio-shadow-stage)"
        style={{
          left: cardLeft,
          top: cardTop,
          width: cardWidth || undefined,
          height: cardHeight || undefined,
        }}
      >
        {showPrintGuides && (
          <>
            <div
              data-testid="print-guide-safe"
              aria-hidden="true"
              className="pointer-events-none absolute z-(--studio-z-raised) border border-dashed border-emerald-600"
              style={{ inset: "5%" }}
            />
            <div
              data-testid="print-guide-bleed"
              aria-hidden="true"
              className="pointer-events-none absolute z-(--studio-z-raised) border border-dashed border-red-500"
              style={{ inset: "-2.5%" }}
            />
          </>
        )}
        {showGrid && (
          <div
            data-testid="canvas-grid"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-(--studio-z-raised) opacity-20"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.5) 1px, transparent 1px)`,
              backgroundSize: `${(cardWidth / dims.width) * 100}px ${(cardHeight / dims.height) * 100}px`,
            }}
          />
        )}

        {/* User-created Persistent Ruler Guides (Photoshop / Photopea style) */}
        {userGuides.map((guide) => {
          if (draggingGuide?.id === guide.id) return null;
          if (guide.axis === "vertical") {
            return (
              <div
                key={guide.id}
                data-guide-id={guide.id}
                title={`Vertical Guide at ${guide.pos}px (Drag to move, Double-click to delete)`}
                style={{ left: `${(guide.pos / dims.width) * 100}%` }}
                onPointerDown={(e) => startExistingGuide(guide, e)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (guidesLocked) return;
                  setUserGuides((prev) =>
                    prev.filter((g) => g.id !== guide.id)
                  );
                }}
                className="group absolute inset-y-0 z-(--studio-z-panel) flex items-center cursor-col-resize pointer-events-auto"
              >
                <div className="h-full w-px bg-[#00e5ff] shadow-(--studio-glow-selection) transition-all group-hover:w-0.5 group-hover:bg-[var(--studio-gold)]" />
                <span className="absolute top-2 -left-6 hidden rounded bg-[#00e5ff] px-1.5 py-0.5 text-xs font-mono font-bold text-black shadow-md group-hover:block whitespace-nowrap">
                  X: {guide.pos}px
                </span>
              </div>
            );
          }
          return (
            <div
              key={guide.id}
              data-guide-id={guide.id}
              title={`Horizontal Guide at ${guide.pos}px (Drag to move, Double-click to delete)`}
              style={{ top: `${(guide.pos / dims.height) * 100}%` }}
              onPointerDown={(e) => startExistingGuide(guide, e)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (guidesLocked) return;
                setUserGuides((prev) => prev.filter((g) => g.id !== guide.id));
              }}
              className="group absolute inset-x-0 z-(--studio-z-panel) flex justify-center cursor-row-resize pointer-events-auto"
            >
              <div className="h-px w-full bg-[#00e5ff] shadow-(--studio-glow-selection) transition-all group-hover:h-0.5 group-hover:bg-[var(--studio-gold)]" />
              <span className="absolute right-2 -top-5 hidden rounded bg-[#00e5ff] px-1.5 py-0.5 text-xs font-mono font-bold text-black shadow-md group-hover:block whitespace-nowrap">
                Y: {guide.pos}px
              </span>
            </div>
          );
        })}

        {/* Live Dragging Guide Indicator */}
        {draggingGuide &&
          (draggingGuide.axis === "vertical" ? (
            <div
              style={{ left: `${(draggingGuide.pos / dims.width) * 100}%` }}
              className="pointer-events-none absolute inset-y-0 z-(--studio-z-floating) flex items-center"
            >
              <div className="h-full w-0.5 bg-[var(--studio-gold)] shadow-(--studio-glow-gold)" />
              <span className="absolute top-4 -left-7 rounded bg-[var(--studio-gold)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--studio-night)] shadow-xl whitespace-nowrap">
                X: {draggingGuide.pos}px
              </span>
            </div>
          ) : (
            <div
              style={{ top: `${(draggingGuide.pos / dims.height) * 100}%` }}
              className="pointer-events-none absolute inset-x-0 z-(--studio-z-floating) flex justify-center"
            >
              <div className="h-0.5 w-full bg-[var(--studio-gold)] shadow-(--studio-glow-gold)" />
              <span className="absolute right-4 -top-6 rounded bg-[var(--studio-gold)] px-2 py-0.5 text-xs font-mono font-bold text-[var(--studio-night)] shadow-xl whitespace-nowrap">
                Y: {draggingGuide.pos}px
              </span>
            </div>
          ))}

        {/* Smart Alignment Magnetic Guides */}
        {activeGuides.map((guide, idx) => {
          if (guide.type === "vertical") {
            return (
              <div
                key={`v-${idx}-${guide.posPct}`}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 z-(--studio-z-panel) flex items-center"
                style={{ left: `${guide.posPct}%` }}
              >
                <div className="h-full w-px bg-[var(--studio-bronze)] shadow-(--studio-glow-bronze)" />
                {guide.label && (
                  <span className="absolute top-2 -translate-x-1/2 rounded-full bg-[var(--studio-bronze)] px-1.5 py-0.5 text-xs font-mono font-bold text-white shadow-xs">
                    {guide.label}
                  </span>
                )}
              </div>
            );
          }
          return (
            <div
              key={`h-${idx}-${guide.posPct}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-(--studio-z-panel) flex justify-center"
              style={{ top: `${guide.posPct}%` }}
            >
              <div className="h-px w-full bg-[var(--studio-bronze)] shadow-(--studio-glow-bronze)" />
              {guide.label && (
                <span className="absolute left-2 -translate-y-1/2 rounded-full bg-[var(--studio-bronze)] px-1.5 py-0.5 text-xs font-mono font-bold text-white shadow-xs">
                  {guide.label}
                </span>
              )}
            </div>
          );
        })}

        <InvitationCard
          design={design}
          coupleName={coupleName}
          sampleEntry
          selectedLayerId={showHandles ? null : selectedId}
          selectedLayerIds={selectedIds}
          onLayerPointerDown={editingTextId ? undefined : onLayerPointerDown}
          editingLayerId={editingTextId}
          onLayerTextChange={(id, text) => {
            onUpdate(id, { text });
          }}
          onStopEditingText={finishText}
        />

        {/* Photoshop / Photopea Rule-of-Thirds Crop Overlay */}
        {activeTool === "crop" && (
          <div
            data-testid="crop-overlay"
            className="pointer-events-none absolute inset-0 z-(--studio-z-panel) border-2 border-white/80 shadow-(--studio-shadow-dim)"
          >
            <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
            <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
            <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
            <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />

            <span
              data-crop-handle="nw"
              onPointerDown={(e) => startCropHandle(e, "nw")}
              className="absolute -left-1 -top-1 h-3.5 w-3.5 border-t-4 border-l-4 border-white pointer-events-auto cursor-nwse-resize"
            />
            <span
              data-crop-handle="n"
              onPointerDown={(e) => startCropHandle(e, "n")}
              className="absolute left-1/2 -top-1 -translate-x-1/2 h-2.5 w-5 border-t-4 border-white pointer-events-auto cursor-ns-resize"
            />
            <span
              data-crop-handle="ne"
              onPointerDown={(e) => startCropHandle(e, "ne")}
              className="absolute -right-1 -top-1 h-3.5 w-3.5 border-t-4 border-r-4 border-white pointer-events-auto cursor-nesw-resize"
            />
            <span
              data-crop-handle="e"
              onPointerDown={(e) => startCropHandle(e, "e")}
              className="absolute -right-1 top-1/2 -translate-y-1/2 h-5 w-2.5 border-r-4 border-white pointer-events-auto cursor-ew-resize"
            />
            <span
              data-crop-handle="se"
              onPointerDown={(e) => startCropHandle(e, "se")}
              className="absolute -right-1 -bottom-1 h-3.5 w-3.5 border-b-4 border-r-4 border-white pointer-events-auto cursor-nwse-resize"
            />
            <span
              data-crop-handle="s"
              onPointerDown={(e) => startCropHandle(e, "s")}
              className="absolute left-1/2 -bottom-1 -translate-x-1/2 h-2.5 w-5 border-b-4 border-white pointer-events-auto cursor-ns-resize"
            />
            <span
              data-crop-handle="sw"
              onPointerDown={(e) => startCropHandle(e, "sw")}
              className="absolute -left-1 -bottom-1 h-3.5 w-3.5 border-b-4 border-l-4 border-white pointer-events-auto cursor-nesw-resize"
            />
            <span
              data-crop-handle="w"
              onPointerDown={(e) => startCropHandle(e, "w")}
              className="absolute -left-1 top-1/2 -translate-y-1/2 h-5 w-2.5 border-l-4 border-white pointer-events-auto cursor-ew-resize"
            />
          </div>
        )}
        {showHandles &&
          activeTool !== "crop" &&
          selected &&
          box &&
          selected.visible &&
          !editingTextId && (
            <div
              ref={overlayRef}
              data-testid="designer-selection"
              className="pointer-events-none absolute"
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                transform:
                  !multiple && selected.rotation
                    ? `rotate(${selected.rotation}deg)`
                    : undefined,
                outline: "1.5px solid #b8864b",
                outlineOffset: 2,
              }}
            >
              {editable &&
                handles.map((h) => (
                  <span
                    key={h}
                    data-handle={h}
                    style={{
                      cursor: cursorForHandle(
                        h,
                        multiple ? 0 : (selected.rotation ?? 0)
                      ),
                      touchAction: "none",
                    }}
                    onPointerDown={(e) => startHandle(e, h)}
                    className={`pointer-events-auto absolute grid h-7 w-7 place-items-center ${HANDLES[h]}`}
                  >
                    <span className="block h-2.5 w-2.5 rounded-[3px] border border-[var(--studio-bronze)] bg-white shadow" />
                  </span>
                ))}
              {editable && !multiple && (
                <span
                  data-handle="rotate"
                  onPointerDown={(e) => startHandle(e, "rotate")}
                  className="pointer-events-auto absolute -top-9 left-1/2 grid h-7 w-7 -translate-x-1/2 cursor-grab place-items-center"
                >
                  <span className="block h-3 w-3 rounded-full border border-[var(--studio-bronze)] bg-white shadow" />
                </span>
              )}

              {/* Inner Corner Radius Drag Handles (PhotoCraft / Figma Style) */}
              {editable &&
                !multiple &&
                ((selected.kind === "shape" &&
                  (!selected.shape || selected.shape === "rect")) ||
                  (selected.kind === "image" &&
                    (!selected.maskShape || selected.maskShape === "rect"))) &&
                box.width >= 64 &&
                box.height >= 64 &&
                (() => {
                  const card = cardRect();
                  const cardW = card?.width ?? 600;
                  const baseCqw = selected.radius ?? 0;
                  const maxRPx = Math.min(box.width, box.height) / 2;
                  const calcCorner = (cqw: number) => {
                    const rPx = Math.max(
                      0,
                      Math.min(maxRPx, (cqw / 100) * cardW)
                    );
                    const inset = Math.min(
                      Math.max(10, maxRPx - 4),
                      Math.max(10, rPx + 6)
                    );
                    return { rPx, inset };
                  };
                  const tl = calcCorner(selected.radiusTL ?? baseCqw);
                  const tr = calcCorner(selected.radiusTR ?? baseCqw);
                  const br = calcCorner(selected.radiusBR ?? baseCqw);
                  const bl = calcCorner(selected.radiusBL ?? baseCqw);

                  const corners = [
                    {
                      id: "tl" as const,
                      rPx: tl.rPx,
                      style: { left: tl.inset, top: tl.inset },
                      translate: "-translate-x-1/2 -translate-y-1/2",
                    },
                    {
                      id: "tr" as const,
                      rPx: tr.rPx,
                      style: { right: tr.inset, top: tr.inset },
                      translate: "translate-x-1/2 -translate-y-1/2",
                    },
                    {
                      id: "br" as const,
                      rPx: br.rPx,
                      style: { right: br.inset, bottom: br.inset },
                      translate: "translate-x-1/2 translate-y-1/2",
                    },
                    {
                      id: "bl" as const,
                      rPx: bl.rPx,
                      style: { left: bl.inset, bottom: bl.inset },
                      translate: "-translate-x-1/2 translate-y-1/2",
                    },
                  ];

                  return (
                    <>
                      {corners.map((corner) => (
                        <span
                          key={corner.id}
                          data-radius-handle={corner.id}
                          onPointerDown={(e) =>
                            startRadiusHandle(e, corner.id, corner.rPx, maxRPx)
                          }
                          style={{ ...corner.style, touchAction: "none" }}
                          className={cn(
                            "pointer-events-auto absolute grid h-6 w-6 place-items-center cursor-crosshair z-(--studio-z-panel) group",
                            corner.translate
                          )}
                          title={`Drag inward to adjust ${corner.id.toUpperCase()} corner radius — hold Alt for single corner (${((corner.rPx / cardW) * dims.width).toFixed(1)}px)`}
                        >
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[var(--studio-gold)] bg-white shadow-md transition-transform group-hover:scale-125">
                            <span className="block h-1 w-1 rounded-full bg-[var(--studio-gold)]" />
                          </span>
                        </span>
                      ))}
                    </>
                  );
                })()}
            </div>
          )}

        {/* Live Drawing Box with Dimensions Badge */}
        {drawingBox && (
          <div
            data-testid="drawing-box-preview"
            className="pointer-events-none absolute z-(--studio-z-floating) border-2 border-dashed border-[var(--studio-gold)] bg-[var(--studio-gold)]/15 rounded shadow-lg transition-none"
            style={{
              left: drawingBox.left,
              top: drawingBox.top,
              width: drawingBox.width,
              height: drawingBox.height,
            }}
          >
            <div className="absolute -bottom-7 right-0 rounded-md bg-[#1c070d]/95 backdrop-blur px-2 py-0.5 font-mono text-xs font-bold text-[var(--studio-gold)] border border-[var(--studio-gold)]/40 shadow-md whitespace-nowrap">
              {Math.round(drawingBox.width / zoom)} ×{" "}
              {Math.round(drawingBox.height / zoom)} px
            </div>
          </div>
        )}
      </div>

      {/* Floating Radius Tooltip (PhotoCraft Style: R: 93.5 px) */}
      {radiusTooltip?.show && (
        <div
          className="fixed z-(--studio-z-overlay) pointer-events-none -translate-x-1/2 -translate-y-9 rounded-md bg-[#1c070d]/95 backdrop-blur px-2.5 py-1 font-mono text-xs font-bold text-[var(--studio-gold)] shadow-lg border border-[var(--studio-gold)]/40 flex items-center gap-1.5"
          style={{ left: radiusTooltip.x, top: radiusTooltip.y }}
        >
          <span className="text-xs text-zinc-400">R:</span>
          <span>{radiusTooltip.rPx.toFixed(1)} px</span>
        </div>
      )}

      {/* Photoshop / Figma Style Rubber-band Marquee Selection Box */}
      {marquee && (
        <div
          data-testid="selection-marquee"
          className="pointer-events-none fixed z-(--studio-z-overlay) border border-[var(--studio-gold)] bg-[var(--studio-gold)]/15 shadow-sm"
          style={{
            left: Math.min(marquee.startX, marquee.curX),
            top: Math.min(marquee.startY, marquee.curY),
            width: Math.abs(marquee.curX - marquee.startX),
            height: Math.abs(marquee.curY - marquee.startY),
          }}
        />
      )}
    </div>
  );
}

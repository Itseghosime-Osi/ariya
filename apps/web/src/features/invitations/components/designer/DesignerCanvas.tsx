"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { InvitationCard } from "../InvitationCard";
import { designRatio, isEditable, type Handle } from "../../layer-ops";
import { resizeBoxFast, snapRotationFast } from "../../engine";
import type { InvitationDesign, InvitationLayer } from "../../types";

const PAD = 28;

type Patch = Partial<InvitationLayer>;

interface Gesture {
  type: "move" | "resize" | "rotate";
  id: string;
  handle?: Handle;
  startX: number;
  startY: number;
  card: DOMRect;
  origin: { x: number; y: number; width: number; height: number };
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

export function DesignerCanvas({
  design,
  coupleName,
  selectedId,
  zoom,
  showHandles,
  onSelect,
  onUpdate,
  onRecord,
  onEditText,
}: {
  design: InvitationDesign;
  coupleName: string;
  selectedId: string | null;
  /** 1 fits the card to the stage; larger zooms in. */
  zoom: number;
  /** Pro mode draws the resize and rotate handles; Simple mode just outlines the layer. */
  showHandles: boolean;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Patch, options?: { commit?: boolean }) => void;
  onRecord: (snapshot: InvitationDesign) => void;
  onEditText?: (id: string) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardWrap = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const props = useRef({ onUpdate, onRecord, design });
  props.current = { onUpdate, onRecord, design };

  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<Measured | null>(null);

  const ratio = designRatio(design);
  const fit = Math.min(
    Math.max(stage.w - PAD * 2, 120),
    Math.max(stage.h - PAD * 2, 120) * ratio
  );
  const cardWidth = Math.round(fit * zoom);

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
    setBox({
      left: el.offsetLeft,
      top: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
  }, [selectedId]);

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

      if (g.type === "move") {
        update(
          g.id,
          {
            x: clamp(g.origin.x + dx, 0, 100 - g.origin.width),
            y: clamp(g.origin.y + dy, 0, 100 - Math.min(g.origin.height, 98)),
          },
          { commit: false }
        );
        return;
      }

      const layer = props.current.design.layers.find((l) => l.id === g.id);
      if (!layer || !g.handle) return;
      if (hasBox(layer)) {
        const next = resizeBoxFast(g.origin, g.handle, dx, dy, e.shiftKey);
        update(g.id, next, { commit: false });
      } else {
        // Text, seal, rule and entry seal change width only; height follows.
        const side: Handle = g.handle.includes("w") ? "w" : "e";
        const next = resizeBoxFast(g.origin, side, dx, 0, false);
        update(g.id, { x: next.x, width: next.width }, { commit: false });
      }
    }
    function onUp() {
      const g = gesture.current;
      gesture.current = null;
      if (g?.moved) props.current.onRecord(g.snapshot);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
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
    return box ? (box.height / card.height) * 100 : 4;
  }

  function onLayerPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    layer: InvitationLayer
  ) {
    e.preventDefault();
    onSelect(layer.id);
    if (!isEditable(layer)) return;
    const card = cardRect();
    if (!card) return;
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

  function startHandle(e: React.PointerEvent, handle: Handle | "rotate") {
    if (!selected) return;
    e.preventDefault();
    e.stopPropagation();
    const card = cardRect();
    if (!card) return;
    const r = overlayRef.current?.getBoundingClientRect();
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

  const handles: Handle[] = selected
    ? hasBox(selected)
      ? ["nw", "n", "ne", "e", "se", "s", "sw", "w"]
      : ["w", "e"]
    : [];
  const editable = selected ? isEditable(selected) : false;

  return (
    <div
      ref={stageRef}
      data-testid="designer-stage"
      className="absolute inset-0 overflow-auto"
      onPointerDown={(e) => {
        const t = e.target as HTMLElement;
        if (t === e.currentTarget || t.hasAttribute("data-stage-fill")) {
          onSelect(null);
        }
      }}
      onDoubleClick={(e) => {
        const el = (e.target as HTMLElement).closest<HTMLElement>(
          "[data-layer-id]"
        );
        if (el?.dataset.layerId) onEditText?.(el.dataset.layerId);
      }}
    >
      <div
        data-stage-fill
        className="grid min-h-full min-w-full place-items-center"
        style={{ padding: PAD }}
      >
        <div
          ref={cardWrap}
          className="relative"
          style={{ width: cardWidth || undefined }}
        >
          <InvitationCard
            design={design}
            coupleName={coupleName}
            sampleEntry
            selectedLayerId={showHandles ? null : selectedId}
            onLayerPointerDown={onLayerPointerDown}
          />
          {showHandles && selected && box && selected.visible && (
            <div
              ref={overlayRef}
              data-testid="designer-selection"
              className="pointer-events-none absolute"
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
                transform: selected.rotation
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
                    onPointerDown={(e) => startHandle(e, h)}
                    className={`pointer-events-auto absolute grid h-7 w-7 place-items-center ${HANDLES[h]}`}
                  >
                    <span className="block h-2.5 w-2.5 rounded-[3px] border border-[#b8864b] bg-white shadow" />
                  </span>
                ))}
              {editable && (
                <span
                  data-handle="rotate"
                  onPointerDown={(e) => startHandle(e, "rotate")}
                  className="pointer-events-auto absolute -top-9 left-1/2 grid h-7 w-7 -translate-x-1/2 cursor-grab place-items-center"
                >
                  <span className="block h-3 w-3 rounded-full border border-[#b8864b] bg-white shadow" />
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

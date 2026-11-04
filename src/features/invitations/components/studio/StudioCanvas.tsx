"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { InvitationCard } from "../InvitationCard";
import { INVITATION_LAYER_LABELS } from "../../types";
import type { InvitationDesign, InvitationLayer } from "../../types";
import type { StudioApi } from "./types";

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  width: number;
  rect: DOMRect;
  moved: boolean;
  snapshot: InvitationDesign;
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold text-ivory/80 transition-colors hover:bg-white/10 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne disabled:opacity-30"
    >
      <Icon name={icon} size={15} />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
}

/**
 * The canvas: a velvet stage, the one invitation card, and direct manipulation. Layers can be
 * dragged, nudged with the arrow keys, and deleted. Every gesture is undoable as one step.
 */
export function StudioCanvas({
  api,
  coupleName,
}: {
  api: StudioApi;
  coupleName: string;
}) {
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<DragState | null>(null);
  const apiRef = useRef(api);
  apiRef.current = api;

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = ((event.clientX - drag.startX) / drag.rect.width) * 100;
      const dy = ((event.clientY - drag.startY) / drag.rect.height) * 100;
      if (!drag.moved && Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;
      drag.moved = true;
      apiRef.current.updateLayer(drag.id, {
        x: clamp(drag.originX + dx, 0, 100 - drag.width),
        y: clamp(drag.originY + dy, 0, 98),
      });
    }
    function onUp() {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      if (drag.moved) apiRef.current.recordSnapshot(drag.snapshot);
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

  const selected =
    api.design.layers.find((l) => l.id === api.selectedId) ?? null;
  const stageFrom = api.design.palette.stageFrom;
  const stageTo = api.design.palette.stageTo;

  function handleLayerPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    layer: InvitationLayer
  ) {
    event.preventDefault();
    api.select(layer.id);
    const canvas = (event.currentTarget as HTMLElement).closest(
      "[data-invitation-canvas]"
    ) as HTMLElement | null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dragRef.current = {
      id: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: layer.x,
      originY: layer.y,
      width: layer.width,
      rect,
      moved: false,
      snapshot: api.design,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!selected) return;
    const step = event.shiftKey ? 5 : 0.5;
    let patch: Partial<InvitationLayer> | null = null;
    if (event.key === "ArrowLeft") {
      patch = { x: clamp(selected.x - step, 0, 100 - selected.width) };
    } else if (event.key === "ArrowRight") {
      patch = { x: clamp(selected.x + step, 0, 100 - selected.width) };
    } else if (event.key === "ArrowUp") {
      patch = { y: clamp(selected.y - step, 0, 98) };
    } else if (event.key === "ArrowDown") {
      patch = { y: clamp(selected.y + step, 0, 98) };
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      api.deleteLayer(selected.id);
      return;
    }
    if (!patch) return;
    event.preventDefault();
    api.updateLayer(selected.id, patch, { commit: true });
  }

  return (
    <section
      aria-label="Invitation canvas"
      className="relative overflow-hidden rounded-[28px] border border-white/10"
      style={{
        background: `radial-gradient(circle at 50% 15%, ${stageFrom}, ${stageTo} 72%)`,
      }}
    >
      <div className="desk-aurora" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="relative flex flex-col items-center gap-4 p-4 sm:p-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div
            className="flex flex-wrap items-center gap-0.5 rounded-full bg-black/25 p-1"
            role="toolbar"
            aria-label="Canvas tools"
          >
            <ToolButton
              icon="text_fields"
              label="Add text"
              onClick={() => api.addLayer("text")}
            />
            <ToolButton
              icon="celebration"
              label="Add seal"
              onClick={() => api.addLayer("seal")}
            />
            <ToolButton
              icon="tune"
              label="Add rule"
              onClick={() => api.addLayer("divider")}
            />
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/15" />
            <ToolButton
              icon="undo"
              label="Undo"
              onClick={api.undo}
              disabled={!api.canUndo}
            />
            <ToolButton
              icon="redo"
              label="Redo"
              onClick={api.redo}
              disabled={!api.canRedo}
            />
          </div>

          <div className="flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-1 text-ivory">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => clamp(z - 0.1, MIN_ZOOM, MAX_ZOOM))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne"
            >
              <Icon name="chevron_left" size={15} />
            </button>
            <span className="w-10 text-center text-[11px] font-semibold tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => clamp(z + 0.1, MIN_ZOOM, MAX_ZOOM))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-champagne"
            >
              <Icon name="chevron_right" size={15} />
            </button>
          </div>
        </div>

        <div
          className="w-full transition-[max-width] duration-200"
          style={{ maxWidth: `${Math.round(360 * zoom)}px` }}
        >
          <div
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label={
              selected
                ? `${INVITATION_LAYER_LABELS[selected.kind]} selected. Drag it, or use the arrow keys to nudge it.`
                : "Invitation canvas. Select a layer to edit it."
            }
            className="rounded-[24px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-champagne"
          >
            <InvitationCard
              design={api.design}
              coupleName={coupleName}
              selectedLayerId={api.selectedId}
              onLayerPointerDown={handleLayerPointerDown}
            />
          </div>
        </div>

        <p className="max-w-sm text-balance text-center text-[11px] leading-relaxed text-ivory/60">
          Drag a layer to move it. Arrow keys nudge, Shift makes the step
          bigger, Delete removes it.
        </p>
      </div>
    </section>
  );
}

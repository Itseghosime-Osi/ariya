"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function StudioBottomDock({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  onFit,
  dimensions,
  cursorPx,
  onExport,
  dark,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onFit: () => void;
  dimensions: { width: number; height: number };
  cursorPx?: { x: number; y: number } | null;
  onExport: () => void;
  dark: boolean;
  handTool?: boolean;
  onToggleHandTool?: () => void;
  showRulers?: boolean;
  onToggleRulers?: () => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
}) {
  return (
    <div
      data-testid="studio-statusbar"
      role="region"
      aria-label="Studio controls and export"
      className={cn(
        "pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-center gap-2 px-2 py-2 sm:px-4 pointer-coarse:py-1 transition-colors select-none border-t",
        dark
          ? "border-[#3f2935] bg-[var(--studio-surface-dark)]/92 text-[var(--studio-cream)] shadow-[0_12px_40px_rgba(0,0,0,0.65)]"
          : "border-[#e6ded2] bg-[#ffffff]/95 text-[var(--studio-ink)] shadow-[0_10px_35px_rgba(74,14,23,0.12)]"
      )}
    >
      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          title="Undo (Cmd+Z)"
          aria-label="Undo"
          disabled={!canUndo}
          onClick={onUndo}
          className={cn(
            "grid h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11 place-items-center rounded-full transition-colors disabled:opacity-25",
            dark
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-[var(--studio-wine)]/10 hover:text-[var(--studio-wine)]"
          )}
        >
          <Icon name="undo" size={15} />
        </button>
        <button
          type="button"
          title="Redo (Cmd+Shift+Z)"
          aria-label="Redo"
          disabled={!canRedo}
          onClick={onRedo}
          className={cn(
            "grid h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11 place-items-center rounded-full transition-colors disabled:opacity-25",
            dark
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-[var(--studio-wine)]/10 hover:text-[var(--studio-wine)]"
          )}
        >
          <Icon name="redo" size={15} />
        </button>
      </div>

      <span
        aria-hidden="true"
        className={cn("mx-1 h-4 w-px", dark ? "bg-white/15" : "bg-black/10")}
      />

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          title="Zoom out (-)"
          aria-label="Zoom out"
          onClick={() => onZoomChange(Math.max(0.05, zoom - 0.25))}
          className={cn(
            "grid h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11 place-items-center rounded-full text-base font-semibold leading-none transition-colors",
            dark
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-[var(--studio-wine)]/10 hover:text-[var(--studio-wine)]"
          )}
        >
          −
        </button>
        <button
          type="button"
          title="Reset Zoom to Fit (Cmd+0)"
          aria-label={`${Math.round(zoom * 100)}% — reset zoom to fit`}
          onClick={onFit}
          className={cn(
            "rounded-md px-2 py-0.5 pointer-coarse:grid pointer-coarse:h-11 pointer-coarse:min-w-11 pointer-coarse:place-items-center font-mono text-xs font-semibold tabular-nums transition-colors",
            dark
              ? "hover:bg-white/10 text-[var(--studio-gold)]"
              : "hover:bg-[var(--studio-wine)]/10 text-[var(--studio-wine-2)]"
          )}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          title="Zoom in (+)"
          aria-label="Zoom in"
          onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
          className={cn(
            "grid h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11 place-items-center rounded-full text-base font-semibold leading-none transition-colors",
            dark
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-[var(--studio-wine)]/10 hover:text-[var(--studio-wine)]"
          )}
        >
          +
        </button>
        <select
          aria-label="Zoom presets"
          title="Zoom presets"
          data-testid="zoom-presets"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (v === "fit") onFit();
            else if (v) onZoomChange(Number(v));
            e.target.value = "";
          }}
          className={cn(
            "h-7 w-8 pointer-coarse:h-11 pointer-coarse:w-9 pointer-coarse:max-[430px]:hidden cursor-pointer appearance-none rounded-md border bg-transparent text-center text-xs font-semibold",
            dark
              ? "border-white/15 text-[var(--studio-gold)]"
              : "border-black/10 text-[var(--studio-wine-2)]"
          )}
        >
          <option value="" disabled>
            ▾
          </option>
          <option value="fit">Fit</option>
          <option value="0.25">25%</option>
          <option value="0.5">50%</option>
          <option value="1">100%</option>
          <option value="2">200%</option>
          <option value="4">400%</option>
        </select>
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "mx-1 h-4 w-px max-sm:hidden",
          dark ? "bg-white/15" : "bg-black/10"
        )}
      />

      {/* Dimensions & Coordinates */}
      <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs">
        <span
          className={cn(
            "font-medium",
            dark ? "text-zinc-300" : "text-[var(--studio-ink-3)]"
          )}
        >
          {dimensions.width} × {dimensions.height} px
        </span>
        {cursorPx && (
          <span
            className={cn(
              "text-xs",
              dark ? "text-[var(--studio-gold)]" : "text-[var(--studio-wine-2)]"
            )}
          >
            (X: {cursorPx.x}, Y: {cursorPx.y})
          </span>
        )}
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "mx-1 h-5 w-px max-[430px]:hidden",
          dark ? "bg-white/20" : "bg-black/15"
        )}
      />

      {/* Luxury Export Button */}
      <button
        type="button"
        onClick={onExport}
        className={cn(
          "inline-flex h-8 pointer-coarse:h-11 items-center gap-1.5 rounded-full px-4 pointer-coarse:px-3 text-xs font-bold transition-transform active:scale-95 shadow-md",
          dark
            ? "bg-[var(--studio-gold)] text-[var(--studio-night)] hover:bg-[var(--studio-gold-hover)]"
            : "bg-[var(--studio-wine-2)] text-white hover:bg-[var(--studio-wine)]"
        )}
      >
        <Icon name="download" size={14} />
        <span>Export</span>
      </button>
    </div>
  );
}

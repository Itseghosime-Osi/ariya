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
        "pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-center gap-2 px-4 py-2 transition-colors select-none border-t",
        dark
          ? "border-[#3f2935] bg-[#23181e]/92 text-[#fff6dc] shadow-[0_12px_40px_rgba(0,0,0,0.65)]"
          : "border-[#e6ded2] bg-[#ffffff]/95 text-[#2d1f24] shadow-[0_10px_35px_rgba(74,14,23,0.12)]"
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
            "grid h-8 w-8 place-items-center rounded-full transition-colors disabled:opacity-25",
            dark
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-[#4a0e17]/10 hover:text-[#4a0e17]"
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
            "grid h-8 w-8 place-items-center rounded-full transition-colors disabled:opacity-25",
            dark
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-[#4a0e17]/10 hover:text-[#4a0e17]"
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
            "grid h-7 w-7 place-items-center rounded-full text-base font-semibold leading-none transition-colors",
            dark
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-[#4a0e17]/10 hover:text-[#4a0e17]"
          )}
        >
          −
        </button>
        <button
          type="button"
          title="Reset Zoom to Fit (Cmd+0)"
          aria-label="Reset zoom to fit"
          onClick={onFit}
          className={cn(
            "rounded-md px-2 py-0.5 font-mono text-xs font-semibold tabular-nums transition-colors",
            dark
              ? "hover:bg-white/10 text-[#dfba73]"
              : "hover:bg-[#4a0e17]/10 text-[#6b1e2e]"
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
            "grid h-7 w-7 place-items-center rounded-full text-base font-semibold leading-none transition-colors",
            dark
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-[#4a0e17]/10 hover:text-[#4a0e17]"
          )}
        >
          +
        </button>
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "mx-1 h-4 w-px max-sm:hidden",
          dark ? "bg-white/15" : "bg-black/10"
        )}
      />

      {/* Dimensions & Coordinates */}
      <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px]">
        <span
          className={cn(
            "font-medium",
            dark ? "text-zinc-300" : "text-[#4a363f]"
          )}
        >
          {dimensions.width} × {dimensions.height} px
        </span>
        {cursorPx && (
          <span
            className={cn(
              "text-[10px]",
              dark ? "text-[#dfba73]" : "text-[#6b1e2e]"
            )}
          >
            (X: {cursorPx.x}, Y: {cursorPx.y})
          </span>
        )}
      </div>

      <span
        aria-hidden="true"
        className={cn("mx-1 h-5 w-px", dark ? "bg-white/20" : "bg-black/15")}
      />

      {/* Luxury Export Button */}
      <button
        type="button"
        onClick={onExport}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full px-4 text-xs font-bold transition-transform active:scale-95 shadow-md",
          dark
            ? "bg-[#dfba73] text-[#20161b] hover:bg-[#edd49d]"
            : "bg-[#6b1e2e] text-white hover:bg-[#4a0e17]"
        )}
      >
        <Icon name="download" size={14} />
        <span>Export</span>
      </button>
    </div>
  );
}

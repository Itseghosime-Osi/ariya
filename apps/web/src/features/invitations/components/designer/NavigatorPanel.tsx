"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { InvitationDesign } from "../../types";
import { designDimensionsPx, designRatio } from "../../layer-ops";

interface NavigatorPanelProps {
  dark?: boolean;
  design: InvitationDesign;
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetView: () => void;
}

export function NavigatorPanel({
  dark,
  design,
  zoom,
  onZoomChange,
  onResetView,
}: NavigatorPanelProps) {
  const dims = designDimensionsPx(design);
  const ratio = designRatio(design);

  return (
    <div
      data-testid="navigator-panel"
      className="space-y-4 p-3 text-xs select-none"
    >
      {/* Mini-map Card Canvas */}
      <div className="relative mx-auto flex h-52 w-full items-center justify-center rounded-xl border border-hairline bg-black/10 p-3 overflow-hidden">
        {/* Miniature card representation */}
        <div
          className="relative rounded border shadow-lg overflow-hidden transition-all"
          style={{
            aspectRatio: String(ratio),
            height: "100%",
            backgroundColor:
              design.background.kind === "color"
                ? design.background.color || "#fffaf3"
                : "#fffaf3",
          }}
        >
          {/* Card Layers rendered as miniature shapes / lines */}
          {design.layers.map((l) => (
            <div
              key={l.id}
              className="absolute pointer-events-none rounded-[1px]"
              style={{
                left: `${l.x}%`,
                top: `${l.y}%`,
                width: `${l.width}%`,
                height: `${l.height ?? 3}%`,
                backgroundColor:
                  l.kind === "seal"
                    ? "#dfba73"
                    : l.kind === "shape"
                      ? l.fill || "#dfba73"
                      : l.colorRole === "accent" || l.colorRole === "foil"
                        ? "#dfba73"
                        : "#4a0e17",
                opacity: (l.opacity ?? 1) * 0.7,
              }}
            />
          ))}

          {/* Viewport Red Indicator Box */}
          <div
            className="pointer-events-none absolute inset-0 border-2 border-red-500 shadow-sm"
            style={{
              transform: `scale(${Math.max(0.3, 1 / zoom)})`,
              transformOrigin: "center center",
            }}
          />
        </div>
      </div>

      {/* Zoom Control Slider & Presets */}
      <div className="space-y-2 rounded-xl border border-hairline bg-white/[0.04] p-3">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[11px] font-semibold",
              dark ? "text-zinc-400" : "text-[#7a5b67]"
            )}
          >
            Artboard Zoom
          </span>
          <span className="font-mono text-xs font-bold text-[#dfba73]">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-label-2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <input
            type="range"
            aria-label="Canvas zoom slider"
            min={0.25}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-[#dfba73] focus:outline-none"
          />
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-label-2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        {/* Quick Zoom Buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[0.25, 1, 2, 4].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => onZoomChange(z)}
              className={cn(
                "rounded-md py-1 text-center font-mono text-[11px] font-medium transition",
                Math.abs(zoom - z) < 0.05
                  ? dark
                    ? "bg-[#dfba73] text-[#20161b] font-bold"
                    : "bg-[#4a0e17] text-white font-bold"
                  : dark
                    ? "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12]"
                    : "bg-black/5 text-[#2d1f24] hover:bg-black/10"
              )}
            >
              {Math.round(z * 100)}%
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onResetView}
          className={cn(
            "w-full flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition mt-2",
            dark
              ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
              : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
          )}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          Reset View & Fit Screen
        </button>
      </div>

      {/* Artboard Info */}
      <div className="rounded-xl border border-hairline bg-white/[0.03] p-3 space-y-1.5">
        <span
          className={cn(
            "text-[10px] uppercase font-semibold tracking-wide block",
            dark ? "text-zinc-400" : "text-[#7a5b67]"
          )}
        >
          Artboard Dimensions
        </span>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className={dark ? "text-zinc-300" : "text-[#2d1f24]"}>
            {dims.width} × {dims.height} px
          </span>
          <span className="text-label-2">Ratio: {ratio.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

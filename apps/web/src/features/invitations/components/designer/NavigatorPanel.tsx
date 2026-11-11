"use client";

import React from "react";
import { InvitationCard } from "../InvitationCard";
import { cn } from "@/lib/utils";
import type { InvitationDesign } from "../../types";
import { designDimensionsPx, designRatio } from "../../layer-ops";

interface NavigatorPanelProps {
  dark?: boolean;
  design: InvitationDesign;
  coupleName: string;
  viewport: { x: number; y: number; width: number; height: number };
  onNavigate: (x: number, y: number) => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  onResetView: () => void;
}

export function NavigatorPanel({
  dark,
  design,
  zoom,
  coupleName,
  viewport,
  onNavigate,
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
        <button
          type="button"
          aria-label="Navigator: click to centre the canvas"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onNavigate(
              e.detail === 0
                ? 0.5
                : Math.max(
                    0,
                    Math.min(1, (e.clientX - rect.left) / rect.width)
                  ),
              e.detail === 0
                ? 0.5
                : Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
            );
          }}
          onKeyDown={(e) => {
            const delta = {
              ArrowLeft: [-0.05, 0],
              ArrowRight: [0.05, 0],
              ArrowUp: [0, -0.05],
              ArrowDown: [0, 0.05],
            }[e.key];
            if (!delta) return;
            e.preventDefault();
            e.stopPropagation();
            onNavigate(
              Math.max(
                0,
                Math.min(1, viewport.x + viewport.width / 2 + delta[0])
              ),
              Math.max(
                0,
                Math.min(1, viewport.y + viewport.height / 2 + delta[1])
              )
            );
          }}
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
          <InvitationCard design={design} coupleName={coupleName} sampleEntry />
          <span
            data-testid="navigator-viewport"
            aria-hidden="true"
            className="pointer-events-none absolute border-2 border-gold bg-gold/10"
            style={{
              left: `${Math.max(0, viewport.x) * 100}%`,
              top: `${Math.max(0, viewport.y) * 100}%`,
              width: `${Math.max(0, Math.min(1, viewport.x + viewport.width) - Math.max(0, viewport.x)) * 100}%`,
              height: `${Math.max(0, Math.min(1, viewport.y + viewport.height) - Math.max(0, viewport.y)) * 100}%`,
            }}
          />
        </button>
      </div>

      {/* Zoom Control Slider & Presets */}
      <div className="space-y-2 rounded-xl border border-hairline bg-white/[0.04] p-3">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-semibold",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            Artboard Zoom
          </span>
          <span className="font-mono text-xs font-bold text-[var(--studio-gold)]">
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
            min={0.05}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-[var(--studio-gold)] focus:outline-none"
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
                "rounded-md py-1 text-center font-mono text-xs font-medium transition",
                Math.abs(zoom - z) < 0.05
                  ? dark
                    ? "bg-[var(--studio-gold)] text-[var(--studio-night)] font-bold"
                    : "bg-[var(--studio-wine)] text-white font-bold"
                  : dark
                    ? "bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12]"
                    : "bg-black/5 text-[var(--studio-ink)] hover:bg-black/10"
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
              ? "border-white/12 bg-white/[0.06] text-[var(--studio-cream)] hover:bg-white/[0.12]"
              : "border-[var(--studio-line)] bg-white text-[var(--studio-wine)] hover:bg-[#f6f2ec] shadow-xs"
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
            "text-xs uppercase font-semibold tracking-wide block",
            dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
          )}
        >
          Artboard Dimensions
        </span>
        <div className="flex items-center justify-between text-xs font-mono">
          <span className={dark ? "text-zinc-300" : "text-[var(--studio-ink)]"}>
            {dims.width} × {dims.height} px
          </span>
          <span className="text-label-2">Ratio: {ratio.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

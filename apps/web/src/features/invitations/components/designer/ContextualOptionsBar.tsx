"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  InvitationDesign,
  InvitationLayer,
  InvitationFont,
} from "../../types";
import { GRADIENT_PRESETS } from "./Inspector";
import { INVITATION_FONTS, INVITATION_FONT_LABELS } from "../../types";
import { designDimensionsPx } from "../../layer-ops";

export type StudioTool =
  | "select"
  | "crop"
  | "text"
  | "shape"
  | "pen"
  | "image"
  | "gradient"
  | "eyedropper"
  | "hand"
  | "zoom";

function CanvasDimensionInput({
  value,
  onValue,
  className,
  "aria-label": label,
}: {
  value: number;
  onValue: (value: number) => void;
  className: string;
  "aria-label": string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (!Number.isFinite(n) || !text.trim()) {
      setText(String(value));
      return;
    }
    const next = Math.max(200, Math.min(10000, Math.round(n)));
    setText(String(next));
    if (next !== value) onValue(next);
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setText(String(value));
      }}
      className={className}
    />
  );
}

/** Scroll-edge shadows with no script: covers scroll with the content, shadows stay fixed. */
function scrollEdges(bg: string, dark: boolean): React.CSSProperties {
  const shade = dark ? "rgba(255,255,255,0.22)" : "rgba(45,31,36,0.28)";
  return {
    backgroundImage: [
      `linear-gradient(to right, ${bg} 30%, transparent)`,
      `linear-gradient(to left, ${bg} 30%, transparent)`,
      `radial-gradient(farthest-side at 0 50%, ${shade}, transparent)`,
      `radial-gradient(farthest-side at 100% 50%, ${shade}, transparent)`,
    ].join(", "),
    backgroundRepeat: "no-repeat",
    backgroundPosition: "left center, right center, left center, right center",
    backgroundSize: "32px 100%, 32px 100%, 12px 100%, 12px 100%",
    backgroundAttachment: "local, local, scroll, scroll",
  };
}

export function ContextualOptionsBar({
  activeTool,
  onSelectTool,
  onApplyCrop,
  onCancelCrop,
  design,
  selectedLayer,
  selectedIds,
  onPatchLayer,
  onAlignSelection,
  onDistribute,
  onGroupSelection,
  onUngroupSelection: _onUngroupSelection,
  activeShapeKind = "rect",
  onSelectShapeKind,
  onAddLayer,
  onResizeCanvasPx,
  onResetView,
  zoom,
  onZoomChange,
  activeColor: _activeColor,
  onColorChange: _onColorChange,
  showRulers,
  onToggleRulers,
  showGrid,
  onToggleGrid,
  snapToGrid = false,
  onToggleSnapToGrid,
  dark = false,
}: {
  activeTool: StudioTool;
  onSelectTool: (tool: StudioTool) => void;
  onApplyCrop?: () => void;
  onCancelCrop?: () => void;
  design: InvitationDesign;
  selectedLayer: InvitationLayer | null;
  selectedIds: string[];
  onPatchLayer: (id: string, patch: Partial<InvitationLayer>) => void;
  onAlignSelection?: (
    ids: string[],
    how: "left" | "centre" | "right" | "top" | "middle" | "bottom"
  ) => void;
  onDistribute?: (ids: string[], horizontal: boolean) => void;
  onGroupSelection?: () => void;
  onUngroupSelection?: () => void;
  activeShapeKind?: "rect" | "ellipse" | "arch" | "line" | "star";
  onSelectShapeKind?: (
    kind: "rect" | "ellipse" | "arch" | "line" | "star"
  ) => void;
  onAddLayer: (
    kind: "text" | "rect" | "ellipse" | "arch" | "line" | "star"
  ) => void;
  onResizeCanvasPx?: (widthPx: number, heightPx: number) => void;
  onResetView: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  activeColor: string;
  onColorChange: (hex: string) => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
  dark?: boolean;
}) {
  const currentLayer = selectedLayer;

  return (
    <div
      role="toolbar"
      aria-label="Contextual Tool Options"
      className={cn(
        "flex h-10 w-full items-center gap-2 overflow-x-auto border-b px-3 text-xs select-none shadow-xs transition-colors",
        dark
          ? "border-[var(--studio-edge-dark)] bg-[var(--studio-surface-dark)] text-zinc-200"
          : "border-[var(--studio-line)] bg-[var(--studio-paper)] text-[var(--studio-ink-2)]"
      )}
      // A soft edge shows on a side only while there is more to scroll to in that direction.
      style={scrollEdges(
        dark ? "var(--studio-surface-dark)" : "var(--studio-paper)",
        dark
      )}
    >
      {/* Tool-Specific Controls */}

      {/* MOVE & ALIGN TOOL OPTIONS */}
      {activeTool === "select" && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "text-xs max-md:hidden",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            Align:
          </span>
          {(
            [
              { how: "left", label: "Align left", d: "M4 3v18M8 7h12M8 13h8" },
              {
                how: "centre",
                label: "Center horizontal",
                d: "M12 3v18M5 7h14M7 13h10",
              },
              {
                how: "right",
                label: "Align right",
                d: "M20 3v18M4 7h12M8 13h8",
              },
              { how: "top", label: "Align top", d: "M3 4h18M7 8v12M13 8v8" },
              {
                how: "middle",
                label: "Center vertical",
                d: "M3 12h18M7 5v14M13 7v10",
              },
              {
                how: "bottom",
                label: "Align bottom",
                d: "M3 20h18M7 4v12M13 8v8",
              },
            ] as const
          ).map((btn) => (
            <button
              key={btn.how}
              type="button"
              title={btn.label}
              aria-label={btn.label}
              disabled={!currentLayer && selectedIds.length < 2}
              onClick={() => {
                const targetIds =
                  selectedIds.length > 0
                    ? selectedIds
                    : currentLayer
                      ? [currentLayer.id]
                      : [];
                if (targetIds.length > 0) {
                  onAlignSelection?.(targetIds, btn.how);
                }
              }}
              className={cn(
                "grid h-7 w-7 place-items-center rounded disabled:opacity-30 transition-colors",
                dark
                  ? "text-zinc-300 hover:bg-white/10 hover:text-white"
                  : "text-[var(--studio-ink-3)] hover:bg-[var(--studio-wine)]/10 hover:text-[var(--studio-wine)]"
              )}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={btn.d} />
              </svg>
            </button>
          ))}

          <span
            aria-hidden="true"
            className={cn(
              "mx-1 h-4 w-px",
              dark ? "bg-white/15" : "bg-black/10"
            )}
          />
          <span
            className={cn(
              "text-xs max-md:hidden",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            Space evenly:
          </span>
          <button
            type="button"
            title="Space evenly, left to right"
            aria-label="Space evenly, left to right"
            disabled={selectedIds.length < 3}
            onClick={() => onDistribute?.(selectedIds, true)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded disabled:opacity-30 transition-colors",
              dark
                ? "text-zinc-300 hover:bg-white/10 hover:text-white"
                : "text-[var(--studio-ink-3)] hover:bg-[var(--studio-wine)]/10 hover:text-[var(--studio-wine)]"
            )}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="4" y="5" width="4" height="14" rx="1" />
              <rect x="16" y="5" width="4" height="14" rx="1" />
              <line x1="12" y1="2" x2="12" y2="22" strokeDasharray="2 2" />
            </svg>
          </button>
          <button
            type="button"
            title="Space evenly, top to bottom"
            aria-label="Space evenly, top to bottom"
            disabled={selectedIds.length < 3}
            onClick={() => onDistribute?.(selectedIds, false)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded disabled:opacity-30 transition-colors",
              dark
                ? "text-zinc-300 hover:bg-white/10 hover:text-white"
                : "text-[var(--studio-ink-3)] hover:bg-[var(--studio-wine)]/10 hover:text-[var(--studio-wine)]"
            )}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="5" y="4" width="14" height="4" rx="1" />
              <rect x="5" y="16" width="14" height="4" rx="1" />
              <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2 2" />
            </svg>
          </button>

          {selectedIds.length >= 2 && (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "mx-1 h-4 w-px",
                  dark ? "bg-white/15" : "bg-black/10"
                )}
              />
              <button
                type="button"
                title="Group Selected Layers (Cmd+G)"
                onClick={onGroupSelection}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold transition-colors",
                  dark
                    ? "bg-white/[0.08] text-[var(--studio-cream)] hover:bg-white/[0.14]"
                    : "bg-[var(--studio-wine)]/10 text-[var(--studio-wine)] hover:bg-[var(--studio-wine)]/15"
                )}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Group</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* CROP & ARTBOARD TOOL OPTIONS */}
      {activeTool === "crop" && (
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-xs font-semibold",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            Ratio:
          </span>
          <select
            aria-label="Canvas size preset"
            onChange={(e) => {
              const val = e.target.value;
              if (val === "portrait") onResizeCanvasPx?.(1080, 1512);
              else if (val === "standard") onResizeCanvasPx?.(1080, 1350);
              else if (val === "square") onResizeCanvasPx?.(1080, 1080);
              else if (val === "story") onResizeCanvasPx?.(1080, 1920);
              else if (val === "landscape") onResizeCanvasPx?.(1512, 1080);
              else if (val === "a5") onResizeCanvasPx?.(1200, 1700);
            }}
            className={cn(
              "h-7 rounded border px-2 text-xs outline-none transition-colors",
              dark
                ? "border-white/15 bg-white/[0.06] text-[var(--studio-cream)] focus:border-[var(--studio-gold)]"
                : "border-[var(--studio-line)] bg-white text-[var(--studio-ink)] focus:border-[var(--studio-wine)]"
            )}
          >
            <option
              value="portrait"
              className={
                dark
                  ? "bg-[var(--studio-surface-dark)] text-[var(--studio-cream)]"
                  : "bg-white text-[var(--studio-ink)]"
              }
            >
              Portrait 5:7 (1080 × 1512)
            </option>
            <option
              value="standard"
              className={
                dark
                  ? "bg-[var(--studio-surface-dark)] text-[var(--studio-cream)]"
                  : "bg-white text-[var(--studio-ink)]"
              }
            >
              Standard 4:5 (1080 × 1350)
            </option>
            <option
              value="square"
              className={
                dark
                  ? "bg-[var(--studio-surface-dark)] text-[var(--studio-cream)]"
                  : "bg-white text-[var(--studio-ink)]"
              }
            >
              Square 1:1 (1080 × 1080)
            </option>
            <option
              value="story"
              className={
                dark
                  ? "bg-[var(--studio-surface-dark)] text-[var(--studio-cream)]"
                  : "bg-white text-[var(--studio-ink)]"
              }
            >
              Story 9:16 (1080 × 1920)
            </option>
            <option
              value="landscape"
              className={
                dark
                  ? "bg-[var(--studio-surface-dark)] text-[var(--studio-cream)]"
                  : "bg-white text-[var(--studio-ink)]"
              }
            >
              Landscape 7:5 (1512 × 1080)
            </option>
            <option
              value="a5"
              className={
                dark
                  ? "bg-[var(--studio-surface-dark)] text-[var(--studio-cream)]"
                  : "bg-white text-[var(--studio-ink)]"
              }
            >
              A5 Fine Art (1200 × 1700)
            </option>
          </select>

          <div className="flex items-center gap-1">
            <span
              className={cn(
                "text-xs",
                dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
              )}
            >
              W:
            </span>
            <CanvasDimensionInput
              aria-label="Canvas width"
              value={designDimensionsPx(design).width}
              onValue={(value) => {
                const w = Math.max(200, Math.min(10000, value));
                onResizeCanvasPx?.(w, designDimensionsPx(design).height);
              }}
              className={cn(
                "h-7 w-16 rounded border px-1.5 font-mono text-xs outline-none",
                dark
                  ? "border-white/15 bg-white/[0.06] text-[var(--studio-cream)] focus:border-[var(--studio-gold)]"
                  : "border-[var(--studio-line)] bg-white text-[var(--studio-ink)] focus:border-[var(--studio-wine)]"
              )}
            />
            <span
              className={cn(
                "text-xs",
                dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
              )}
            >
              H:
            </span>
            <CanvasDimensionInput
              aria-label="Canvas height"
              value={designDimensionsPx(design).height}
              onValue={(value) => {
                const h = Math.max(200, Math.min(10000, value));
                onResizeCanvasPx?.(designDimensionsPx(design).width, h);
              }}
              className={cn(
                "h-7 w-16 rounded border px-1.5 font-mono text-xs outline-none",
                dark
                  ? "border-white/15 bg-white/[0.06] text-[var(--studio-cream)] focus:border-[var(--studio-gold)]"
                  : "border-[var(--studio-line)] bg-white text-[var(--studio-ink)] focus:border-[var(--studio-wine)]"
              )}
            />
          </div>

          <button
            type="button"
            title="Apply canvas size (Enter)"
            onClick={() =>
              onApplyCrop ? onApplyCrop() : onSelectTool("select")
            }
            className="flex items-center gap-1 rounded bg-[var(--studio-gold)] px-2.5 py-1 text-xs font-bold text-[var(--studio-night)] hover:bg-[var(--studio-gold-hover)] transition-colors shadow-xs"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Apply</span>
          </button>

          <button
            type="button"
            title="Cancel canvas resize (Esc)"
            onClick={() =>
              onCancelCrop ? onCancelCrop() : onSelectTool("select")
            }
            className={cn(
              "flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors",
              dark
                ? "border-white/12 bg-white/[0.06] text-zinc-300 hover:text-white"
                : "border-[var(--studio-line)] bg-white text-[var(--studio-wine)] hover:bg-[var(--studio-sand)]"
            )}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* TYPOGRAPHY TOOL OPTIONS */}
      {activeTool === "text" && (
        <div className="flex items-center gap-2 shrink-0">
          {/* Font Family */}
          <select
            aria-label="Font family"
            value={currentLayer?.font ?? "Playfair Display"}
            onChange={(e) => {
              if (currentLayer) {
                onPatchLayer(currentLayer.id, {
                  font: e.target.value as InvitationFont,
                });
              }
            }}
            className={cn(
              "h-7 rounded border px-2 text-xs outline-none transition-colors",
              dark
                ? "border-white/15 bg-white/[0.06] text-[var(--studio-cream)] focus:border-[var(--studio-gold)]"
                : "border-[var(--studio-line)] bg-white text-[var(--studio-ink)] focus:border-[var(--studio-wine)]"
            )}
          >
            {INVITATION_FONTS.map((f) => (
              <option key={f} value={f}>
                {INVITATION_FONT_LABELS[f]}
              </option>
            ))}
          </select>

          {/* Font Size */}
          <select
            aria-label="Font size"
            value={currentLayer?.size ?? 24}
            onChange={(e) => {
              if (currentLayer) {
                onPatchLayer(currentLayer.id, { size: Number(e.target.value) });
              }
            }}
            className={cn(
              "h-7 rounded border px-1.5 text-xs outline-none transition-colors",
              dark
                ? "border-white/15 bg-white/[0.06] text-[var(--studio-cream)] focus:border-[var(--studio-gold)]"
                : "border-[var(--studio-line)] bg-white text-[var(--studio-ink)] focus:border-[var(--studio-wine)]"
            )}
          >
            {[12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72].map(
              (s) => (
                <option
                  key={s}
                  value={s}
                  className={
                    dark
                      ? "bg-[var(--studio-surface-dark)] text-[var(--studio-cream)]"
                      : "bg-white text-[var(--studio-ink)]"
                  }
                >
                  {s} pt
                </option>
              )
            )}
          </select>

          {/* Alignment */}
          <div
            className={cn(
              "flex items-center rounded border p-0.5",
              dark
                ? "border-white/10 bg-white/[0.05]"
                : "border-[var(--studio-line)] bg-white"
            )}
          >
            {(
              [
                { align: "left", label: "Left" },
                { align: "center", label: "Center" },
                { align: "right", label: "Right" },
              ] as const
            ).map((item) => (
              <button
                key={item.align}
                type="button"
                title={`Align ${item.label}`}
                onClick={() => {
                  if (currentLayer) {
                    onPatchLayer(currentLayer.id, { align: item.align });
                  }
                }}
                className={cn(
                  "grid h-6 w-6 place-items-center rounded text-xs transition-colors",
                  (currentLayer?.align ?? "center") === item.align
                    ? dark
                      ? "bg-[var(--studio-active-dark)] text-[var(--studio-gold)]"
                      : "bg-[var(--studio-wine)]/10 text-[var(--studio-wine)] font-semibold"
                    : dark
                      ? "text-zinc-400 hover:text-white"
                      : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)]"
                )}
              >
                {item.align === "left" && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="15" y2="12" />
                    <line x1="3" y1="18" x2="18" y2="18" />
                  </svg>
                )}
                {item.align === "center" && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </svg>
                )}
                {item.align === "right" && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="9" y1="12" x2="21" y2="12" />
                    <line x1="6" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Quick Add Text */}
          <button
            type="button"
            onClick={() => onAddLayer("text")}
            className={cn(
              "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors",
              dark
                ? "bg-[var(--studio-gold)] text-[var(--studio-ink)] hover:bg-[var(--studio-gold-hover)]"
                : "bg-[var(--studio-wine)] text-white hover:bg-[var(--studio-wine-2)]"
            )}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Text Box</span>
          </button>
        </div>
      )}

      {/* SHAPES TOOL OPTIONS */}
      {activeTool === "shape" && (
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-xs max-sm:hidden",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            Add:
          </span>
          {(
            [
              { kind: "rect", label: "Rectangle" },
              { kind: "ellipse", label: "Circle" },
              { kind: "arch", label: "Cathedral Arch" },
              { kind: "line", label: "Line" },
              { kind: "star", label: "Star" },
            ] as const
          ).map((s) => {
            const isSelected = activeShapeKind === s.kind;
            return (
              <div key={s.kind} className="inline-flex items-center">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  title={`Draw ${s.label}; hold Shift for equal sides, Alt to draw from the centre, Escape to cancel`}
                  onClick={() => onSelectShapeKind?.(s.kind)}
                  className={cn(
                    "rounded-l border-y border-l px-2.5 py-1 text-xs font-medium transition-all",
                    isSelected
                      ? dark
                        ? "border-[var(--studio-gold)] bg-[var(--studio-gold)]/20 text-[var(--studio-gold)] shadow-xs font-bold"
                        : "border-[var(--studio-wine)] bg-[var(--studio-wine)]/10 text-[var(--studio-wine)] font-bold"
                      : dark
                        ? "border-white/10 bg-white/[0.06] text-[var(--studio-cream)] hover:border-[var(--studio-gold)]/50 hover:text-[var(--studio-gold)]"
                        : "border-[var(--studio-line)] bg-white text-[var(--studio-ink-2)] hover:border-[var(--studio-wine)]/50 hover:text-[var(--studio-wine)]"
                  )}
                >
                  {s.label}
                </button>
                <button
                  type="button"
                  title={`Insert ${s.label} immediately`}
                  aria-label={`Insert ${s.label}`}
                  onClick={() => onAddLayer(s.kind)}
                  className={cn(
                    "rounded-r border px-1.5 py-1 text-xs font-bold transition-colors",
                    dark
                      ? "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-[var(--studio-gold)]/25 hover:text-[var(--studio-gold)]"
                      : "border-[var(--studio-line)] bg-white/80 text-[var(--studio-mauve)] hover:bg-[var(--studio-wine)]/10 hover:text-[var(--studio-wine)]"
                  )}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* GRADIENT TOOL OPTIONS */}
      {activeTool === "gradient" && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              "text-xs max-sm:hidden",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            Presets:
          </span>
          {GRADIENT_PRESETS.slice(0, 5).map((preset) => (
            <button
              key={preset.name}
              type="button"
              title={preset.name}
              onClick={() => {
                if (currentLayer) {
                  onPatchLayer(currentLayer.id, {
                    gradient: preset.value,
                    fill: undefined,
                  });
                }
              }}
              className={cn(
                "flex items-center gap-1 rounded border px-2 py-0.5 text-xs transition-colors",
                dark
                  ? "border-white/15 bg-white/[0.06] text-[var(--studio-cream)] hover:border-white/40 hover:text-white"
                  : "border-[var(--studio-line)] bg-white text-[var(--studio-ink-2)] hover:border-[var(--studio-wine)]/40 hover:text-[var(--studio-wine)]"
              )}
            >
              <span
                className="h-3 w-3 rounded-full border border-white/20"
                style={{ background: preset.value }}
              />
              <span className="max-md:hidden">{preset.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* HAND / PAN TOOL OPTIONS */}
      {activeTool === "hand" && (
        <div
          className={cn(
            "flex items-center gap-2 shrink-0",
            dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
          )}
        >
          <span>
            Click and drag on the artboard to pan. Hold Space anywhere to
            quick-pan.
          </span>
          <button
            type="button"
            onClick={onResetView}
            className={cn(
              "rounded border px-2.5 py-1 text-xs font-medium transition-colors",
              dark
                ? "border-white/15 bg-white/[0.06] text-[var(--studio-cream)] hover:bg-white/12"
                : "border-[var(--studio-line)] bg-white text-[var(--studio-ink-2)] hover:bg-[var(--studio-wine)]/5"
            )}
          >
            Reset View
          </button>
        </div>
      )}

      {/* ZOOM TOOL OPTIONS */}
      {activeTool === "zoom" && (
        <div className="flex items-center gap-1.5 shrink-0">
          {[0.25, 0.5, 1, 2, 4].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => onZoomChange(z)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                zoom === z
                  ? dark
                    ? "bg-[var(--studio-active-dark)] text-[var(--studio-gold)] font-semibold"
                    : "bg-[var(--studio-wine)]/10 text-[var(--studio-wine)] font-semibold"
                  : dark
                    ? "text-zinc-400 hover:text-white"
                    : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)]"
              )}
            >
              {Math.round(z * 100)}%
            </button>
          ))}
          <button
            type="button"
            onClick={onResetView}
            className={cn(
              "rounded border px-2 py-1 text-xs font-medium transition-colors",
              dark
                ? "border-white/15 bg-white/[0.06] text-[var(--studio-cream)] hover:bg-white/12"
                : "border-[var(--studio-line)] bg-white text-[var(--studio-ink-2)] hover:bg-[var(--studio-wine)]/5"
            )}
          >
            Fit Screen
          </button>
        </div>
      )}

      {/* Spacer to push view toggles to the right */}
      <div className="flex-1" />

      {/* Workspace Display Aids: Rulers & Grid */}
      <div
        className={cn(
          "flex items-center gap-1 border-l pl-2 shrink-0",
          dark ? "border-white/10" : "border-black/10"
        )}
      >
        <button
          type="button"
          onClick={onToggleRulers}
          aria-pressed={showRulers}
          title="Toggle Canvas Rulers"
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            showRulers
              ? dark
                ? "bg-[var(--studio-active-dark)] text-[var(--studio-gold)]"
                : "bg-[var(--studio-wine)]/10 text-[var(--studio-wine)] font-semibold"
              : dark
                ? "text-zinc-400 hover:text-white"
                : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)]"
          )}
        >
          Rulers
        </button>
        <button
          type="button"
          onClick={onToggleGrid}
          aria-pressed={showGrid}
          title="Toggle Alignment Grid"
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            showGrid
              ? dark
                ? "bg-[var(--studio-active-dark)] text-[var(--studio-gold)]"
                : "bg-[var(--studio-wine)]/10 text-[var(--studio-wine)] font-semibold"
              : dark
                ? "text-zinc-400 hover:text-white"
                : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)]"
          )}
        >
          Grid
        </button>
        <button
          type="button"
          onClick={onToggleSnapToGrid}
          aria-label="Snap to grid"
          aria-pressed={snapToGrid}
          title="Snap movement to the 100 px grid; hold Alt to suspend"
          className={cn(
            "rounded px-2 py-1 text-xs font-medium",
            snapToGrid
              ? "bg-burgundy text-white"
              : "text-label-2 hover:bg-burgundy/10"
          )}
        >
          Snap
        </button>
      </div>
    </div>
  );
}

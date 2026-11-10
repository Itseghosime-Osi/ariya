"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  Section,
  Segmented,
  Swatches,
  Toggle,
} from "@/features/seating/hall/studio-ui";
import { applyInvitationTheme } from "../../design";
import {
  CANVAS_PRESETS,
  designDimensionsPx,
  designRatio,
  resizeCanvasPx,
  setPaperEdge,
  type Alignment,
  type StackMove,
} from "../../layer-ops";
import {
  INVITATION_FONTS,
  INVITATION_FONT_LABELS,
  INVITATION_LAYER_LABELS,
  INVITATION_THEME_LABELS,
  INVITATION_THEMES,
  INVITATION_SHAPES,
  INVITATION_SHAPE_LABELS,
  type InvitationColorRole,
  type InvitationDesign,
  type InvitationFont,
  type InvitationLayer,
  type InvitationShape,
  type PaperEdge,
} from "../../types";
import { THEME_PALETTES } from "../../design";
import {
  LAYOUT_PRESETS,
  LUXURY_FOIL_PALETTE,
  applyLayoutPreset,
} from "../../presets";

export const BLEND_MODES = [
  { value: "normal", label: "Normal" },
  { value: "multiply", label: "Multiply" },
  { value: "screen", label: "Screen" },
  { value: "overlay", label: "Overlay" },
  { value: "darken", label: "Darken" },
  { value: "lighten", label: "Lighten" },
  { value: "color-dodge", label: "Color Dodge" },
  { value: "color-burn", label: "Color Burn" },
  { value: "hard-light", label: "Hard Light" },
  { value: "soft-light", label: "Soft Light" },
  { value: "difference", label: "Difference" },
  { value: "exclusion", label: "Exclusion" },
] as const;

export const GRADIENT_PRESETS = [
  {
    name: "Royal Gold",
    value: "linear-gradient(135deg, #dfba73 0%, #f7e7c4 50%, #b8864b 100%)",
  },
  {
    name: "Emerald Regal",
    value: "linear-gradient(135deg, #0d3824 0%, #1a563a 50%, #082115 100%)",
  },
  {
    name: "Sunset Rosé",
    value: "linear-gradient(135deg, #d4787a 0%, #f7d6d7 50%, #a84b4e 100%)",
  },
  {
    name: "Midnight Silk",
    value: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%)",
  },
  {
    name: "Warm Silk",
    value: "linear-gradient(135deg, #fdfbf7 0%, #f3eee3 50%, #e2d7c3 100%)",
  },
  {
    name: "Golden Halo",
    value: "radial-gradient(circle, #dfba73 0%, rgba(223,186,115,0) 70%)",
  },
] as const;

type Patch = Partial<InvitationLayer>;

const fieldClass = (dark?: boolean) =>
  cn(
    "min-h-10 w-full rounded-lg border px-3 text-xs outline-none transition-colors",
    dark
      ? "border-white/15 bg-white/[0.06] text-[#fff6dc] placeholder-zinc-400 focus:border-[#dfba73] focus:ring-1 focus:ring-[#dfba73] focus:bg-white/[0.09]"
      : "border-[#e8e2d6] bg-white text-[#2d1f24] placeholder-[#a6929a] focus:border-[#4a0e17] focus:ring-1 focus:ring-[#4a0e17] shadow-xs"
  );

/** A number that commits on Enter or when you leave it, so typing "12" never passes through "1". */
function Num({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
  dark,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
  dark?: boolean;
}) {
  const shown = String(Math.round(value * 100) / 100);
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  const commit = () => {
    const n = Number(text.replace(",", "."));
    if (!Number.isFinite(n)) return setText(shown);
    const next = Math.min(max, Math.max(min, n));
    setText(String(next));
    if (next !== value) onChange(next);
  };
  return (
    <label className="block">
      <span
        className={cn(
          "mb-1 block text-[11px] font-semibold",
          dark ? "text-zinc-400" : "text-[#7a5b67]"
        )}
      >
        {label}
      </span>
      <span className="relative block">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          aria-label={label}
          data-step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") commit();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const n = Number(text) + (e.key === "ArrowUp" ? step : -step);
              const next = Math.min(max, Math.max(min, n));
              setText(String(Math.round(next * 100) / 100));
              onChange(next);
            }
          }}
          className={cn(fieldClass(dark), suffix && "pr-8 font-mono")}
        />
        {suffix && (
          <span
            className={cn(
              "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono",
              dark ? "text-zinc-500" : "text-[#9e838f]"
            )}
          >
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function HexColorInput({
  label,
  value,
  onChange,
  allowNone,
  dark,
}: {
  label: string;
  value: string | null;
  onChange: (c: string | null) => void;
  allowNone?: boolean;
  dark?: boolean;
}) {
  const [hexText, setHexText] = useState(value ?? "");

  useEffect(() => {
    setHexText(value ?? "");
  }, [value]);

  const commitHex = (val: string) => {
    let clean = val.trim();
    if (!clean) {
      if (allowNone) onChange(null);
      return;
    }
    if (!clean.startsWith("#")) clean = "#" + clean;
    if (/^#[0-9a-fA-F]{3,8}$/.test(clean)) {
      onChange(clean);
    }
  };

  return (
    <div className="space-y-2.5">
      <div>
        <p
          className={cn(
            "mb-1 text-[11px] font-semibold",
            dark ? "text-zinc-400" : "text-[#7a5b67]"
          )}
        >
          Luxury Metallic Foils
        </p>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Metallic Foils"
        >
          {LUXURY_FOIL_PALETTE.map((foil) => (
            <button
              key={foil.hex}
              type="button"
              title={foil.label}
              aria-label={foil.label}
              aria-pressed={value?.toLowerCase() === foil.hex.toLowerCase()}
              onClick={() => onChange(foil.hex)}
              className="h-7 w-7 rounded-full border border-black/15 shadow-sm transition-transform hover:scale-110 aria-pressed:ring-2 aria-pressed:ring-night aria-pressed:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              style={{ background: foil.hex }}
            />
          ))}
        </div>
      </div>

      <Swatches
        label={label}
        allowNone={allowNone}
        value={value}
        onPick={onChange}
      />

      <div className="flex items-center gap-2 pt-0.5">
        <div
          className="h-8 w-8 shrink-0 rounded-lg border border-black/15 shadow-inner"
          style={{ background: value || "transparent" }}
        />
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="#B8864B"
            aria-label={`${label} hex code`}
            value={hexText}
            onChange={(e) => setHexText(e.target.value)}
            onBlur={(e) => commitHex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitHex((e.target as HTMLInputElement).value);
              }
            }}
            className={cn(
              "h-9 w-full rounded-lg border px-2.5 font-mono text-xs uppercase outline-none transition-colors",
              dark
                ? "border-white/15 bg-white/[0.06] text-[#fff6dc] focus:border-[#dfba73] focus:ring-1 focus:ring-[#dfba73] focus:bg-white/[0.09]"
                : "border-[#e8e2d6] bg-white text-[#2d1f24] focus:border-[#4a0e17] focus:ring-1 focus:ring-[#4a0e17]"
            )}
          />
        </div>
        {typeof window !== "undefined" && "EyeDropper" in window && (
          <button
            type="button"
            title="Pick color from artboard / screen (Eyedropper)"
            aria-label="Pick color with eyedropper"
            onClick={async () => {
              try {
                // @ts-expect-error EyeDropper is a standard Web API in modern browsers
                const eye = new window.EyeDropper();
                const res = await eye.open();
                if (res?.sRGBHex) {
                  onChange(res.sRGBHex.toLowerCase());
                }
              } catch {
                // user aborted
              }
            }}
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-lg border transition-colors",
              dark
                ? "border-white/12 bg-white/[0.06] text-zinc-300 hover:bg-white/[0.12] hover:text-white"
                : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec]"
            )}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m14 2 6 6-9.5 9.5a3 3 0 0 1-1.5.8L4 20l1.7-5a3 3 0 0 1 .8-1.5L16 4Z" />
              <path d="m17 5 2 2" />
            </svg>
          </button>
        )}
        {value && allowNone && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={cn(
              "text-[11px] font-medium transition-colors",
              dark
                ? "text-zinc-400 hover:text-[#dfba73]"
                : "text-[#7a5b67] hover:text-[#4a0e17]"
            )}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  dark,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-lg border disabled:opacity-25 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
        dark
          ? "border-white/12 bg-white/[0.06] text-zinc-200 hover:bg-white/[0.12] hover:text-white focus-visible:outline-[#dfba73]"
          : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] hover:text-[#2d1f24] focus-visible:outline-[#4a0e17] shadow-xs"
      )}
    >
      {children}
    </button>
  );
}

const ALIGN: { key: Alignment; label: string; d: string }[] = [
  { key: "left", label: "Align left", d: "M3 3v18M7 7h12M7 13h7" },
  { key: "centre", label: "Centre across", d: "M12 3v18M5 7h14M8 13h8" },
  { key: "right", label: "Align right", d: "M21 3v18M5 7h12M10 13h7" },
  { key: "top", label: "Align top", d: "M3 3h18M7 7v12M13 7v7" },
  { key: "middle", label: "Centre down", d: "M3 12h18M7 5v14M13 8v8" },
  { key: "bottom", label: "Align bottom", d: "M3 21h18M7 5v12M13 10v7" },
];

const ROLES: { value: InvitationColorRole; label: string }[] = [
  { value: "title", label: "Names" },
  { value: "ink", label: "Ink" },
  { value: "body", label: "Body" },
  { value: "accent", label: "Eyebrow" },
  { value: "foil", label: "Foil" },
];

const TEXT_KINDS: InvitationLayer["kind"][] = [
  "kicker",
  "names",
  "message",
  "date",
  "venue",
  "dressCode",
  "footer",
  "text",
];

export function Inspector({
  design,
  layer,
  selectedIds,
  onPatch,
  onDesign,
  onAlign,
  onAlignSelection,
  onDistribute,
  onGroup,
  onUngroup,
  onDeleteBatch,
  onStack,
  onDuplicate,
  onDelete,
  canDelete,
  onPickImage,
  onUploadBackground,
  onExport,
  onImportFile,
  dark = false,
}: {
  design: InvitationDesign;
  layer: InvitationLayer | null;
  selectedIds?: string[];
  onPatch: (id: string, patch: Patch) => void;
  onDesign: (next: (d: InvitationDesign) => InvitationDesign) => void;
  onAlign: (id: string, how: Alignment) => void;
  onAlignSelection?: (ids: string[], how: Alignment) => void;
  onDistribute?: (ids: string[], horizontal: boolean) => void;
  onGroup?: (ids: string[]) => void;
  onUngroup?: (ids: string[]) => void;
  onDeleteBatch?: (ids: string[]) => void;
  onStack: (id: string, move: StackMove) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: (layer: InvitationLayer) => boolean;
  /** Opens the file picker to choose (or replace) the picture for a layer. */
  onPickImage: (forLayerId: string) => void;
  onUploadBackground: () => void;
  onExport: () => void;
  onImportFile: (file: File) => void;
  dark?: boolean;
}) {
  const [unit, setUnit] = useState<"px" | "%">("px");
  const aspectLocked = layer?.aspectLocked ?? layer?.kind === "image";
  const [unlinkCorners, setUnlinkCorners] = useState(
    Boolean(
      layer?.radiusTL != null ||
      layer?.radiusTR != null ||
      layer?.radiusBR != null ||
      layer?.radiusBL != null
    )
  );
  const [fillMode, setFillMode] = useState<"solid" | "gradient" | "none">(
    layer?.gradient ? "gradient" : layer?.fill ? "solid" : "none"
  );

  useEffect(() => {
    setUnlinkCorners(
      Boolean(
        layer?.radiusTL != null ||
        layer?.radiusTR != null ||
        layer?.radiusBR != null ||
        layer?.radiusBL != null
      )
    );
    setFillMode(layer?.gradient ? "gradient" : layer?.fill ? "solid" : "none");
  }, [
    layer?.id,
    layer?.gradient,
    layer?.fill,
    layer?.radiusTL,
    layer?.radiusTR,
    layer?.radiusBR,
    layer?.radiusBL,
  ]);

  if (selectedIds && selectedIds.length >= 2) {
    const selectedLayers = design.layers.filter((l) =>
      selectedIds.includes(l.id)
    );
    const isGrouped = selectedLayers.some((l) => Boolean(l.groupId));

    return (
      <div data-testid="inspector-multiselect">
        <Section
          dark={dark}
          title={`Selection (${selectedLayers.length} layers)`}
        >
          <div className="space-y-3">
            <p className="text-xs text-label-2 leading-relaxed">
              Align or distribute {selectedLayers.length} layers together
              relative to their boundary.
            </p>

            <div className="flex flex-wrap gap-2">
              {isGrouped ? (
                <button
                  type="button"
                  onClick={() => onUngroup?.(selectedIds)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition",
                    dark
                      ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
                      : "border-hairline bg-white/60 text-night hover:bg-white"
                  )}
                >
                  <Icon name="layers" size={14} />
                  Ungroup (<kbd className="font-mono text-[10px]">⌘⇧G</kbd>)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onGroup?.(selectedIds)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition",
                    dark
                      ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
                      : "border-hairline bg-white/60 text-night hover:bg-white"
                  )}
                >
                  <Icon name="layers" size={14} />
                  Group (<kbd className="font-mono text-[10px]">⌘G</kbd>)
                </button>
              )}

              <button
                type="button"
                onClick={() => onDeleteBatch?.(selectedIds)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3.5 text-xs font-semibold text-red-600 transition hover:bg-red-500/20"
              >
                <Icon name="delete" size={14} />
                Delete Selected
              </button>
            </div>
          </div>
        </Section>

        <Section dark={dark} title="Align Selection">
          <div className="grid grid-cols-3 gap-2">
            {[
              { how: "left" as const, label: "Left" },
              { how: "centre" as const, label: "Center" },
              { how: "right" as const, label: "Right" },
              { how: "top" as const, label: "Top" },
              { how: "middle" as const, label: "Middle" },
              { how: "bottom" as const, label: "Bottom" },
            ].map((btn) => (
              <button
                key={btn.how}
                type="button"
                onClick={() => onAlignSelection?.(selectedIds, btn.how)}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center rounded-xl border px-2 py-1.5 text-xs font-medium transition",
                  dark
                    ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
                    : "border-hairline bg-white/60 text-night hover:bg-white"
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </Section>

        {selectedLayers.length >= 3 && (
          <Section dark={dark} title="Distribute Spacing">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDistribute?.(selectedIds, false)}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                  dark
                    ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
                    : "border-hairline bg-white/60 text-night hover:bg-white"
                )}
              >
                Distribute Vertically
              </button>
              <button
                type="button"
                onClick={() => onDistribute?.(selectedIds, true)}
                className={cn(
                  "inline-flex min-h-10 items-center justify-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                  dark
                    ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
                    : "border-hairline bg-white/60 text-night hover:bg-white"
                )}
              >
                Distribute Horizontally
              </button>
            </div>
          </Section>
        )}

        <Section dark={dark} title="Layers in Selection">
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {selectedLayers.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2 text-xs",
                  dark
                    ? "border-white/10 bg-white/[0.04] text-[#fff6dc]"
                    : "border-hairline bg-white/40 text-night"
                )}
              >
                <span
                  className={cn(
                    "font-semibold truncate",
                    dark ? "text-[#fff6dc]" : "text-night"
                  )}
                >
                  {l.name || l.kind}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    dark ? "text-zinc-400" : "text-label-2"
                  )}
                >
                  {Math.round(l.x)}%, {Math.round(l.y)}%
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  if (!layer) {
    const _ratio = designRatio(design);
    const dims = designDimensionsPx(design);
    const edgeStyle = design.canvas?.edgeStyle ?? "sharp";
    const cornerRadiusPx = design.canvas?.cornerRadiusPx ?? 0;
    const bg = design.background;
    return (
      <div data-testid="inspector-card">
        <div className="px-4 pt-4 pb-2">
          <p className="font-serif text-lg text-night">
            Your invitation is ready to edit
          </p>
          <p className="mt-1 text-xs leading-relaxed text-label-2">
            Select text, a shape or a picture on the card to personalise it.
            Your template already includes its size and paper.
          </p>
        </div>
        <details className="mx-3 my-3 rounded-2xl border border-hairline">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-night">
            Document settings{" "}
            <span className="font-normal text-label-2">· optional</span>
          </summary>
          <Section dark={dark} title="Invitation size">
            <div className="grid grid-cols-2 gap-2">
              {CANVAS_PRESETS.map((p) => {
                const on =
                  Math.abs(p.widthPx - dims.width) <= 4 &&
                  Math.abs(p.heightPx - dims.height) <= 4;
                return (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      onDesign((d) => resizeCanvasPx(d, p.widthPx, p.heightPx))
                    }
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      on
                        ? dark
                          ? "border-[#dfba73] bg-[#dfba73]/15 text-[#dfba73] shadow-xs ring-1 ring-[#dfba73]/40"
                          : "border-[#4a0e17] bg-[#4a0e17]/10 text-[#4a0e17] shadow-xs"
                        : dark
                          ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-[#fff6dc]"
                          : "border-[#e8e2d6] bg-white hover:bg-[#f6f2ec] text-[#2d1f24]"
                    )}
                  >
                    <span
                      className={cn(
                        "block text-xs font-semibold",
                        on
                          ? dark
                            ? "text-[#dfba73]"
                            : "text-[#4a0e17]"
                          : dark
                            ? "text-zinc-100"
                            : "text-[#2d1f24]"
                      )}
                    >
                      {p.label}
                    </span>
                    <span
                      className={cn(
                        "block text-[10px]",
                        on
                          ? dark
                            ? "text-[#dfba73]/80"
                            : "text-[#4a0e17]/80"
                          : dark
                            ? "text-zinc-400"
                            : "text-[#7a5b67]"
                      )}
                    >
                      {p.note}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              className={cn(
                "mt-3 rounded-lg border p-2.5 transition-colors",
                dark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-[#e8e2d6] bg-[#f8f6f2]"
              )}
            >
              <span
                className={cn(
                  "mb-2 block text-[10px] font-semibold uppercase tracking-wider",
                  dark ? "text-zinc-400" : "text-[#7a5b67]"
                )}
              >
                Exact Size (px)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Num
                  dark={dark}
                  label="Width"
                  suffix="px"
                  value={dims.width}
                  min={200}
                  max={5000}
                  step={10}
                  onChange={(w) =>
                    onDesign((d) => resizeCanvasPx(d, w, dims.height))
                  }
                />
                <Num
                  dark={dark}
                  label="Height"
                  suffix="px"
                  value={dims.height}
                  min={200}
                  max={5000}
                  step={10}
                  onChange={(h) =>
                    onDesign((d) => resizeCanvasPx(d, dims.width, h))
                  }
                />
              </div>
            </div>
          </Section>

          <Section dark={dark} title="Paper & edges">
            <Segmented
              dark={dark}
              label="Paper edge style"
              value={edgeStyle}
              options={[
                { key: "sharp", label: "Sharp paper" },
                { key: "rounded", label: "Rounded" },
                { key: "deckled", label: "Deckled" },
              ]}
              onPick={(edge) =>
                onDesign((d) =>
                  setPaperEdge(d, edge as PaperEdge, cornerRadiusPx)
                )
              }
            />
            {edgeStyle === "rounded" && (
              <div className="mt-3">
                <Num
                  dark={dark}
                  label="Corner radius"
                  suffix="px"
                  value={cornerRadiusPx || 16}
                  min={0}
                  max={120}
                  step={2}
                  onChange={(r) =>
                    onDesign((d) => setPaperEdge(d, "rounded", r))
                  }
                />
              </div>
            )}
            <p
              className={cn(
                "mt-2 text-[12px] leading-relaxed",
                dark ? "text-zinc-400" : "text-label-2"
              )}
            >
              {edgeStyle === "sharp" && "Straight invitation edges."}
              {edgeStyle === "rounded" && "Rounded invitation corners."}
              {edgeStyle === "deckled" && "A decorative torn-paper edge."}
            </p>
          </Section>
        </details>

        <Section dark={dark} title="Background">
          <Segmented
            dark={dark}
            label="Background"
            value={bg.kind}
            options={[
              { key: "paper", label: "Paper" },
              { key: "velvet", label: "Velvet" },
              { key: "color", label: "Colour" },
              { key: "image", label: "Picture" },
            ]}
            onPick={(kind) =>
              onDesign((d) => ({
                ...d,
                background: {
                  ...d.background,
                  kind,
                  color: d.background.color ?? "#fffaf0",
                },
              }))
            }
          />
          {bg.kind === "color" && (
            <div className="mt-3">
              <Swatches
                label="Background colour"
                value={bg.color ?? "#fffaf0"}
                onPick={(c) =>
                  onDesign((d) => ({
                    ...d,
                    background: { ...d.background, color: c },
                  }))
                }
              />
            </div>
          )}
          {bg.kind === "image" && (
            <div className="mt-3 space-y-3">
              <button
                type="button"
                onClick={onUploadBackground}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                  dark
                    ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12] hover:text-white"
                    : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
                )}
              >
                <Icon name="upload" size={16} />
                {bg.imageUrl ? "Replace picture" : "Choose a picture"}
              </button>
              <Num
                dark={dark}
                label="Paper tint over it"
                value={Math.round(bg.overlay * 100)}
                min={0}
                max={90}
                suffix="%"
                onChange={(v) =>
                  onDesign((d) => ({
                    ...d,
                    background: { ...d.background, overlay: v / 100 },
                  }))
                }
              />
            </div>
          )}
        </Section>

        <Section dark={dark} title="Colours">
          <div className="grid grid-cols-2 gap-2">
            {INVITATION_THEMES.map((t) => {
              const p = THEME_PALETTES[t];
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={design.theme === t}
                  onClick={() => onDesign((d) => applyInvitationTheme(d, t))}
                  className={cn(
                    "rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#dfba73]",
                    design.theme === t
                      ? dark
                        ? "border-[#dfba73] bg-[#dfba73]/15 shadow-xs ring-1 ring-[#dfba73]/40"
                        : "border-[#4a0e17] bg-[#4a0e17]/10 shadow-xs"
                      : dark
                        ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200"
                        : "border-[#e8e2d6] bg-white hover:bg-[#f6f2ec] text-night"
                  )}
                >
                  <span className="mb-1.5 flex gap-1">
                    {[p.paper, p.title, p.accent, p.foil].map((c) => (
                      <span
                        key={c}
                        className="h-5 w-5 rounded-full border border-black/10"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] font-semibold",
                      design.theme === t
                        ? dark
                          ? "text-[#dfba73]"
                          : "text-[#4a0e17]"
                        : dark
                          ? "text-zinc-100"
                          : "text-night"
                    )}
                  >
                    {INVITATION_THEME_LABELS[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section dark={dark} title="Stationery Layout Presets">
          <p
            className={cn(
              "mb-2.5 text-[11px] leading-relaxed",
              dark ? "text-zinc-400" : "text-label-2"
            )}
          >
            Choose a layout for your invitation. Applying a preset replaces the
            current layout.
          </p>
          <div className="space-y-2">
            {LAYOUT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onDesign((d) => applyLayoutPreset(d, preset.id))}
                className={cn(
                  "w-full rounded-xl border p-2.5 text-left transition focus-visible:outline-2 focus-visible:outline-[#dfba73]",
                  dark
                    ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20"
                    : "border-[#e8e2d6] bg-white hover:bg-[#f6f2ec]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      dark ? "text-zinc-100" : "text-night"
                    )}
                  >
                    {preset.name}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      dark
                        ? "bg-[#dfba73]/15 text-[#dfba73]"
                        : "bg-[#4a0e17]/10 text-[#4a0e17]"
                    )}
                  >
                    {preset.badge}
                  </span>
                </div>
                <span
                  className={cn(
                    "mt-0.5 block text-[11px]",
                    dark ? "text-zinc-400" : "text-label-2"
                  )}
                >
                  {preset.description}
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section dark={dark} title="Decoration">
          <Toggle
            dark={dark}
            label="House ribbon and border"
            hint="Turn off to draw your card from scratch."
            checked={design.chrome !== false}
            onChange={(on) => onDesign((d) => ({ ...d, chrome: on }))}
          />
        </Section>

        <Section dark={dark} title="Design file">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExport}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                dark
                  ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12] hover:text-white"
                  : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
              )}
            >
              <Icon name="download" size={16} />
              Save a copy
            </button>
            <label
              className={cn(
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-within:outline-2 focus-within:outline-[#dfba73]",
                dark
                  ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12] hover:text-white"
                  : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
              )}
            >
              <Icon name="upload" size={16} />
              Open a copy
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportFile(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Section>
      </div>
    );
  }

  const dims = designDimensionsPx(design);
  const patch = (p: Patch) => {
    if (layer.locked) return;
    onPatch(layer.id, p);
  };
  const isText = TEXT_KINDS.includes(layer.kind);
  const hasBox = layer.kind === "shape" || layer.kind === "image";
  const label =
    layer.kind === "shape"
      ? (INVITATION_SHAPE_LABELS[layer.shape ?? "rect"] ?? "Shape")
      : INVITATION_LAYER_LABELS[layer.kind];

  return (
    <div data-testid="inspector-layer">
      <Section
        dark={dark}
        title={label}
        aside={
          <span
            className={cn(
              "truncate text-xs",
              dark ? "text-zinc-400" : "text-label-2"
            )}
          >
            {layer.name}
          </span>
        }
      >
        {layer.locked && (
          <p className="mb-3 rounded-xl bg-gold/15 px-3 py-2 text-[12px] text-gold-ink">
            This layer is locked. Unlock it in the layers list to move, resize,
            or edit its style.
          </p>
        )}
        <div
          aria-disabled={layer.locked || undefined}
          className={cn(layer.locked && "pointer-events-none opacity-55")}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-wider",
                  dark ? "text-zinc-400" : "text-[#7a5b67]"
                )}
              >
                Position & Size
              </span>
              {hasBox && layer.shape !== "line" && (
                <button
                  type="button"
                  aria-pressed={aspectLocked}
                  aria-label="Lock aspect ratio"
                  title={
                    aspectLocked
                      ? "Aspect ratio locked (click to unlock)"
                      : "Lock width & height proportions"
                  }
                  onClick={() => patch({ aspectLocked: !aspectLocked })}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                    aspectLocked
                      ? dark
                        ? "bg-[#dfba73]/25 text-[#dfba73]"
                        : "bg-[#4a0e17]/15 text-[#4a0e17]"
                      : dark
                        ? "text-zinc-400 hover:bg-white/10"
                        : "text-[#7a5b67] hover:bg-black/5"
                  )}
                >
                  {aspectLocked ? "⛓ Locked" : "⛓ Free"}
                </button>
              )}
            </div>
            <div
              className={cn(
                "inline-flex rounded-lg border p-0.5 transition-colors",
                dark
                  ? "border-white/10 bg-white/[0.05]"
                  : "border-[#e8e2d6] bg-white/60"
              )}
            >
              <button
                type="button"
                onClick={() => setUnit("px")}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors",
                  unit === "px"
                    ? dark
                      ? "bg-[#dfba73] text-[#20161b] shadow-xs font-bold"
                      : "bg-[#4a0e17] text-white shadow-xs"
                    : dark
                      ? "text-zinc-400 hover:text-white"
                      : "text-[#7a5b67] hover:text-night"
                )}
              >
                px
              </button>
              <button
                type="button"
                onClick={() => setUnit("%")}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors",
                  unit === "%"
                    ? dark
                      ? "bg-[#dfba73] text-[#20161b] shadow-xs font-bold"
                      : "bg-[#4a0e17] text-white shadow-xs"
                    : dark
                      ? "text-zinc-400 hover:text-white"
                      : "text-[#7a5b67] hover:text-night"
                )}
              >
                %
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {unit === "px" ? (
              <>
                <Num
                  dark={dark}
                  label="X"
                  suffix="px"
                  value={Math.round((layer.x / 100) * dims.width)}
                  min={-Math.round(dims.width * 2)}
                  max={Math.round(dims.width * 5)}
                  step={1}
                  onChange={(xPx) =>
                    patch({
                      x: Math.round((xPx / dims.width) * 100 * 100) / 100,
                    })
                  }
                />
                <Num
                  dark={dark}
                  label="Y"
                  suffix="px"
                  value={Math.round((layer.y / 100) * dims.height)}
                  min={-Math.round(dims.height * 2)}
                  max={Math.round(dims.height * 5)}
                  step={1}
                  onChange={(yPx) =>
                    patch({
                      y: Math.round((yPx / dims.height) * 100 * 100) / 100,
                    })
                  }
                />
                <Num
                  dark={dark}
                  label="Width"
                  suffix="px"
                  value={Math.max(
                    1,
                    Math.round((layer.width / 100) * dims.width)
                  )}
                  min={5}
                  max={Math.round(dims.width * 10)}
                  step={1}
                  onChange={(wPx) => {
                    const nextW = Math.max(
                      1,
                      Math.round((wPx / dims.width) * 100 * 100) / 100
                    );
                    if (aspectLocked && hasBox && layer.shape !== "line") {
                      const curWPx = (layer.width / 100) * dims.width;
                      const curHPx = ((layer.height ?? 20) / 100) * dims.height;
                      const ratio =
                        curWPx > 0 && curHPx > 0 ? curWPx / curHPx : 1;
                      const nextHPx = wPx / ratio;
                      const nextH = Math.max(
                        0.2,
                        Math.round((nextHPx / dims.height) * 100 * 100) / 100
                      );
                      patch({ width: nextW, height: nextH });
                    } else {
                      patch({ width: nextW });
                    }
                  }}
                />
                {hasBox && layer.shape !== "line" ? (
                  <Num
                    dark={dark}
                    label="Height"
                    suffix="px"
                    value={Math.max(
                      1,
                      Math.round(((layer.height ?? 20) / 100) * dims.height)
                    )}
                    min={5}
                    max={Math.round(dims.height * 10)}
                    step={1}
                    onChange={(hPx) => {
                      const nextH = Math.max(
                        0.2,
                        Math.round((hPx / dims.height) * 100 * 100) / 100
                      );
                      if (aspectLocked) {
                        const curWPx = (layer.width / 100) * dims.width;
                        const curHPx =
                          ((layer.height ?? 20) / 100) * dims.height;
                        const ratio =
                          curWPx > 0 && curHPx > 0 ? curWPx / curHPx : 1;
                        const nextWPx = hPx * ratio;
                        const nextW = Math.max(
                          1,
                          Math.round((nextWPx / dims.width) * 100 * 100) / 100
                        );
                        patch({ width: nextW, height: nextH });
                      } else {
                        patch({ height: nextH });
                      }
                    }}
                  />
                ) : (
                  <span />
                )}
              </>
            ) : (
              <>
                <Num
                  dark={dark}
                  label="Left"
                  suffix="%"
                  value={layer.x}
                  min={-500}
                  max={500}
                  step={0.5}
                  onChange={(v) => patch({ x: v })}
                />
                <Num
                  dark={dark}
                  label="Top"
                  suffix="%"
                  value={layer.y}
                  min={-500}
                  max={500}
                  step={0.5}
                  onChange={(v) => patch({ y: v })}
                />
                <Num
                  dark={dark}
                  label="Width"
                  suffix="%"
                  value={layer.width}
                  min={1}
                  max={1000}
                  step={0.5}
                  onChange={(v) => {
                    const nextW = Math.max(1, v);
                    if (aspectLocked && hasBox && layer.shape !== "line") {
                      const scale = layer.width > 0 ? nextW / layer.width : 1;
                      patch({
                        width: nextW,
                        height: Math.max(
                          0.2,
                          Math.round((layer.height ?? 20) * scale * 100) / 100
                        ),
                      });
                    } else {
                      patch({ width: nextW });
                    }
                  }}
                />
                {hasBox && layer.shape !== "line" ? (
                  <Num
                    dark={dark}
                    label="Height"
                    suffix="%"
                    value={layer.height ?? 20}
                    min={0.2}
                    max={1000}
                    step={0.5}
                    onChange={(v) => {
                      const nextH = Math.max(0.2, v);
                      if (aspectLocked) {
                        const curH = layer.height ?? 20;
                        const scale = curH > 0 ? nextH / curH : 1;
                        patch({
                          width: Math.max(
                            1,
                            Math.round(layer.width * scale * 100) / 100
                          ),
                          height: nextH,
                        });
                      } else {
                        patch({ height: nextH });
                      }
                    }}
                  />
                ) : (
                  <span />
                )}
              </>
            )}
            <Num
              dark={dark}
              label="Turn"
              suffix="°"
              value={layer.rotation ?? 0}
              min={-180}
              max={180}
              step={1}
              onChange={(v) => patch({ rotation: v })}
            />
            <Num
              dark={dark}
              label="See-through"
              suffix="%"
              value={Math.round((1 - (layer.opacity ?? 1)) * 100)}
              min={0}
              max={100}
              step={5}
              onChange={(v) => patch({ opacity: 1 - v / 100 })}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-label="Flip horizontal"
              aria-pressed={Boolean(layer.flipX)}
              onClick={() => patch({ flipX: !layer.flipX })}
              className={cn(
                "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:outline-2",
                layer.flipX
                  ? dark
                    ? "border-[#dfba73] bg-[#dfba73]/20 text-[#dfba73]"
                    : "border-[#4a0e17] bg-[#4a0e17]/10 text-[#4a0e17]"
                  : dark
                    ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12] hover:text-white focus-visible:outline-[#dfba73]"
                    : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] focus-visible:outline-[#4a0e17] shadow-xs"
              )}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2v20M5 12l4-4v8zM19 12l-4-4v8z" />
              </svg>
              Flip H
            </button>
            <button
              type="button"
              aria-label="Flip vertical"
              aria-pressed={Boolean(layer.flipY)}
              onClick={() => patch({ flipY: !layer.flipY })}
              className={cn(
                "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:outline-2",
                layer.flipY
                  ? dark
                    ? "border-[#dfba73] bg-[#dfba73]/20 text-[#dfba73]"
                    : "border-[#4a0e17] bg-[#4a0e17]/10 text-[#4a0e17]"
                  : dark
                    ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12] hover:text-white focus-visible:outline-[#dfba73]"
                    : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] focus-visible:outline-[#4a0e17] shadow-xs"
              )}
            >
              <svg
                viewBox="0 0 24 24"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12h20M12 5l-4 4h8zM12 19l-4-4h8z" />
              </svg>
              Flip V
            </button>
            <button
              type="button"
              aria-label="Rotate 90 degrees counter-clockwise"
              title="Rotate -90°"
              onClick={() => {
                const next =
                  (((((layer.rotation ?? 0) - 90 + 180) % 360) + 360) % 360) -
                  180;
                patch({ rotation: next === -180 ? 180 : next });
              }}
              className={cn(
                "inline-flex min-h-9 items-center justify-center rounded-lg border px-2.5 text-xs font-mono font-semibold transition-colors",
                dark
                  ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
                  : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
              )}
            >
              -90°
            </button>
            <button
              type="button"
              aria-label="Rotate 90 degrees clockwise"
              title="Rotate +90°"
              onClick={() => {
                const next =
                  (((((layer.rotation ?? 0) + 90 + 180) % 360) + 360) % 360) -
                  180;
                patch({ rotation: next === -180 ? 180 : next });
              }}
              className={cn(
                "inline-flex min-h-9 items-center justify-center rounded-lg border px-2.5 text-xs font-mono font-semibold transition-colors",
                dark
                  ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
                  : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
              )}
            >
              +90°
            </button>
          </div>
          <div
            className="mt-3 flex flex-wrap gap-1.5"
            role="group"
            aria-label="Align on the card"
          >
            {ALIGN.map((a) => (
              <IconBtn
                key={a.key}
                label={a.label}
                dark={dark}
                onClick={() => !layer.locked && onAlign(layer.id, a.key)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d={a.d} />
                </svg>
              </IconBtn>
            ))}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <IconBtn
            label="Bring to front"
            dark={dark}
            onClick={() => onStack(layer.id, "front")}
          >
            <Icon name="expand_less" size={18} />
          </IconBtn>
          <IconBtn
            label="Send to back"
            dark={dark}
            onClick={() => onStack(layer.id, "back")}
          >
            <Icon name="expand_more" size={18} />
          </IconBtn>
          <IconBtn
            label="Duplicate"
            dark={dark}
            disabled={layer.kind === "code"}
            onClick={() => onDuplicate(layer.id)}
          >
            <Icon name="copy" size={17} />
          </IconBtn>
          <IconBtn
            label="Delete"
            dark={dark}
            disabled={!canDelete(layer)}
            onClick={() => onDelete(layer.id)}
          >
            <Icon name="delete" size={17} />
          </IconBtn>
        </div>
      </Section>

      {isText && (
        <Section dark={dark} title="Words">
          <label className="block">
            <span className="sr-only">Text</span>
            <textarea
              id="designer-text-input"
              rows={3}
              value={layer.text}
              onChange={(e) => patch({ text: e.target.value.slice(0, 600) })}
              className={cn(fieldClass(dark), "py-2.5")}
            />
          </label>
          <div className="mt-3 space-y-3">
            <div>
              <span
                className={cn(
                  "mb-1 block text-[11px] font-semibold",
                  dark ? "text-zinc-400" : "text-[#7a5b67]"
                )}
              >
                Typeface
              </span>
              <select
                aria-label="Font typeface"
                value={layer.font}
                onChange={(e) =>
                  patch({ font: e.target.value as InvitationFont })
                }
                className={fieldClass(dark)}
              >
                {INVITATION_FONTS.map((f) => (
                  <option key={f} value={f}>
                    {INVITATION_FONT_LABELS[f]}
                  </option>
                ))}
              </select>
            </div>
            <Segmented
              dark={dark}
              label="Alignment"
              value={layer.align}
              options={[
                { key: "left", label: "Left" },
                { key: "center", label: "Centre" },
                { key: "right", label: "Right" },
              ]}
              onPick={(align) => patch({ align })}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Num
                dark={dark}
                label="Size (px)"
                suffix="px"
                value={Math.round((layer.size / 100) * dims.width)}
                min={10}
                max={Math.round(0.2 * dims.width)}
                step={1}
                onChange={(pxVal) =>
                  patch({
                    size: Math.max(
                      1,
                      Math.min(
                        20,
                        Math.round((pxVal / dims.width) * 100 * 10) / 10
                      )
                    ),
                  })
                }
              />
              <Num
                dark={dark}
                label="Line height"
                value={layer.lineHeight ?? 1.35}
                min={0.8}
                max={3}
                step={0.05}
                onChange={(v) => patch({ lineHeight: v })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Num
                dark={dark}
                label="Letter gap"
                value={layer.tracking}
                min={0}
                max={1}
                step={0.02}
                onChange={(v) => patch({ tracking: v })}
              />
              <label className="block">
                <span
                  className={cn(
                    "mb-1 block text-[11px] font-semibold",
                    dark ? "text-zinc-400" : "text-[#7a5b67]"
                  )}
                >
                  Weight
                </span>
                <select
                  value={layer.weight}
                  onChange={(e) =>
                    patch({
                      weight: Number(
                        e.target.value
                      ) as InvitationLayer["weight"],
                    })
                  }
                  className={fieldClass(dark)}
                >
                  <option value={400}>Regular</option>
                  <option value={500}>Medium</option>
                  <option value={600}>Semibold</option>
                  <option value={700}>Bold</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span
                  className={cn(
                    "mb-1 block text-[11px] font-semibold",
                    dark ? "text-zinc-400" : "text-[#7a5b67]"
                  )}
                >
                  Case
                </span>
                <select
                  aria-label="Text transform"
                  value={layer.textTransform ?? "none"}
                  onChange={(e) =>
                    patch({
                      textTransform: e.target
                        .value as InvitationLayer["textTransform"],
                    })
                  }
                  className={fieldClass(dark)}
                >
                  <option value="none">As Typed</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">Capitalize Words</option>
                </select>
              </div>
              <div>
                <span
                  className={cn(
                    "mb-1 block text-[11px] font-semibold",
                    dark ? "text-zinc-400" : "text-[#7a5b67]"
                  )}
                >
                  Shadow / Foil
                </span>
                <select
                  aria-label="Text shadow"
                  value={layer.shadow ?? "none"}
                  onChange={(e) =>
                    patch({
                      shadow: e.target.value as InvitationLayer["shadow"],
                    })
                  }
                  className={fieldClass(dark)}
                >
                  <option value="none">None</option>
                  <option value="soft">Soft Shadow</option>
                  <option value="foil">Gold Foil Emboss</option>
                  <option value="glow">Golden Glow</option>
                </select>
              </div>
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold text-label-2">
                Style
              </span>
              <button
                type="button"
                aria-pressed={layer.italic}
                onClick={() => patch({ italic: !layer.italic })}
                className="min-h-11 w-full rounded-xl border border-hairline bg-white/60 text-sm italic text-night aria-pressed:border-burgundy aria-pressed:bg-burgundy/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
              >
                Italic
              </button>
            </div>
          </div>
        </Section>
      )}

      {(isText || layer.kind === "divider" || layer.kind === "seal") && (
        <Section dark={dark} title="Colour">
          {layer.kind !== "seal" && (
            <div
              className="mb-3 flex flex-wrap gap-1.5"
              role="group"
              aria-label="Colour from the card's palette"
            >
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={layer.colorRole === r.value}
                  onClick={() => patch({ colorRole: r.value, color: null })}
                  className={cn(
                    "min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#dfba73]",
                    layer.colorRole === r.value
                      ? dark
                        ? "border-[#dfba73] bg-[#dfba73] text-[#20161b] font-bold"
                        : "border-burgundy bg-burgundy/10 text-burgundy"
                      : dark
                        ? "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                        : "border-hairline bg-white/60 text-night hover:bg-white"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <HexColorInput
            dark={dark}
            label="Text colour"
            value={layer.colorRole === "custom" ? layer.color : null}
            onChange={(c) => c && patch({ colorRole: "custom", color: c })}
          />
        </Section>
      )}

      {layer.kind === "shape" && (
        <Section dark={dark} title="Shape Geometry & Style">
          <div className="space-y-3">
            <div>
              <p
                className={cn(
                  "mb-1 text-[11px] font-semibold",
                  dark ? "text-zinc-400" : "text-[#7a5b67]"
                )}
              >
                Shape
              </p>
              <select
                aria-label="Shape geometry"
                value={layer.shape ?? "rect"}
                onChange={(e) => {
                  const s = e.target.value as InvitationShape;
                  patch({
                    shape: s,
                    ...(s === "line"
                      ? { height: 0.4 }
                      : layer.height && layer.height < 5
                        ? { height: 20 }
                        : {}),
                    ...(s === "arch" && !layer.radius ? { radius: 18 } : {}),
                  });
                }}
                className={fieldClass(dark)}
              >
                {INVITATION_SHAPES.map((s) => (
                  <option key={s} value={s}>
                    {INVITATION_SHAPE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {layer.shape !== "line" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      dark ? "text-zinc-400" : "text-[#7a5b67]"
                    )}
                  >
                    Fill Type
                  </span>
                  <div
                    className={cn(
                      "inline-flex rounded-lg border p-0.5",
                      dark
                        ? "border-white/10 bg-white/[0.05]"
                        : "border-[#e8e2d6] bg-white/60"
                    )}
                  >
                    {(["solid", "gradient", "none"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setFillMode(m);
                          if (m === "none")
                            patch({ fill: null, gradient: undefined });
                          if (m === "solid" && !layer.fill)
                            patch({ fill: "#b8864b", gradient: undefined });
                          if (m === "gradient" && !layer.gradient)
                            patch({
                              gradient: GRADIENT_PRESETS[0].value,
                              fill: null,
                            });
                        }}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize transition-colors",
                          fillMode === m
                            ? dark
                              ? "bg-[#dfba73] text-[#20161b] shadow-xs"
                              : "bg-[#4a0e17] text-white shadow-xs"
                            : dark
                              ? "text-zinc-400 hover:text-white"
                              : "text-[#7a5b67] hover:text-[#4a0e17]"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {fillMode === "solid" && (
                  <HexColorInput
                    dark={dark}
                    label="Fill colour"
                    allowNone
                    value={layer.fill ?? null}
                    onChange={(c) => patch({ fill: c, gradient: undefined })}
                  />
                )}

                {fillMode === "gradient" && (
                  <div
                    className={cn(
                      "space-y-2 rounded-xl border p-2.5",
                      dark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-[#e8e2d6] bg-white/40"
                    )}
                  >
                    <span
                      className={cn(
                        "block text-[11px] font-semibold",
                        dark ? "text-zinc-400" : "text-[#7a5b67]"
                      )}
                    >
                      Luxury Gradient Presets
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {GRADIENT_PRESETS.map((g) => (
                        <button
                          key={g.name}
                          type="button"
                          onClick={() =>
                            patch({ gradient: g.value, fill: null })
                          }
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-1 text-left transition-all",
                            layer.gradient === g.value
                              ? dark
                                ? "border-[#dfba73] ring-1 ring-[#dfba73] bg-[#dfba73]/15 text-[#dfba73]"
                                : "border-[#4a0e17] ring-1 ring-[#4a0e17] bg-[#4a0e17]/5"
                              : dark
                                ? "border-white/10 hover:border-white/20 bg-white/[0.04]"
                                : "border-black/10 hover:border-black/25 bg-white"
                          )}
                        >
                          <span
                            className="h-5 w-5 shrink-0 rounded-md shadow-2xs"
                            style={{ background: g.value }}
                          />
                          <span
                            className={cn(
                              "truncate text-[10px] font-medium",
                              dark ? "text-zinc-200" : "text-[#2d1f24]"
                            )}
                          >
                            {g.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div>
                      <span
                        className={cn(
                          "mb-1 block text-[10px] font-semibold",
                          dark ? "text-zinc-400" : "text-[#7a5b67]"
                        )}
                      >
                        Custom Gradient CSS
                      </span>
                      <input
                        type="text"
                        value={layer.gradient ?? ""}
                        placeholder="linear-gradient(135deg, #dfba73, #b8864b)"
                        onChange={(e) =>
                          patch({ gradient: e.target.value, fill: null })
                        }
                        className={fieldClass(dark)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <p
              className={cn(
                "text-[11px] font-semibold",
                dark ? "text-zinc-400" : "text-[#7a5b67]"
              )}
            >
              {layer.shape === "line" ? "Colour" : "Outline"}
            </p>
            <HexColorInput
              dark={dark}
              label="Outline"
              allowNone={layer.shape !== "line"}
              value={layer.stroke ?? null}
              onChange={(c) => patch({ stroke: c })}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <Num
                dark={dark}
                label={layer.shape === "line" ? "Thickness" : "Outline width"}
                value={layer.strokeWidth ?? 0.4}
                min={0}
                max={10}
                step={0.1}
                onChange={(v) =>
                  patch({
                    strokeWidth: v,
                    ...(layer.shape === "line"
                      ? { height: Math.max(0.2, v) }
                      : {}),
                  })
                }
              />
            </div>

            {/* Comprehensive Corner Radius System */}
            {(layer.shape === "rect" || layer.shape === "arch") && (
              <div
                className={cn(
                  "space-y-2 rounded-xl border p-2.5",
                  dark
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-[#e8e2d6] bg-white/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      dark ? "text-zinc-400" : "text-[#7a5b67]"
                    )}
                  >
                    Corner Radii
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !unlinkCorners;
                      setUnlinkCorners(next);
                      if (!next) {
                        const r = layer.radiusTL ?? layer.radius ?? 0;
                        patch({
                          radius: r,
                          radiusTL: undefined,
                          radiusTR: undefined,
                          radiusBR: undefined,
                          radiusBL: undefined,
                        });
                      }
                    }}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors",
                      unlinkCorners
                        ? dark
                          ? "bg-[#dfba73] text-[#20161b] shadow-xs"
                          : "bg-[#4a0e17] text-white shadow-xs"
                        : dark
                          ? "bg-white/10 text-zinc-300 hover:text-white"
                          : "bg-black/5 text-[#7a5b67] hover:text-[#4a0e17]"
                    )}
                  >
                    {unlinkCorners
                      ? "4 Corners (Independent)"
                      : "Linked (Uniform)"}
                  </button>
                </div>

                {!unlinkCorners ? (
                  <Num
                    dark={dark}
                    label={
                      layer.shape === "arch" ? "Arch curve" : "Corner radius"
                    }
                    value={layer.radius ?? (layer.shape === "arch" ? 18 : 0)}
                    min={0}
                    max={50}
                    step={0.5}
                    suffix="cqw"
                    onChange={(v) => patch({ radius: v })}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Num
                      dark={dark}
                      label="Top Left"
                      value={layer.radiusTL ?? layer.radius ?? 0}
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="cqw"
                      onChange={(v) => patch({ radiusTL: v })}
                    />
                    <Num
                      dark={dark}
                      label="Top Right"
                      value={layer.radiusTR ?? layer.radius ?? 0}
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="cqw"
                      onChange={(v) => patch({ radiusTR: v })}
                    />
                    <Num
                      dark={dark}
                      label="Bottom Left"
                      value={layer.radiusBL ?? layer.radius ?? 0}
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="cqw"
                      onChange={(v) => patch({ radiusBL: v })}
                    />
                    <Num
                      dark={dark}
                      label="Bottom Right"
                      value={layer.radiusBR ?? layer.radius ?? 0}
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="cqw"
                      onChange={(v) => patch({ radiusBR: v })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {layer.kind === "image" && (
        <Section dark={dark} title="Picture & Framing">
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onPickImage(layer.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                dark
                  ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12] hover:text-white"
                  : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
              )}
            >
              <Icon name="upload" size={16} />
              Replace picture
            </button>
            <div>
              <p
                className={cn(
                  "mb-1 text-[11px] font-semibold",
                  dark ? "text-zinc-400" : "text-[#7a5b67]"
                )}
              >
                Frame mask
              </p>
              <select
                aria-label="Frame mask shape"
                value={layer.maskShape ?? "rect"}
                onChange={(e) =>
                  patch({ maskShape: e.target.value as InvitationShape })
                }
                className={fieldClass(dark)}
              >
                <option value="rect">Standard (Rectangle)</option>
                <option value="arch">Cathedral Arch</option>
                <option value="ellipse">Circle / Oval</option>
                <option value="diamond">Diamond</option>
                <option value="crest">Crest / Shield</option>
                <option value="star">Star / Sparkle</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <Segmented
              dark={dark}
              label="Fit"
              value={layer.fit ?? "cover"}
              options={[
                { key: "cover", label: "Fill the box" },
                { key: "contain", label: "Show all" },
              ]}
              onPick={(fit) => patch({ fit })}
            />
            {(!layer.maskShape || layer.maskShape === "rect") && (
              <div
                className={cn(
                  "space-y-2.5 rounded-xl border p-2.5",
                  dark
                    ? "border-white/10 bg-white/[0.03]"
                    : "border-[#e8e2d6] bg-white/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      dark ? "text-zinc-400" : "text-[#7a5b67]"
                    )}
                  >
                    Corner Radii
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !unlinkCorners;
                      setUnlinkCorners(next);
                      if (!next) {
                        const r = layer.radiusTL ?? layer.radius ?? 0;
                        patch({
                          radius: r,
                          radiusTL: undefined,
                          radiusTR: undefined,
                          radiusBR: undefined,
                          radiusBL: undefined,
                        });
                      }
                    }}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors",
                      unlinkCorners
                        ? dark
                          ? "bg-[#dfba73] text-[#20161b] shadow-xs"
                          : "bg-[#4a0e17] text-white shadow-xs"
                        : dark
                          ? "bg-white/10 text-zinc-300 hover:text-white"
                          : "bg-black/5 text-[#7a5b67] hover:text-[#4a0e17]"
                    )}
                  >
                    {unlinkCorners
                      ? "4 Corners (Independent)"
                      : "Linked (Uniform)"}
                  </button>
                </div>
                {!unlinkCorners ? (
                  <Num
                    dark={dark}
                    label="Corner radius"
                    value={layer.radius ?? 0}
                    min={0}
                    max={50}
                    step={0.5}
                    suffix="cqw"
                    onChange={(v) => patch({ radius: v })}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Num
                      dark={dark}
                      label="Top Left"
                      value={layer.radiusTL ?? layer.radius ?? 0}
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="cqw"
                      onChange={(v) => patch({ radiusTL: v })}
                    />
                    <Num
                      dark={dark}
                      label="Top Right"
                      value={layer.radiusTR ?? layer.radius ?? 0}
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="cqw"
                      onChange={(v) => patch({ radiusTR: v })}
                    />
                    <Num
                      dark={dark}
                      label="Bottom Left"
                      value={layer.radiusBL ?? layer.radius ?? 0}
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="cqw"
                      onChange={(v) => patch({ radiusBL: v })}
                    />
                    <Num
                      dark={dark}
                      label="Bottom Right"
                      value={layer.radiusBR ?? layer.radius ?? 0}
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="cqw"
                      onChange={(v) => patch({ radiusBR: v })}
                    />
                  </div>
                )}
                <HexColorInput
                  dark={dark}
                  label="Frame border"
                  allowNone
                  value={layer.stroke ?? null}
                  onChange={(c) => patch({ stroke: c })}
                />
                {layer.stroke && (
                  <Num
                    dark={dark}
                    label="Border weight"
                    value={layer.strokeWidth ?? 0.4}
                    min={0.1}
                    max={6}
                    step={0.1}
                    onChange={(v) => patch({ strokeWidth: v })}
                  />
                )}
              </div>
            )}
            {layer.maskShape === "arch" && (
              <Num
                dark={dark}
                label="Arch curve"
                value={layer.radius ?? 18}
                min={0}
                max={50}
                step={0.5}
                suffix="cqw"
                onChange={(v) => patch({ radius: v })}
              />
            )}
            <div
              className={cn(
                "space-y-2 rounded-xl border p-2.5",
                dark
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-[#e8e2d6] bg-white/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    dark ? "text-zinc-400" : "text-[#7a5b67]"
                  )}
                >
                  In-frame focal position
                </span>
                {(layer.focalX !== undefined || layer.focalY !== undefined) && (
                  <button
                    type="button"
                    onClick={() => patch({ focalX: 50, focalY: 50 })}
                    className={cn(
                      "text-[10px] font-medium hover:underline",
                      dark ? "text-[#dfba73]" : "text-[#4a0e17]"
                    )}
                  >
                    Reset (Center)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Num
                  dark={dark}
                  label="Pan X"
                  value={layer.focalX ?? 50}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  onChange={(v) => patch({ focalX: v })}
                />
                <Num
                  dark={dark}
                  label="Pan Y"
                  value={layer.focalY ?? 50}
                  min={0}
                  max={100}
                  step={1}
                  suffix="%"
                  onChange={(v) => patch({ focalY: v })}
                />
              </div>
            </div>
          </div>
        </Section>
      )}

      {layer.kind === "code" && (
        <Section dark={dark} title="Entry seal">
          <p
            className={cn(
              "text-[13px] leading-relaxed",
              dark ? "text-zinc-300" : "text-label-2"
            )}
          >
            Each guest&apos;s own entry code is woven into this seal. Guests
            only see a decorative seal; the door scanner reads it. It appears
            only for guests who have accepted.
          </p>
        </Section>
      )}

      {/* Universal Studio Visual FX & Blending Section */}
      <Section dark={dark} title="Visual FX & Blending">
        <div className="space-y-3">
          <div>
            <span
              className={cn(
                "mb-1 block text-[11px] font-semibold",
                dark ? "text-zinc-400" : "text-[#7a5b67]"
              )}
            >
              Blend Mode
            </span>
            <select
              aria-label="Layer blend mode"
              value={layer.blendMode ?? "normal"}
              onChange={(e) => patch({ blendMode: e.target.value })}
              className={fieldClass(dark)}
            >
              {BLEND_MODES.map((m) => (
                <option
                  key={m.value}
                  value={m.value}
                  className={
                    dark
                      ? "bg-[#23181e] text-[#fff6dc]"
                      : "bg-white text-[#2d1f24]"
                  }
                >
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    dark ? "text-zinc-400" : "text-[#7a5b67]"
                  )}
                >
                  Blur
                </span>
                <span className="font-mono text-[10px] text-label-2">
                  {layer.blur ?? 0}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                aria-label="Gaussian blur"
                value={layer.blur ?? 0}
                onChange={(e) => patch({ blur: Number(e.target.value) })}
                className="h-8 w-full accent-burgundy"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    dark ? "text-zinc-400" : "text-[#7a5b67]"
                  )}
                >
                  Opacity
                </span>
                <span className="font-mono text-[10px] text-label-2">
                  {Math.round((layer.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label="Opacity percentage"
                value={Math.round((layer.opacity ?? 1) * 100)}
                onChange={(e) =>
                  patch({ opacity: Number(e.target.value) / 100 })
                }
                className="h-8 w-full accent-burgundy"
              />
            </div>
          </div>

          {/* Shadow & Glow Presets */}
          <div>
            <span
              className={cn(
                "mb-1 block text-[11px] font-semibold",
                dark ? "text-zinc-400" : "text-[#7a5b67]"
              )}
            >
              Shadow & Glow
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: "none", label: "None" },
                  { id: "soft", label: "Soft" },
                  { id: "foil", label: "Foil" },
                  { id: "glow", label: "Glow" },
                ] as const
              ).map((preset) => {
                const active = (layer.shadow ?? "none") === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      patch({
                        shadow: preset.id,
                        shadowBlur: undefined,
                        shadowX: undefined,
                        shadowY: undefined,
                      })
                    }
                    className={cn(
                      "rounded-lg border py-1.5 text-center text-xs font-semibold transition-colors",
                      active
                        ? dark
                          ? "border-[#dfba73] bg-[#dfba73]/20 text-[#fff6dc]"
                          : "border-[#4a0e17] bg-[#4a0e17]/10 text-[#4a0e17]"
                        : dark
                          ? "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white"
                          : "border-[#e8e2d6] bg-white text-[#7a5b67] hover:text-night"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Shadow sliders */}
          <div className="rounded-xl border border-hairline bg-white/[0.03] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  dark ? "text-zinc-400" : "text-[#7a5b67]"
                )}
              >
                Custom Drop Shadow
              </span>
              <span className="font-mono text-[10px] text-label-2">
                {layer.shadowBlur ?? 0}px
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-label-2 block mb-0.5">
                  Blur
                </span>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  aria-label="Shadow blur"
                  value={layer.shadowBlur ?? 0}
                  onChange={(e) =>
                    patch({
                      shadowBlur: Number(e.target.value),
                      shadow: undefined,
                    })
                  }
                  className="h-6 w-full accent-burgundy"
                />
              </div>
              <div>
                <span className="text-[10px] text-label-2 block mb-0.5">
                  X Offset
                </span>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  aria-label="Shadow X offset"
                  value={layer.shadowX ?? 0}
                  onChange={(e) =>
                    patch({
                      shadowX: Number(e.target.value),
                      shadow: undefined,
                    })
                  }
                  className="h-6 w-full accent-burgundy"
                />
              </div>
              <div>
                <span className="text-[10px] text-label-2 block mb-0.5">
                  Y Offset
                </span>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  aria-label="Shadow Y offset"
                  value={layer.shadowY ?? 4}
                  onChange={(e) =>
                    patch({
                      shadowY: Number(e.target.value),
                      shadow: undefined,
                    })
                  }
                  className="h-6 w-full accent-burgundy"
                />
              </div>
            </div>
          </div>

          {/* Photo & Color Adjustments (Brightness, Contrast, Saturation, Warmth) */}
          <div className="rounded-xl border border-hairline bg-white/[0.03] p-3 space-y-2.5">
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider block",
                dark ? "text-zinc-400" : "text-[#7a5b67]"
              )}
            >
              Image & Color Adjustments
            </span>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-label-2">Brightness</span>
                  <span className="font-mono text-[10px]">
                    {layer.brightness ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  aria-label="Brightness"
                  value={layer.brightness ?? 0}
                  onChange={(e) =>
                    patch({ brightness: Number(e.target.value) })
                  }
                  className="h-6 w-full accent-burgundy"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-label-2">Contrast</span>
                  <span className="font-mono text-[10px]">
                    {layer.contrast ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  aria-label="Contrast"
                  value={layer.contrast ?? 0}
                  onChange={(e) => patch({ contrast: Number(e.target.value) })}
                  className="h-6 w-full accent-burgundy"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-label-2">Saturation</span>
                  <span className="font-mono text-[10px]">
                    {layer.saturate ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  aria-label="Saturation"
                  value={layer.saturate ?? 0}
                  onChange={(e) => patch({ saturate: Number(e.target.value) })}
                  className="h-6 w-full accent-burgundy"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-label-2">
                    Warmth / Sepia
                  </span>
                  <span className="font-mono text-[10px]">
                    {layer.sepia ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  aria-label="Warmth"
                  value={layer.sepia ?? 0}
                  onChange={(e) => patch({ sepia: Number(e.target.value) })}
                  className="h-6 w-full accent-burgundy"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

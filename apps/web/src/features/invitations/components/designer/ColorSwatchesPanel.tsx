"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { InvitationDesign, InvitationLayer } from "../../types";

interface ColorSwatchesPanelProps {
  dark?: boolean;
  design: InvitationDesign;
  selectedLayer: InvitationLayer | null;
  onPatchLayer: (id: string, patch: Partial<InvitationLayer>) => void;
  onDesign: (fn: (d: InvitationDesign) => InvitationDesign) => void;
  activeColor: string;
  onColorChange: (hex: string) => void;
}

const LUXURY_PALETTES = [
  {
    name: "Royal Gold",
    colors: ["#dfba73", "#c59b4c", "#e8d5a6", "#4a0e17", "#20161b", "#fff6dc"],
  },
  {
    name: "Emerald Regal",
    colors: ["#1a4731", "#2e6b4c", "#438e67", "#dfba73", "#0f281c", "#e8f5ec"],
  },
  {
    name: "Sunset Aso-Ebi",
    colors: ["#b85d38", "#d97843", "#e89f6b", "#dfba73", "#2d1f24", "#fdf6ee"],
  },
  {
    name: "Velvet Onyx",
    colors: ["#1a1618", "#2d2429", "#45383f", "#dfba73", "#8c7b83", "#fff6dc"],
  },
  {
    name: "Rose Champagne",
    colors: ["#c48b9f", "#dfb2c0", "#f5e1e7", "#dfba73", "#3d232e", "#ffffff"],
  },
  {
    name: "Imperial Amethyst",
    colors: ["#4a2545", "#6b3764", "#8f5486", "#e8d5a6", "#231121", "#faf3f9"],
  },
];

// Helper to convert hex <-> rgb <-> hsv
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(clean, 16);
  if (Number.isNaN(n) || clean.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

function hsvToRgb(
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  v = Math.max(0, Math.min(100, v)) / 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function ColorSwatchesPanel({
  dark,
  design: _design,
  selectedLayer,
  onPatchLayer,
  onDesign,
  activeColor,
  onColorChange,
}: ColorSwatchesPanelProps) {
  const [target, setTarget] = useState<"layer" | "background">("layer");
  const [hexInput, setHexInput] = useState(activeColor || "#dfba73");
  const rgb = hexToRgb(hexInput);
  const [hsv, setHsv] = useState(rgbToHsv(rgb.r, rgb.g, rgb.b));

  const satValRef = useRef<HTMLDivElement>(null);
  const isDraggingSatVal = useRef(false);

  useEffect(() => {
    if (activeColor && activeColor.startsWith("#")) {
      setHexInput(activeColor);
      const c = hexToRgb(activeColor);
      setHsv(rgbToHsv(c.r, c.g, c.b));
    }
  }, [activeColor]);

  const applyColor = (hex: string) => {
    setHexInput(hex);
    onColorChange(hex);

    if (target === "background") {
      onDesign((d) => ({
        ...d,
        background: { ...d.background, kind: "color", color: hex },
      }));
    } else if (selectedLayer) {
      if (
        selectedLayer.kind !== "shape" &&
        selectedLayer.kind !== "image" &&
        selectedLayer.kind !== "code"
      ) {
        onPatchLayer(selectedLayer.id, { colorRole: "custom", color: hex });
      } else if (selectedLayer.kind === "shape") {
        onPatchLayer(selectedLayer.id, { fill: hex });
      } else if (selectedLayer.kind === "image")
        onPatchLayer(selectedLayer.id, { stroke: hex });
    }
  };

  const updateHsv = (nextHsv: { h: number; s: number; v: number }) => {
    setHsv(nextHsv);
    const rgbVal = hsvToRgb(nextHsv.h, nextHsv.s, nextHsv.v);
    const hex = rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b);
    setHexInput(hex);
    applyColor(hex);
  };

  const handleSatValPointer = (e: React.PointerEvent) => {
    if (!satValRef.current) return;
    const rect = satValRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round((1 - y / rect.height) * 100);
    updateHsv({ ...hsv, s, v });
  };

  return (
    <div className="space-y-4 p-3 text-xs select-none">
      {/* Target Selector */}
      <div className="flex items-center gap-1.5 rounded-lg border border-hairline p-1 bg-white/[0.04]">
        <button
          type="button"
          onClick={() => setTarget("layer")}
          className={cn(
            "flex-1 rounded-md py-1 text-center font-medium transition",
            target === "layer"
              ? dark
                ? "bg-[var(--studio-gold)] text-[var(--studio-night)] font-bold shadow-xs"
                : "bg-[var(--studio-wine)] text-white shadow-xs"
              : dark
                ? "text-zinc-400 hover:text-white"
                : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)]"
          )}
        >
          Selected Layer
        </button>
        <button
          type="button"
          onClick={() => setTarget("background")}
          className={cn(
            "flex-1 rounded-md py-1 text-center font-medium transition",
            target === "background"
              ? dark
                ? "bg-[var(--studio-gold)] text-[var(--studio-night)] font-bold shadow-xs"
                : "bg-[var(--studio-wine)] text-white shadow-xs"
              : dark
                ? "text-zinc-400 hover:text-white"
                : "text-[var(--studio-mauve)] hover:text-[var(--studio-wine)]"
          )}
        >
          Background
        </button>
      </div>

      {/* 2D Saturation / Value Gradient Picker */}
      <div className="space-y-2">
        <div
          ref={satValRef}
          role="group"
          tabIndex={0}
          aria-label="Saturation and brightness"
          onKeyDown={(e) => {
            if (
              !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                e.key
              )
            )
              return;
            e.preventDefault();
            e.stopPropagation();
            updateHsv({
              ...hsv,
              s: Math.max(
                0,
                Math.min(
                  100,
                  hsv.s +
                    (e.key === "ArrowRight"
                      ? 1
                      : e.key === "ArrowLeft"
                        ? -1
                        : 0)
                )
              ),
              v: Math.max(
                0,
                Math.min(
                  100,
                  hsv.v +
                    (e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0)
                )
              ),
            });
          }}
          onPointerCancel={() => {
            isDraggingSatVal.current = false;
          }}
          onPointerDown={(e) => {
            isDraggingSatVal.current = true;
            satValRef.current?.setPointerCapture(e.pointerId);
            handleSatValPointer(e);
          }}
          onPointerMove={(e) => {
            if (isDraggingSatVal.current) handleSatValPointer(e);
          }}
          onPointerUp={(e) => {
            isDraggingSatVal.current = false;
            try {
              satValRef.current?.releasePointerCapture(e.pointerId);
            } catch {}
          }}
          className="relative h-40 w-full cursor-crosshair rounded-xl overflow-hidden shadow-inner border border-hairline"
          style={{
            touchAction: "none",
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
            backgroundImage: `
              linear-gradient(to top, #000, transparent),
              linear-gradient(to right, #fff, transparent)
            `,
          }}
        >
          {/* Picker Reticle */}
          <span
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/40"
            style={{
              left: `${hsv.s}%`,
              top: `${100 - hsv.v}%`,
              backgroundColor: hexInput,
            }}
          />
        </div>

        {/* 1D Rainbow Hue Slider Strip */}
        <div className="relative flex items-center">
          <input
            type="range"
            aria-label="Colour hue"
            min={0}
            max={360}
            value={hsv.h}
            onChange={(e) => updateHsv({ ...hsv, h: Number(e.target.value) })}
            className="h-3.5 w-full cursor-pointer appearance-none rounded-full border border-hairline shadow-inner focus:outline-none"
            style={{
              background:
                "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
          />
        </div>
      </div>

      {/* Hex & RGB Readout Fields */}
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-2">
          <span
            className={cn(
              "block text-xs font-semibold mb-1",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            HEX
          </span>
          <div className="flex items-center rounded-lg border border-hairline bg-white/[0.06] px-2 h-8">
            <span
              className="mr-1.5 h-3.5 w-3.5 rounded-full border border-white/20 shrink-0"
              style={{ background: hexInput }}
            />
            <input
              type="text"
              id="designer-hex-input"
              data-testid="hex-color-input"
              aria-label="Hex color hex"
              placeholder="#DFBA73"
              aria-invalid={!/^#[0-9a-f]{6}$/i.test(hexInput)}
              onBlur={() => {
                if (!/^#[0-9a-f]{6}$/i.test(hexInput)) setHexInput(activeColor);
              }}
              value={hexInput}
              onChange={(e) => {
                const val = e.target.value;
                setHexInput(val);
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  applyColor(val);
                  const c = hexToRgb(val);
                  setHsv(rgbToHsv(c.r, c.g, c.b));
                }
              }}
              className="w-full bg-transparent font-mono text-xs uppercase outline-none"
            />
          </div>
        </div>

        <div>
          <span
            className={cn(
              "block text-xs font-semibold mb-1",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            R
          </span>
          <input
            type="number"
            min={0}
            max={255}
            aria-label="Red channel"
            value={rgb.r}
            onChange={(e) => {
              const r = Number(e.target.value);
              const hex = rgbToHex(r, rgb.g, rgb.b);
              applyColor(hex);
              setHsv(rgbToHsv(r, rgb.g, rgb.b));
            }}
            className="h-8 w-full rounded-lg border border-hairline bg-white/[0.06] px-2 font-mono text-xs outline-none"
          />
        </div>

        <div>
          <span
            className={cn(
              "block text-xs font-semibold mb-1",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            G
          </span>
          <input
            type="number"
            min={0}
            max={255}
            aria-label="Green channel"
            value={rgb.g}
            onChange={(e) => {
              const g = Number(e.target.value);
              const hex = rgbToHex(rgb.r, g, rgb.b);
              applyColor(hex);
              setHsv(rgbToHsv(rgb.r, g, rgb.b));
            }}
            className="h-8 w-full rounded-lg border border-hairline bg-white/[0.06] px-2 font-mono text-xs outline-none"
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-semibold text-label-2">
            B
          </span>
          <input
            type="number"
            aria-label="Blue channel"
            min={0}
            max={255}
            value={rgb.b}
            onChange={(e) => {
              const b = Math.max(0, Math.min(255, Number(e.target.value)));
              const hex = rgbToHex(rgb.r, rgb.g, b);
              applyColor(hex);
              setHsv(rgbToHsv(rgb.r, rgb.g, b));
            }}
            className="h-8 w-full rounded-lg border border-hairline bg-white/[0.06] px-2 font-mono text-xs outline-none"
          />
        </div>
      </div>

      {/* Curated Luxury Nigerian Wedding Swatches */}
      <div className="space-y-3 pt-2">
        <span
          className={cn(
            "block text-xs font-semibold tracking-wide uppercase",
            dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
          )}
        >
          Luxury Palette Swatches
        </span>
        <div className="space-y-2">
          {LUXURY_PALETTES.map((pal) => (
            <div
              key={pal.name}
              className="rounded-xl border border-hairline bg-white/[0.03] p-2 space-y-1.5"
            >
              <span
                className={cn(
                  "text-xs font-medium block",
                  dark ? "text-zinc-300" : "text-[var(--studio-ink)]"
                )}
              >
                {pal.name}
              </span>
              <div className="flex items-center gap-1.5">
                {pal.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={`${pal.name}: ${c}`}
                    onClick={() => {
                      applyColor(c);
                      const rgbVal = hexToRgb(c);
                      setHsv(rgbToHsv(rgbVal.r, rgbVal.g, rgbVal.b));
                    }}
                    className="h-6 flex-1 rounded-md border border-white/10 shadow-xs transition hover:scale-105 hover:ring-2 hover:ring-[var(--studio-gold)]"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

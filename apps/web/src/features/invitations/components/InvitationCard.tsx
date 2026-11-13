"use client";

import React, { useLayoutEffect, useRef } from "react";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";
import { constrainEntrySeals } from "../pass-layout";
import { updateEntrySealPlates } from "./seal-plate";
import { resolveLayerColour } from "../design";
import { designRatio } from "../layer-ops";
import { EntrySeal, SAMPLE_ENTRY_CODE } from "./EntrySeal";
import type {
  InvitationDesign,
  InvitationFont,
  InvitationLayer,
  InvitationShape,
} from "../types";

interface InvitationCardProps {
  design: InvitationDesign;
  /** The names the wax seal is pressed with. */
  coupleName: string;
  className?: string;
  /** The guest's own entry code. It is drawn into the entry seal, and nowhere else. */
  entryCode?: string | null;
  /** Studio and host previews: draw the seal with a sample code so its place can be judged. */
  sampleEntry?: boolean;
  /** Studio-only: the layer being edited, and the pointer handler that moves it. */
  selectedLayerId?: string | null;
  selectedLayerIds?: string[] | null;
  onLayerPointerDown?: (
    event: React.PointerEvent<HTMLDivElement>,
    layer: InvitationLayer
  ) => void;
  /** Studio-only: in-place text editing on the canvas */
  editingLayerId?: string | null;
  onLayerTextChange?: (layerId: string, text: string) => void;
  onStopEditingText?: (cancel?: boolean) => void;
}

/** A quoted CSS url(), so a link with brackets or spaces in it cannot break the rule. */
function cssUrl(url: string | null | undefined): string | undefined {
  return url
    ? `url("${url.replace(/["\\\n]/g, encodeURIComponent)}")`
    : undefined;
}

function colourFor(layer: InvitationLayer, design: InvitationDesign): string {
  if (design.background.kind === "velvet") {
    if (layer.colorRole === "custom" && layer.color) return layer.color;
    if (layer.colorRole === "body") return design.palette.paperEdge;
    if (layer.colorRole === "accent" || layer.colorRole === "foil") {
      return design.palette.foil;
    }
    return design.palette.paper;
  }
  return resolveLayerColour(layer, design.palette);
}

function isColorDark(colorHexOrRgb?: string | null): boolean {
  if (!colorHexOrRgb) return false;
  let hex = colorHexOrRgb.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length >= 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }
  return false;
}

function isCardBackgroundDark(
  bg: InvitationDesign["background"],
  palette: InvitationDesign["palette"]
): boolean {
  if (bg.kind === "velvet") return true;
  if (bg.kind === "color") return isColorDark(bg.color || palette.paper);
  if (bg.kind === "image") return true;
  return isColorDark(palette.paper);
}

function clampRadius(val: number | undefined, max = 50): number {
  if (val == null || !Number.isFinite(val)) return 0;
  return Math.max(0, Math.min(val, max));
}

function getShapeStyle(
  shape: InvitationShape | undefined,
  radius = 0,
  radii?: { tl?: number; tr?: number; br?: number; bl?: number }
): {
  borderRadius?: string;
  clipPath?: string;
} {
  const r = clampRadius(radius, 50);
  switch (shape) {
    case "ellipse":
      return { borderRadius: "50%" };
    case "arch": {
      const tl = clampRadius(radii?.tl ?? r ?? 18, 50);
      const tr = clampRadius(radii?.tr ?? r ?? 18, 50);
      return {
        borderRadius: `${tl}cqw ${tr}cqw 0 0`,
      };
    }
    case "star":
      return {
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      };
    case "diamond":
      return { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" };
    case "crest":
      return {
        clipPath: "polygon(50% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%, 0% 0%)",
      };
    case "triangle":
      return { clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" };
    case "rect":
    default: {
      if (
        radii &&
        (radii.tl != null ||
          radii.tr != null ||
          radii.br != null ||
          radii.bl != null)
      ) {
        const tl = clampRadius(radii.tl ?? r, 50);
        const tr = clampRadius(radii.tr ?? r, 50);
        const br = clampRadius(radii.br ?? r, 50);
        const bl = clampRadius(radii.bl ?? r, 50);
        return {
          borderRadius: `${tl}cqw ${tr}cqw ${br}cqw ${bl}cqw`,
        };
      }
      return { borderRadius: `${r}cqw` };
    }
  }
}

function fontStack(font: InvitationFont): string {
  switch (font) {
    case "script":
      return "var(--font-great-vibes, 'Great Vibes'), 'Great Vibes', 'Alex Brush', 'Dancing Script', 'Cormorant Garamond', cursive, serif";
    case "serif":
      return "var(--font-cormorant, Georgia), 'Cormorant Garamond', 'Playfair Display', 'EB Garamond', Georgia, serif";
    case "mono":
      return "'Space Mono', 'Courier New', Courier, monospace";
    case "display":
      return "var(--font-display, var(--font-bodoni-moda, Georgia)), 'Bodoni Moda', 'Playfair Display', 'Didot', Georgia, serif";
    case "sans":
    default:
      return "var(--font-sans, 'Plus Jakarta Sans'), 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
  }
}

function shadowStyle(shadow?: string): string | undefined {
  if (shadow === "foil") {
    return "0 1px 2px rgba(184, 134, 75, 0.45), 0 0 1px rgba(255, 235, 175, 0.6)";
  }
  if (shadow === "soft") {
    return "0 2px 8px rgba(0, 0, 0, 0.2)";
  }
  if (shadow === "glow") {
    return "0 0 12px rgba(255, 215, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.25)";
  }
  return undefined;
}

function textStyle(
  layer: InvitationLayer,
  design: InvitationDesign,
  interactive: boolean
): React.CSSProperties {
  return {
    position: "absolute",
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.width}%`,
    textAlign: layer.align,
    fontFamily: fontStack(layer.font),
    fontSize: `${layer.size}cqw`,
    fontWeight: layer.weight,
    fontStyle: layer.italic ? "italic" : "normal",
    letterSpacing: `${layer.tracking}em`,
    lineHeight: layer.lineHeight ?? 1.35,
    color: colourFor(layer, design),
    textTransform:
      layer.textTransform ??
      (layer.kind === "kicker" || layer.kind === "footer"
        ? "uppercase"
        : undefined),
    textShadow: shadowStyle(layer.shadow),
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    cursor: interactive && !layer.locked ? "move" : undefined,
    touchAction: interactive ? "none" : undefined,
    userSelect: interactive ? "none" : undefined,
  };
}

/**
 * The most lines each kind of text may take before it shrinks. Chosen above what the built-in
 * templates use, so a normal card is never touched and only very long words are fitted.
 */
const MAX_LINES: Partial<Record<InvitationLayer["kind"], number>> = {
  kicker: 2,
  names: 2,
  message: 3,
  date: 2,
  venue: 3,
  dressCode: 2,
  footer: 2,
};

/**
 * Lines a layer may take before its words shrink. Auto follows the kind's own rule; "shrink" fits
 * every kind (two lines where the kind has no rule); "grow" never shrinks, the box grows instead.
 */
export function linesFor(layer: InvitationLayer): number | undefined {
  if (layer.textFit === "grow") return undefined;
  if (layer.textFit === "shrink") return MAX_LINES[layer.kind] ?? 2;
  return MAX_LINES[layer.kind];
}

/**
 * A text layer that keeps the headline to a fixed number of lines. A very long pair of names
 * shrinks (down to 45%) instead of wrapping into the lines below it. Sizes are container-query
 * units, so the line count does not change as the card scales: it is measured once per change.
 */
function FittedText({
  layer,
  maxLines,
  style,
  pointerProps,
}: {
  layer: InvitationLayer;
  maxLines?: number;
  style: React.CSSProperties;
  pointerProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!maxLines) {
      // Not fitting (or no longer): undo any earlier shrink so the words return to full size.
      el.style.fontSize = `${layer.size}cqw`;
      return;
    }
    const fit = () => {
      let scale = 1;
      el.style.fontSize = `${layer.size}cqw`;
      for (let i = 0; i < 10 && scale > 0.45; i++) {
        const cs = getComputedStyle(el);
        const lineHeight =
          parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.35;
        if (!lineHeight || el.scrollHeight / lineHeight <= maxLines + 0.15)
          break;
        scale = Math.max(0.45, scale - 0.07);
        el.style.fontSize = `${layer.size * scale}cqw`;
      }
    };
    fit();
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    return () => {
      cancelled = true;
    };
  }, [
    layer.text,
    layer.size,
    layer.width,
    layer.font,
    layer.weight,
    maxLines,
    layer.tracking,
    layer.lineHeight,
  ]);
  return (
    <div ref={ref} data-layer-id={layer.id} style={style} {...pointerProps}>
      {layer.text}
    </div>
  );
}

/**
 * The one invitation under an event. The overview, the studio and the guest pass all render this
 * component from the same saved design, so a host never sees two different cards for one wedding.
 */
/**
 * The text box while a layer's words are being typed. The browser owns the text and the caret
 * while it is open, so the words are rendered once from where editing began: re-rendering them
 * from state on every keystroke would reset the caret to the start and reverse what is typed.
 */
function InlineTextEditor({
  layer,
  onChange,
  onStop,
  style,
}: {
  layer: InvitationLayer;
  onChange?: (id: string, value: string) => void;
  onStop?: (cancel?: boolean) => void;
  style: React.CSSProperties;
}) {
  const [initial] = React.useState(layer.text);
  return (
    <div
      data-layer-id={layer.id}
      data-editing-text
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={`Edit ${layer.name || "text"}`}
      ref={(el) => {
        if (el && document.activeElement !== el) {
          el.focus();
          const range = document.createRange();
          range.selectNodeContents(el);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }}
      onInput={(e) => {
        const value = (e.currentTarget.innerText ?? "")
          .slice(0, 600)
          .replace(/[\uD800-\uDBFF]$/, "");
        onChange?.(layer.id, value);
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand(
          "insertText",
          false,
          e.clipboardData.getData("text/plain")
        );
      }}
      onBlur={() => onStop?.()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onStop?.(true);
        }
      }}
      style={style}
    >
      {initial}
    </div>
  );
}

export function InvitationCard({
  design: savedDesign,
  coupleName,
  className = "",
  entryCode = null,
  sampleEntry = false,
  selectedLayerId = null,
  selectedLayerIds = null,
  onLayerPointerDown,
  editingLayerId = null,
  onLayerTextChange,
  onStopEditingText,
}: InvitationCardProps) {
  const design = constrainEntrySeals(savedDesign);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hasRenderedPass =
    Boolean(entryCode || sampleEntry) &&
    design.layers.some((layer) => layer.kind === "code" && layer.visible);
  const layerKeys = design.layers.map((layer) => layer.id).join("|");
  useLayoutEffect(() => {
    if (hasRenderedPass && canvasRef.current)
      updateEntrySealPlates(canvasRef.current);
  });
  useLayoutEffect(() => {
    const root = canvasRef.current;
    if (!root || !hasRenderedPass) return;
    let active = true;
    const update = () => {
      if (active) updateEntrySealPlates(root);
    };
    update();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(root);
    root
      .querySelectorAll<HTMLElement>("[data-layer-id]")
      .forEach((layer) => observer?.observe(layer));
    document.fonts?.ready.then(update).catch(() => {});
    document.fonts?.addEventListener?.("loadingdone", update);
    return () => {
      active = false;
      observer?.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", update);
    };
  }, [layerKeys, hasRenderedPass]);
  const { palette, background } = design;
  const interactive = Boolean(onLayerPointerDown);
  const paper = `radial-gradient(120% 90% at 20% 0%, ${palette.paper} 0%, ${palette.paper} 55%, ${palette.paperEdge} 100%)`;
  const velvet = `linear-gradient(160deg, ${palette.stageFrom}, ${palette.stageTo})`;
  const hasImage = background.kind === "image" && Boolean(background.imageUrl);
  const flat = background.kind === "color" && background.color;
  const surface = flat
    ? (background.color as string)
    : background.kind === "velvet"
      ? velvet
      : paper;
  const chrome = design.chrome !== false;
  const edgeStyle = design.canvas?.edgeStyle ?? "sharp";
  const cornerRadiusPx = design.canvas?.cornerRadiusPx;
  const nativeWidth = design.canvas?.widthPx ?? 1080;
  const radius = cornerRadiusPx ?? 16;
  // Root percentages scale with the paper itself; cqw on the root would refer to its ancestor.
  const borderRadius =
    edgeStyle === "rounded"
      ? `${(radius / nativeWidth) * 100}% / ${(radius / (nativeWidth / designRatio(design))) * 100}%`
      : "0px";

  const paperShadow = !chrome
    ? "0 1px 3px rgba(0,0,0,0.08), 0 18px 45px -12px rgba(0,0,0,0.45)"
    : background.kind === "velvet"
      ? `inset 0 0 0 1px ${palette.foil}66, 0 1px 3px rgba(0,0,0,0.08), 0 20px 48px -15px rgba(0,0,0,0.55)`
      : `inset 0 0 0 1px ${palette.foil}59, inset 0 0 0 6px ${palette.paper}, inset 0 0 0 7px ${palette.foil}73, 0 1px 4px rgba(0,0,0,0.08), 0 20px 45px -12px rgba(28,7,13,0.45)`;

  return (
    <div
      data-testid="invitation-card"
      ref={canvasRef}
      data-invitation-canvas
      role="group"
      aria-label="Invitation design"
      className={`relative w-full overflow-hidden ${edgeStyle === "deckled" ? "deckled-paper" : ""} ${className}`}
      style={{
        aspectRatio: String(designRatio(design)),
        containerType: "inline-size",
        background: surface,
        borderRadius,
        boxShadow: paperShadow,
      }}
    >
      {hasImage && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: cssUrl(background.imageUrl),
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: palette.paper, opacity: background.overlay }}
          />
        </>
      )}

      {chrome && (
        <>
          <span className="foil-sheen" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0"
            style={{
              height: "3.2%",
              background: `linear-gradient(90deg, ${palette.ribbonA} 0 70%, ${palette.ribbonB} 70% 100%)`,
            }}
          />
          <div
            aria-hidden="true"
            className="weave absolute inset-x-0 top-0 opacity-30 mix-blend-overlay"
            style={{ height: "3.2%" }}
          />
        </>
      )}

      {design.layers.map((layer) => {
        if (!layer.visible) return null;
        const selected = selectedLayerIds
          ? selectedLayerIds.includes(layer.id)
          : selectedLayerId === layer.id;
        const selection: React.CSSProperties = selected
          ? {
              outline: `1px dashed ${palette.foil}`,
              outlineOffset: "3px",
            }
          : {};
        const movable = interactive && !layer.locked;
        const filterParts: string[] = [];
        if (layer.blur) filterParts.push(`blur(${layer.blur}px)`);
        if (layer.brightness != null && layer.brightness !== 0) {
          filterParts.push(`brightness(${100 + layer.brightness}%)`);
        }
        if (layer.contrast != null && layer.contrast !== 0) {
          filterParts.push(`contrast(${100 + layer.contrast}%)`);
        }
        if (layer.saturate != null && layer.saturate !== 0) {
          filterParts.push(`saturate(${100 + layer.saturate}%)`);
        }
        if (layer.sepia != null && layer.sepia > 0) {
          filterParts.push(`sepia(${layer.sepia}%)`);
        }
        if (layer.grayscale != null && layer.grayscale > 0) {
          filterParts.push(`grayscale(${layer.grayscale}%)`);
        }
        if (layer.shadow === "foil") {
          filterParts.push(
            "drop-shadow(0 2px 4px rgba(184, 134, 75, 0.45)) drop-shadow(0 0 2px rgba(255, 235, 175, 0.6))"
          );
        } else if (layer.shadow === "soft") {
          filterParts.push("drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25))");
        } else if (layer.shadow === "glow") {
          filterParts.push(
            "drop-shadow(0 0 12px rgba(255, 215, 0, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))"
          );
        } else if (layer.shadowBlur || layer.shadowX || layer.shadowY) {
          const sx = layer.shadowX ?? 0;
          const sy = layer.shadowY ?? 4;
          const sb = layer.shadowBlur ?? 8;
          const sc = layer.shadowColor ?? "rgba(0, 0, 0, 0.35)";
          filterParts.push(`drop-shadow(${sx}px ${sy}px ${sb}px ${sc})`);
        }

        const transformParts: string[] = [];
        if (layer.rotation) transformParts.push(`rotate(${layer.rotation}deg)`);
        if (layer.flipX) transformParts.push("scaleX(-1)");
        if (layer.flipY) transformParts.push("scaleY(-1)");

        const common: React.CSSProperties = {
          ...(transformParts.length > 0
            ? { transform: transformParts.join(" ") }
            : {}),
          ...(layer.opacity != null && layer.opacity < 1
            ? { opacity: layer.opacity }
            : {}),
          ...(layer.blendMode && layer.blendMode !== "normal"
            ? {
                mixBlendMode:
                  layer.blendMode as React.CSSProperties["mixBlendMode"],
              }
            : {}),
          ...(filterParts.length > 0 ? { filter: filterParts.join(" ") } : {}),
          ...selection,
        };
        const pointerProps = interactive
          ? {
              onPointerDown: (event: React.PointerEvent<HTMLDivElement>) =>
                onLayerPointerDown?.(event, layer),
            }
          : {};

        const isDarkBg = isCardBackgroundDark(background, palette);

        if (layer.kind === "seal") {
          return (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              style={{
                position: "absolute",
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                aspectRatio: "1",
                cursor: movable ? "move" : interactive ? "default" : undefined,
                touchAction: interactive ? "none" : undefined,
                ...common,
              }}
              {...pointerProps}
            >
              <MonogramSeal
                text={coupleName || layer.text}
                size="100%"
                className="drop-shadow-md"
                contrastWithDark={isDarkBg}
                waxColor={layer.fill || layer.color}
              />
            </div>
          );
        }

        if (layer.kind === "code") {
          const value = entryCode ?? (sampleEntry ? SAMPLE_ENTRY_CODE : null);
          // Without a code (a guest who has not accepted) the seal is simply not on the card.
          if (!value) return null;
          return (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              data-entry-seal
              style={{
                position: "absolute",
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${Math.max(layer.width, 16)}%`,
                aspectRatio: "1",
                cursor: movable ? "move" : interactive ? "default" : undefined,
                touchAction: interactive ? "none" : undefined,
                ...common,
                // A pass is functional content: decorative effects must not erase or mirror it.
                opacity: 1,
                zIndex: 1,
                filter: "none",
                mixBlendMode: "normal",
                transform: layer.rotation
                  ? `rotate(${layer.rotation}deg)`
                  : undefined,
              }}
              {...pointerProps}
            >
              <EntrySeal
                value={value}
                palette={palette}
                plate={background.kind !== "paper" || isDarkBg}
              />
            </div>
          );
        }

        if (layer.kind === "divider") {
          return (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                display: "flex",
                alignItems: "center",
                gap: "2cqw",
                color: colourFor(layer, design),
                cursor: movable ? "move" : interactive ? "default" : undefined,
                touchAction: interactive ? "none" : undefined,
                ...common,
              }}
              {...pointerProps}
            >
              <span
                style={{
                  flex: 1,
                  height: "1px",
                  background: "currentColor",
                  opacity: 0.5,
                }}
              />
              <span style={{ fontSize: "3cqw", lineHeight: 1 }}>✦</span>
              <span
                style={{
                  flex: 1,
                  height: "1px",
                  background: "currentColor",
                  opacity: 0.5,
                }}
              />
            </div>
          );
        }

        if (layer.kind === "shape") {
          const line = layer.shape === "line";
          const stroke = layer.stroke ?? null;
          const shapeStyle = getShapeStyle(layer.shape, layer.radius, {
            tl: layer.radiusTL,
            tr: layer.radiusTR,
            br: layer.radiusBR,
            bl: layer.radiusBL,
          });
          const background = line
            ? (stroke ?? layer.fill ?? "#b8864b")
            : layer.gradient || layer.fill || "transparent";
          return (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                height: `${layer.height ?? 20}%`,
                background,
                border:
                  !line && stroke && !shapeStyle.clipPath
                    ? `${layer.strokeWidth ?? 0.4}cqw solid ${stroke}`
                    : undefined,
                ...shapeStyle,
                cursor: movable ? "move" : interactive ? "default" : undefined,
                touchAction: interactive ? "none" : undefined,
                ...common,
              }}
              {...pointerProps}
            />
          );
        }

        if (layer.kind === "image") {
          if (!layer.imageUrl) return null;
          const maskStyle = getShapeStyle(layer.maskShape, layer.radius, {
            tl: layer.radiusTL,
            tr: layer.radiusTR,
            br: layer.radiusBR,
            bl: layer.radiusBL,
          });
          const focalX = layer.focalX ?? 50;
          const focalY = layer.focalY ?? 50;
          return (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              role="img"
              aria-label={layer.name || "Image"}
              style={{
                position: "absolute",
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                height: `${layer.height ?? 30}%`,
                backgroundImage: cssUrl(layer.imageUrl),
                backgroundSize: layer.fit === "contain" ? "contain" : "cover",
                backgroundPosition: `${focalX}% ${focalY}%`,
                backgroundRepeat: "no-repeat",
                border:
                  layer.stroke && !maskStyle.clipPath
                    ? `${layer.strokeWidth ?? 0.4}cqw solid ${layer.stroke}`
                    : undefined,
                ...maskStyle,
                cursor: movable ? "move" : interactive ? "default" : undefined,
                touchAction: interactive ? "none" : undefined,
                ...common,
              }}
              {...pointerProps}
            />
          );
        }

        if (editingLayerId === layer.id) {
          return (
            <InlineTextEditor
              key={layer.id}
              layer={layer}
              onChange={onLayerTextChange}
              onStop={onStopEditingText}
              style={{
                ...textStyle(layer, design, false),
                ...common,
                cursor: "text",
                userSelect: "text",
                outline: `1.5px solid ${palette.foil}`,
                outlineOffset: "2px",
                zIndex: 40,
                caretColor: palette.foil || "#b8864b",
              }}
            />
          );
        }

        return (
          <FittedText
            key={layer.id}
            layer={layer}
            maxLines={linesFor(layer)}
            style={{ ...textStyle(layer, design, interactive), ...common }}
            pointerProps={pointerProps}
          />
        );
      })}
    </div>
  );
}

"use client";

import React from "react";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";
import { resolveLayerColour } from "../design";
import { designRatio } from "../layer-ops";
import { EntrySeal, SAMPLE_ENTRY_CODE } from "./EntrySeal";
import type { InvitationDesign, InvitationLayer } from "../types";

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
  onLayerPointerDown?: (
    event: React.PointerEvent<HTMLDivElement>,
    layer: InvitationLayer
  ) => void;
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
    fontFamily:
      layer.font === "display"
        ? "var(--font-display), 'Bodoni Moda', Georgia, serif"
        : "var(--font-sans), 'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: `${layer.size}cqw`,
    fontWeight: layer.weight,
    fontStyle: layer.italic ? "italic" : "normal",
    letterSpacing: `${layer.tracking}em`,
    lineHeight: 1.35,
    color: colourFor(layer, design),
    textTransform:
      layer.kind === "kicker" || layer.kind === "footer"
        ? "uppercase"
        : undefined,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    cursor: interactive && !layer.locked ? "move" : undefined,
    touchAction: interactive ? "none" : undefined,
    userSelect: interactive ? "none" : undefined,
  };
}

/**
 * The one invitation under an event. The overview, the studio and the guest pass all render this
 * component from the same saved design, so a host never sees two different cards for one wedding.
 */
export function InvitationCard({
  design,
  coupleName,
  className = "",
  entryCode = null,
  sampleEntry = false,
  selectedLayerId = null,
  onLayerPointerDown,
}: InvitationCardProps) {
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

  return (
    <div
      data-testid="invitation-card"
      data-invitation-canvas
      role="group"
      aria-label="Invitation design"
      className={`relative w-full overflow-hidden rounded-[20px] ${className}`}
      style={{
        aspectRatio: String(designRatio(design)),
        containerType: "inline-size",
        background: surface,
        boxShadow: !chrome
          ? "0 24px 48px -28px rgba(0,0,0,0.6)"
          : background.kind === "velvet"
            ? `inset 0 0 0 1px ${palette.foil}66, 0 24px 48px -28px rgba(0,0,0,0.6)`
            : `inset 0 0 0 1px ${palette.foil}59, inset 0 0 0 6px ${palette.paper}, inset 0 0 0 7px ${palette.foil}73, 0 24px 48px -28px rgba(28,7,13,0.55)`,
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
        const selected = selectedLayerId === layer.id;
        const selection: React.CSSProperties = selected
          ? {
              outline: `1px dashed ${palette.foil}`,
              outlineOffset: "3px",
              borderRadius: "2px",
            }
          : {};
        const movable = interactive && !layer.locked;
        const common: React.CSSProperties = {
          ...(layer.rotation
            ? { transform: `rotate(${layer.rotation}deg)` }
            : {}),
          ...(layer.opacity != null && layer.opacity < 1
            ? { opacity: layer.opacity }
            : {}),
          ...selection,
        };
        const pointerProps = interactive
          ? {
              onPointerDown: (event: React.PointerEvent<HTMLDivElement>) =>
                onLayerPointerDown?.(event, layer),
            }
          : {};

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
              }}
              {...pointerProps}
            >
              <EntrySeal
                value={value}
                palette={palette}
                plate={background.kind !== "paper"}
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
                background: line
                  ? (stroke ?? layer.fill ?? "#b8864b")
                  : (layer.fill ?? "transparent"),
                border:
                  !line && stroke
                    ? `${layer.strokeWidth ?? 0.4}cqw solid ${stroke}`
                    : undefined,
                borderRadius:
                  layer.shape === "ellipse" ? "50%" : `${layer.radius ?? 0}cqw`,
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
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                borderRadius: `${layer.radius ?? 0}cqw`,
                cursor: movable ? "move" : interactive ? "default" : undefined,
                touchAction: interactive ? "none" : undefined,
                ...common,
              }}
              {...pointerProps}
            />
          );
        }

        return (
          <div
            key={layer.id}
            data-layer-id={layer.id}
            style={{ ...textStyle(layer, design, interactive), ...common }}
            {...pointerProps}
          >
            {layer.text}
          </div>
        );
      })}
    </div>
  );
}

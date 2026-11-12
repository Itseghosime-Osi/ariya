"use client";

import React, { useEffect, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { StudioTool } from "./ContextualOptionsBar";

export type AddKind =
  | "text"
  | "rect"
  | "ellipse"
  | "line"
  | "arch"
  | "star"
  | "diamond"
  | "crest"
  | "triangle"
  | "seal"
  | "code";

const svg = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ToolButton({
  label,
  shortcut,
  onClick,
  disabled,
  active,
  hasFlyout,
  dark,
  children,
  ref,
  ...buttonProps
}: {
  ref?: React.Ref<HTMLButtonElement>;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  hasFlyout?: boolean;
  dark?: boolean;
  children: React.ReactNode;
} & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "onClick"
>) {
  return (
    <div className="relative group">
      <button
        {...buttonProps}
        ref={ref}
        type="button"
        aria-pressed={active}
        aria-label={label}
        aria-keyshortcuts={shortcut}
        title={shortcut ? `${label} (${shortcut})` : label}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "relative grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--studio-gold)]",
          active
            ? dark
              ? "bg-[#3d2733] text-[var(--studio-gold)] shadow-inner"
              : "bg-[var(--studio-wine)]/10 text-[var(--studio-wine)] shadow-inner font-semibold"
            : dark
              ? "text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
              : "text-[#4a363f] hover:bg-[var(--studio-wine)]/5 hover:text-[var(--studio-wine)] disabled:opacity-30"
        )}
      >
        {children}
        {hasFlyout && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute bottom-1 right-1 h-0 w-0 border-b-[4px] border-l-[4px] border-l-transparent",
              dark ? "border-b-zinc-400" : "border-b-[var(--studio-wine)]/60"
            )}
          />
        )}
      </button>

      {/* Hover tooltip */}
      <div
        className={cn(
          "pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 z-50 hidden rounded-md px-2 py-1 text-xs font-medium shadow-xl whitespace-nowrap group-hover:block border",
          dark
            ? "bg-[#23181e] text-[var(--studio-cream)] border-white/15"
            : "bg-[#ffffff] text-[var(--studio-ink)] border-[#e6ded2] shadow-black/10"
        )}
      >
        <span>{label}</span>
        {shortcut && (
          <span
            className={cn(
              "ml-1.5 font-mono",
              dark ? "text-zinc-400" : "text-zinc-500"
            )}
          >
            ({shortcut})
          </span>
        )}
      </div>
    </div>
  );
}

const Divider = ({ dark }: { dark?: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      "my-1.5 h-px w-6 shrink-0 max-lg:h-6 max-lg:w-px max-lg:my-0 max-lg:mx-1",
      dark ? "bg-white/15" : "bg-black/10"
    )}
  />
);

const SHAPES_CATALOG: Array<{
  kind: AddKind;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
}> = [
  {
    kind: "rect",
    label: "Rectangle",
    shortcut: "R",
    icon: (
      <svg {...svg}>
        <rect x="4" y="6" width="16" height="12" rx="2" />
      </svg>
    ),
  },
  {
    kind: "ellipse",
    label: "Circle / Oval",
    shortcut: "O",
    icon: (
      <svg {...svg}>
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    kind: "arch",
    label: "Cathedral Arch",
    shortcut: "A",
    icon: (
      <svg {...svg}>
        <path d="M5 20V9a7 7 0 0 1 14 0v11" />
      </svg>
    ),
  },
  {
    kind: "line",
    label: "Line Divider",
    shortcut: "L",
    icon: (
      <svg {...svg}>
        <path d="M4 18 20 6" />
      </svg>
    ),
  },
  {
    kind: "star",
    label: "Star / Sparkle",
    shortcut: "S",
    icon: (
      <svg {...svg}>
        <path d="M12 2l2.5 6.5L21 11l-5 4.5 1.5 7L12 19l-5.5 3.5 1.5-7-5-4.5 6.5-2.5z" />
      </svg>
    ),
  },
  {
    kind: "diamond",
    label: "Diamond",
    icon: (
      <svg {...svg}>
        <polygon points="12 3, 21 12, 12 21, 3 12" />
      </svg>
    ),
  },
  {
    kind: "crest",
    label: "Crest / Shield",
    icon: (
      <svg {...svg}>
        <path d="M12 3L4 6v6c0 5 8 9 8 9s8-4 8-9V6z" />
      </svg>
    ),
  },
  {
    kind: "triangle",
    label: "Triangle",
    icon: (
      <svg {...svg}>
        <polygon points="12 4, 21 20, 3 20" />
      </svg>
    ),
  },
];

export function ToolRail({
  activeTool = "select",
  onSelectTool,
  onAdd,
  onPickImage,
  onSampleColor,
  onImportCard,
  hasEntrySeal,
  busy,
  activeShapeKind,
  onSelectShapeKind,
  activeColor = "#dfba73",
  onColorChange,
  onOpenColorPicker,
  dark = false,
}: {
  activeTool?: StudioTool;
  onSelectTool?: (tool: StudioTool) => void;
  activeShapeKind?: "rect" | "ellipse" | "arch" | "line" | "star";
  onSelectShapeKind?: (
    kind: "rect" | "ellipse" | "arch" | "line" | "star"
  ) => void;
  onAdd: (kind: AddKind) => void;
  onPickImage: () => void;
  onSampleColor: () => void;
  onImportCard: () => void;
  hasEntrySeal: boolean;
  busy: boolean;
  activeColor?: string;
  onColorChange?: (color: string) => void;
  onOpenColorPicker?: () => void;
  dark?: boolean;
}) {
  const [vertical, setVertical] = useState(true);
  useEffect(() => {
    const media = window.matchMedia(
      "(min-width: 1024px), (min-width: 600px) and (max-height: 550px)"
    );
    const update = () => setVertical(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(activeColor);
  const [secondaryColor, setSecondaryColor] = useState("#4a0e17"); // House Burgundy
  const resetColors = () => {
    setPrimaryColor("#000000");
    setSecondaryColor("#ffffff");
    onColorChange?.("#000000");
  };
  const swapColors = () => {
    setPrimaryColor(secondaryColor);
    setSecondaryColor(primaryColor);
    onColorChange?.(secondaryColor);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        target?.closest(
          "input,textarea,select,[contenteditable=true],[role=dialog]"
        ) ||
        document.querySelector(
          '[role="dialog"]:not([hidden]), [role="menu"]:not([hidden])'
        )
      )
        return;
      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        resetColors();
      }
      if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        swapColors();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  useEffect(() => {
    setPrimaryColor(activeColor);
  }, [activeColor]);

  return (
    <div
      className={cn(
        "relative h-full flex flex-col justify-between items-center py-2 select-none border-r transition-colors lg:[@media(max-height:940px)]:overflow-y-auto lg:[@media(max-height:940px)]:overflow-x-hidden",
        dark
          ? "bg-[var(--studio-night)] border-[#382630] text-zinc-200"
          : "bg-[#fcfbfa] border-[var(--studio-line)] text-[#3b2b31]"
      )}
    >
      <div
        role="toolbar"
        aria-label="Design tools"
        aria-orientation={vertical ? "vertical" : "horizontal"}
        className="flex items-center gap-1 overflow-x-auto max-lg:max-w-full lg:flex-col lg:overflow-visible"
      >
        {/* Move & Select Tool (V) */}
        <ToolButton
          label="Move & Select"
          shortcut="V"
          dark={dark}
          active={activeTool === "select"}
          onClick={() => onSelectTool?.("select")}
        >
          <svg {...svg}>
            <path d="m3 3 7 18 3-7 7-3L3 3z" />
          </svg>
        </ToolButton>

        {/* Crop & Artboard Tool (C) */}
        <ToolButton
          label="Canvas size & ratio"
          shortcut="C"
          dark={dark}
          active={activeTool === "crop"}
          onClick={() => onSelectTool?.("crop")}
        >
          <svg {...svg}>
            <path d="M6 2v14a2 2 0 0 0 2 2h14" />
            <path d="M18 22V8a2 2 0 0 0-2-2H2" />
          </svg>
        </ToolButton>

        {/* Text Tool (T) */}
        <ToolButton
          label="Type text"
          shortcut="T"
          dark={dark}
          active={activeTool === "text"}
          onClick={() => {
            onSelectTool?.("text");
            onAdd("text");
          }}
        >
          <svg {...svg}>
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </ToolButton>

        {/* Cathedral Arch Quick Tool (A) */}
        <ToolButton
          label="Cathedral Arch"
          shortcut="A"
          dark={dark}
          onClick={() => onAdd("arch")}
        >
          <svg {...svg}>
            <path d="M5 20V9a7 7 0 0 1 14 0v11" />
          </svg>
        </ToolButton>

        {/* Shapes Flyout Tool (U) */}
        <DropdownMenu.Root
          open={shapesMenuOpen}
          onOpenChange={setShapesMenuOpen}
        >
          <DropdownMenu.Trigger asChild>
            <ToolButton
              label="Vector Shapes & Geometry"
              shortcut="U"
              hasFlyout
              dark={dark}
              active={activeTool === "shape" || shapesMenuOpen}
              onClick={() => {
                onSelectTool?.("shape");
              }}
            >
              <svg {...svg}>
                <rect x="3" y="3" width="10" height="10" rx="1.5" />
                <circle cx="16" cy="16" r="5" />
              </svg>
            </ToolButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              side="right"
              align="start"
              sideOffset={8}
              collisionPadding={12}
              aria-label="Shape presets"
              aria-labelledby={undefined}
              className={cn(
                "z-50 rounded-xl border p-3 shadow-2xl backdrop-blur-md w-64 animate-in fade-in zoom-in-95 duration-150",
                dark
                  ? "border-[#382630] bg-[var(--studio-night)] text-white"
                  : "border-[var(--studio-line)] bg-[#ffffff] text-[var(--studio-ink)] shadow-black/15"
              )}
            >
              <div
                className={cn(
                  "mb-2 px-1 text-xs font-semibold uppercase tracking-wider",
                  dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
                )}
              >
                Vector Shapes & Geometry
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SHAPES_CATALOG.map((shape) => (
                  <DropdownMenu.Item
                    key={shape.kind}
                    onSelect={() => {
                      if (
                        shape.kind === "rect" ||
                        shape.kind === "ellipse" ||
                        shape.kind === "arch" ||
                        shape.kind === "line" ||
                        shape.kind === "star"
                      ) {
                        onSelectShapeKind?.(shape.kind);
                      }
                      onSelectTool?.("shape");
                      onAdd(shape.kind);
                      setShapesMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2 text-left text-xs font-medium transition",
                      activeShapeKind === shape.kind &&
                        (dark
                          ? "border-[var(--studio-gold)] bg-[var(--studio-gold)]/10"
                          : "border-[var(--studio-wine)] bg-[var(--studio-wine)]/5"),
                      dark
                        ? "border-white/5 text-zinc-200 hover:border-[var(--studio-gold)]/40 hover:bg-white/10 hover:text-white"
                        : "border-[var(--studio-line)] text-[#3b2b31] hover:border-[var(--studio-wine)]/30 hover:bg-[var(--studio-wine)]/5 hover:text-[var(--studio-wine)]"
                    )}
                  >
                    <span className="shrink-0 text-[#b8864b]">
                      {shape.icon}
                    </span>
                    <span className="truncate">{shape.label}</span>
                  </DropdownMenu.Item>
                ))}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Gradient Tool (G) */}
        <ToolButton
          label="Gradient Fill"
          shortcut="G"
          dark={dark}
          active={activeTool === "gradient"}
          onClick={() => onSelectTool?.("gradient")}
        >
          <span className="h-4 w-4 rounded-sm bg-gradient-to-tr from-amber-600 via-amber-300 to-amber-100 border border-white/40 shadow-xs" />
        </ToolButton>

        {/* Eyedropper Tool (I) */}
        <ToolButton
          label="Eyedropper sampler"
          shortcut="I"
          dark={dark}
          active={activeTool === "eyedropper"}
          onClick={onSampleColor}
        >
          <svg {...svg}>
            <path d="m14 2 6 6-9.5 9.5a3 3 0 0 1-1.5.8L4 20l1.7-5a3 3 0 0 1 .8-1.5L16 4Z" />
            <path d="m17 5 2 2" />
          </svg>
        </ToolButton>

        <Divider dark={dark} />

        {/* Picture / Image Upload Tool (Shift+I) */}
        <ToolButton
          label="Place image / photo"
          shortcut="⇧I"
          dark={dark}
          onClick={onPickImage}
          disabled={busy}
        >
          <svg {...svg}>
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </ToolButton>

        {/* Import Full Card Design Tool (M) */}
        <ToolButton
          label="Import external design"
          shortcut="M"
          dark={dark}
          onClick={onImportCard}
          disabled={busy}
        >
          <svg {...svg}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </ToolButton>

        {/* Luxury Wax Seal */}
        <ToolButton
          label="Add monogram seal"
          dark={dark}
          onClick={() => onAdd("seal")}
        >
          <Icon name="celebration" size={18} />
        </ToolButton>

        {/* Security QR Pass */}
        <ToolButton
          label={hasEntrySeal ? "Guest pass seal added" : "Add guest pass seal"}
          dark={dark}
          onClick={() => onAdd("code")}
          disabled={hasEntrySeal}
        >
          <Icon name="qr_code_scanner" size={18} />
        </ToolButton>

        <Divider dark={dark} />

        {/* Hand Tool (H) */}
        <ToolButton
          label="Hand / Pan"
          shortcut="H"
          dark={dark}
          active={activeTool === "hand"}
          onClick={() => onSelectTool?.("hand")}
        >
          <svg {...svg}>
            <path d="M18 11V6a2 2 0 0 0-4 0v5" />
            <path d="M14 10V4a2 2 0 0 0-4 0v7" />
            <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
        </ToolButton>

        {/* Zoom Tool (Z) */}
        <ToolButton
          label="Zoom Tool"
          shortcut="Z"
          dark={dark}
          active={activeTool === "zoom"}
          onClick={() => onSelectTool?.("zoom")}
        >
          <svg {...svg}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </ToolButton>
        <div className="flex gap-1 lg:hidden">
          <ToolButton
            label="Default colours"
            shortcut="D"
            onClick={resetColors}
            dark={dark}
          >
            <Icon name="swatch" size={18} />
          </ToolButton>
          <ToolButton
            label="Swap colours"
            shortcut="X"
            onClick={swapColors}
            dark={dark}
          >
            <span aria-hidden="true">⇄</span>
          </ToolButton>
        </div>
      </div>

      {/* Dual Color Swatches at bottom of ToolRail */}
      <div className="hidden lg:flex flex-col items-center gap-1.5 pb-2">
        {/* Reset to black/white button (D) */}
        <button
          type="button"
          title="Default black and white colours (D)"
          aria-label="Default colours"
          onClick={() => {
            setPrimaryColor("#000000");
            setSecondaryColor("#ffffff");
            onColorChange?.("#000000");
          }}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--studio-gold)]",
            dark
              ? "text-zinc-300 hover:bg-white/10 hover:text-white"
              : "text-[#4a363f] hover:bg-[var(--studio-wine)]/5 hover:text-[var(--studio-wine)]"
          )}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect
              x="1"
              y="1"
              width="8"
              height="8"
              fill="#000"
              stroke="#fff"
              strokeWidth="1"
            />
            <rect
              x="7"
              y="7"
              width="8"
              height="8"
              fill="#fff"
              stroke="#888"
              strokeWidth="1"
            />
          </svg>
        </button>

        <div className="relative h-9 w-9">
          {/* Secondary / Background Swatch */}
          <div
            title="Background / Secondary colour"
            className="absolute bottom-0 right-0 h-6 w-6 rounded border border-white/20 shadow-md cursor-pointer transition-transform hover:scale-105"
            style={{ background: secondaryColor }}
            onClick={() => {
              const tmp = primaryColor;
              setPrimaryColor(secondaryColor);
              setSecondaryColor(tmp);
              onColorChange?.(secondaryColor);
            }}
          />
          {/* Primary / Foreground Swatch */}
          <div
            title="Active Fill colour (Click to open Color Panel)"
            className="absolute top-0 left-0 h-6 w-6 rounded border-2 border-white/70 shadow-md cursor-pointer transition-transform hover:scale-105 z-10"
            style={{ background: primaryColor }}
            onClick={() => onOpenColorPicker?.()}
          />
        </div>

        {/* Swap button (X) */}
        <button
          type="button"
          title="Swap foreground/background colours (X)"
          aria-label="Swap colours"
          onClick={() => {
            const tmp = primaryColor;
            setPrimaryColor(secondaryColor);
            setSecondaryColor(tmp);
            onColorChange?.(secondaryColor);
          }}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--studio-gold)]",
            dark
              ? "text-zinc-300 hover:bg-white/10 hover:text-white"
              : "text-[#4a363f] hover:bg-[var(--studio-wine)]/5 hover:text-[var(--studio-wine)]"
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m7 16-4-4 4-4" />
            <path d="M3 12h18" />
            <path d="m17 8 4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

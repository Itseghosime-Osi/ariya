"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  INVITATION_LAYER_LABELS,
  INVITATION_SHAPE_LABELS,
  type InvitationLayer,
} from "../../types";
import type { StackMove } from "../../layer-ops";

const TEXT_KINDS = new Set([
  "kicker",
  "names",
  "message",
  "date",
  "venue",
  "dressCode",
  "footer",
  "text",
]);

const BLEND_MODES = [
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

export function layerLabel(layer: InvitationLayer): string {
  if (layer.name?.trim()) return layer.name.trim();
  if (layer.kind === "shape") {
    return INVITATION_SHAPE_LABELS[layer.shape ?? "rect"] ?? "Shape";
  }
  const words = layer.text.trim().replace(/\s+/g, " ");
  if (words && layer.kind !== "seal") return words.slice(0, 28);
  return INVITATION_LAYER_LABELS[layer.kind];
}

function LayerThumbnail({
  layer,
  dark,
}: {
  layer: InvitationLayer;
  dark?: boolean;
}) {
  if (layer.kind === "image" && layer.imageUrl) {
    return (
      <div
        className={cn(
          "relative h-7 w-7 shrink-0 overflow-hidden rounded border",
          dark ? "border-white/20 bg-black/40" : "border-black/10 bg-white"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={layer.imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (layer.kind === "shape") {
    const bg = layer.gradient || layer.fill || "#b8864b";
    const isCircle = layer.shape === "ellipse";
    const isArch = layer.shape === "arch";
    const isDiamond = layer.shape === "diamond";
    return (
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded border p-1",
          dark ? "border-white/20 bg-black/40" : "border-black/10 bg-white"
        )}
      >
        <div
          className={cn(
            "h-4 w-4 border border-white/30 shadow-2xs",
            isCircle && "rounded-full",
            isArch && "rounded-t-full",
            isDiamond && "rotate-45 scale-75",
            !isCircle && !isArch && !isDiamond && "rounded-[2px]"
          )}
          style={{ background: bg }}
        />
      </div>
    );
  }

  if (TEXT_KINDS.has(layer.kind)) {
    return (
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded border font-serif text-[11px] font-bold",
          dark
            ? "border-white/20 bg-black/40 text-[#dfba73]"
            : "border-black/10 bg-white text-[#4a0e17]"
        )}
      >
        T
      </div>
    );
  }

  if (layer.kind === "seal") {
    return (
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-2xs",
          dark
            ? "border-[#dfba73]/40 bg-[#dfba73]/20 text-[#dfba73]"
            : "border-[#b8864b]/40 bg-[#b8864b]/15 text-[#7a5612]"
        )}
      >
        <Icon name="celebration" size={13} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded border",
        dark
          ? "border-white/20 bg-black/40 text-zinc-400"
          : "border-black/10 bg-white text-zinc-500"
      )}
    >
      <Icon name="swatch" size={13} />
    </div>
  );
}

function RowButton({
  label,
  pressed,
  onClick,
  children,
  disabled,
  dark,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "grid h-7 w-7 shrink-0 place-items-center rounded disabled:opacity-20 transition-colors focus-visible:outline-2",
        dark
          ? "text-zinc-300 hover:bg-white/10 hover:text-white aria-pressed:text-[#dfba73]"
          : "text-[#5c474e] hover:bg-[#4a0e17]/10 hover:text-[#4a0e17] aria-pressed:text-[#4a0e17]"
      )}
    >
      {children}
    </button>
  );
}

function SortableRow({
  layer,
  on,
  at,
  frontIndex,
  canDelete,
  renaming,
  draft,
  setDraft,
  setRenaming,
  finish,
  onSelect,
  onToggleSelect,
  onPatch,
  onStack,
  onDuplicate,
  onDelete,
  dark,
}: {
  layer: InvitationLayer;
  on: boolean;
  at: number;
  frontIndex: number;
  canDelete: (layer: InvitationLayer) => boolean;
  renaming: string | null;
  draft: string;
  setDraft: (s: string) => void;
  setRenaming: (id: string | null) => void;
  finish: (save: boolean) => void;
  onSelect: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  onPatch: (id: string, patch: Partial<InvitationLayer>) => void;
  onStack: (id: string, move: StackMove) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  dark?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="relative mb-1 list-none">
      <div
        role="button"
        tabIndex={0}
        aria-current={on ? "true" : undefined}
        onClick={(e) => {
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            if (onToggleSelect) onToggleSelect(layer.id);
            else onSelect(layer.id);
          } else {
            onSelect(layer.id);
          }
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (e.shiftKey || e.metaKey || e.ctrlKey) {
              if (onToggleSelect) onToggleSelect(layer.id);
              else onSelect(layer.id);
            } else {
              onSelect(layer.id);
            }
          } else if (e.key === "F2") {
            e.preventDefault();
            setDraft(layer.name ?? layerLabel(layer));
            setRenaming(layer.id);
          }
        }}
        className={cn(
          "group flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 transition-all select-none border",
          on
            ? dark
              ? "bg-[#3d2733] text-white border-[#5e384c] shadow-xs"
              : "bg-[#4a0e17]/10 text-[#4a0e17] border-[#4a0e17]/25 shadow-xs font-semibold"
            : dark
              ? "text-zinc-200 border-transparent hover:bg-white/5 hover:text-white"
              : "text-[#3b2b31] border-transparent hover:bg-black/5 hover:text-[#4a0e17]",
          !layer.visible && "opacity-40"
        )}
      >
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder layer"
          className={cn(
            "grid h-6 w-4 shrink-0 cursor-grab place-items-center active:cursor-grabbing",
            dark
              ? "text-zinc-500 hover:text-zinc-200"
              : "text-zinc-400 hover:text-[#4a0e17]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="6" height="12" viewBox="0 0 6 12" fill="currentColor">
            <circle cx="1.5" cy="2" r="1" />
            <circle cx="4.5" cy="2" r="1" />
            <circle cx="1.5" cy="6" r="1" />
            <circle cx="4.5" cy="6" r="1" />
            <circle cx="1.5" cy="10" r="1" />
            <circle cx="4.5" cy="10" r="1" />
          </svg>
        </button>

        {/* Live Visual Thumbnail */}
        <LayerThumbnail layer={layer} dark={dark} />

        {/* Name / Inline Edit */}
        {renaming === layer.id ? (
          <input
            ref={(el) => {
              if (el && document.activeElement !== el) {
                el.focus();
                el.select();
              }
            }}
            value={draft}
            aria-label="Layer name"
            maxLength={60}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") finish(true);
              if (e.key === "Escape") finish(false);
            }}
            onBlur={() => finish(true)}
            className={cn(
              "min-w-0 flex-1 rounded px-2 py-0.5 text-xs outline-none",
              dark
                ? "border border-[#dfba73] bg-[#161619] text-white"
                : "border border-[#4a0e17] bg-white text-[#2d1f24]"
            )}
          />
        ) : (
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-xs font-medium",
              on
                ? dark
                  ? "text-white"
                  : "text-[#4a0e17]"
                : dark
                  ? "text-zinc-200 group-hover:text-white"
                  : "text-[#3b2b31] group-hover:text-[#4a0e17]"
            )}
            title={layerLabel(layer)}
            onDoubleClick={() => {
              setDraft(layer.name ?? layerLabel(layer));
              setRenaming(layer.id);
            }}
          >
            {layerLabel(layer)}
          </span>
        )}

        {/* Visibility Toggle */}
        <RowButton
          label={`${layer.visible ? "Hide" : "Show"} ${layerLabel(layer)}`}
          pressed={!layer.visible}
          dark={dark}
          onClick={() => onPatch(layer.id, { visible: !layer.visible })}
        >
          <Icon
            name={layer.visible ? "visibility" : "visibility_off"}
            size={14}
          />
        </RowButton>

        {/* Lock Toggle */}
        <RowButton
          label={`${layer.locked ? "Unlock" : "Lock"} ${layerLabel(layer)}`}
          pressed={Boolean(layer.locked)}
          dark={dark}
          onClick={() => onPatch(layer.id, { locked: !layer.locked })}
        >
          <Icon
            name="lock"
            size={13}
            className={
              layer.locked
                ? dark
                  ? "text-[#dfba73]"
                  : "text-[#4a0e17]"
                : "opacity-35"
            }
          />
        </RowButton>
      </div>

      {/* Expanded Quick Actions for Selected Layer */}
      {on && (
        <div
          className={cn(
            "mt-1 flex items-center justify-between gap-1 rounded px-2 py-1",
            dark
              ? "bg-white/[0.06] border border-white/10 text-[#fff6dc]"
              : "bg-white border border-[#e8e2d6] text-[#4a363f]"
          )}
        >
          <div className="flex items-center gap-1">
            <RowButton
              label="Bring forward"
              disabled={at === frontIndex}
              dark={dark}
              onClick={() => onStack(layer.id, "up")}
            >
              <Icon name="expand_less" size={15} />
            </RowButton>
            <RowButton
              label="Send backward"
              disabled={at === 0}
              dark={dark}
              onClick={() => onStack(layer.id, "down")}
            >
              <Icon name="expand_more" size={15} />
            </RowButton>
          </div>
          <div className="flex items-center gap-1">
            <RowButton
              label="Rename layer"
              dark={dark}
              onClick={() => {
                setDraft(layer.name ?? layerLabel(layer));
                setRenaming(layer.id);
              }}
            >
              <Icon name="edit" size={13} />
            </RowButton>
            <RowButton
              label="Duplicate layer"
              disabled={layer.kind === "code"}
              dark={dark}
              onClick={() => onDuplicate(layer.id)}
            >
              <Icon name="copy" size={13} />
            </RowButton>
            <RowButton
              label="Delete layer"
              disabled={!canDelete(layer)}
              dark={dark}
              onClick={() => onDelete(layer.id)}
            >
              <Icon name="delete" size={13} />
            </RowButton>
          </div>
        </div>
      )}
    </li>
  );
}

export function LayersDock({
  layers,
  selectedId,
  selectedIds,
  onSelect,
  onToggleSelect,
  onPatch,
  onStack,
  onReorder,
  onDuplicate,
  onDelete,
  canDelete,
  onAddLayer,
  onGroup,
  onOpenFx,
  background,
  dark = false,
}: {
  layers: InvitationLayer[];
  selectedId: string | null;
  selectedIds?: string[];
  onSelect: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  onPatch: (id: string, patch: Partial<InvitationLayer>) => void;
  onStack: (id: string, move: StackMove) => void;
  onReorder?: (newLayers: InvitationLayer[]) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  canDelete: (layer: InvitationLayer) => boolean;
  onAddLayer?: (kind: "text" | "rect") => void;
  onGroup?: () => void;
  onOpenFx?: () => void;
  background?: import("../../types").InvitationBackground;
  dark?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "text" | "media" | "shapes">(
    "all"
  );
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const finish = (save: boolean) => {
    if (renaming && save) {
      onPatch(renaming, { name: draft.trim().slice(0, 60) || undefined });
    }
    setRenaming(null);
  };

  const rows = [...layers].reverse();

  const filteredRows = rows.filter((l) => {
    if (filter === "text") return TEXT_KINDS.has(l.kind);
    if (filter === "media")
      return l.kind === "image" || l.kind === "seal" || l.kind === "code";
    if (filter === "shapes") return l.kind === "shape" || l.kind === "divider";
    return true;
  });

  const selectedLayer = layers.find((l) => l.id === selectedId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((r) => r.id === active.id);
    const newIndex = rows.findIndex((r) => r.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reorderedRows = arrayMove(rows, oldIndex, newIndex);
      const nextLayers = [...reorderedRows].reverse();
      onReorder?.(nextLayers);
    }
  };

  return (
    <div
      data-testid="layers-dock"
      className={cn(
        "flex min-h-0 flex-1 flex-col select-none transition-colors",
        dark ? "bg-[#23181e] text-[#fff6dc]" : "bg-[#faf8f5] text-[#2d1f24]"
      )}
    >
      {/* Blend Mode & Opacity Strip */}
      {selectedLayer && (
        <div
          className={cn(
            "border-b px-3 py-2 transition-colors",
            dark
              ? "border-[#382630] bg-[#1c1217] text-zinc-200"
              : "border-[#e8e2d6] bg-[#f5efe7] text-[#3b2b31]"
          )}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span
                className={cn(
                  "mb-1 block text-[10px] font-semibold uppercase tracking-wider",
                  dark ? "text-zinc-400" : "text-[#7a5b67]"
                )}
              >
                Blend Mode
              </span>
              <select
                aria-label="Layer blend mode"
                value={selectedLayer.blendMode ?? "normal"}
                onChange={(e) =>
                  onPatch(selectedLayer.id, { blendMode: e.target.value })
                }
                className={cn(
                  "h-8 w-full rounded border px-2 text-xs font-medium outline-none",
                  dark
                    ? "border-white/15 bg-white/[0.06] text-[#fff6dc] focus:border-[#dfba73]"
                    : "border-[#e8e2d6] bg-white text-[#2d1f24] focus:border-[#4a0e17]"
                )}
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
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    dark ? "text-zinc-400" : "text-[#7a5b67]"
                  )}
                >
                  Opacity
                </span>
                <span className="font-mono text-[10px]">
                  {Math.round((selectedLayer.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                aria-label="Layer opacity"
                value={Math.round((selectedLayer.opacity ?? 1) * 100)}
                onChange={(e) =>
                  onPatch(selectedLayer.id, {
                    opacity: Number(e.target.value) / 100,
                  })
                }
                className={cn(
                  "h-8 w-full",
                  dark ? "accent-[#dfba73]" : "accent-[#4a0e17]"
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* Layer Kind Filter Tabs */}
      <div
        className={cn(
          "flex border-b px-2 py-1.5 text-[11px] font-semibold",
          dark
            ? "border-[#382630] bg-[#20161b] text-zinc-400"
            : "border-[#e8e2d6] bg-[#fcfbfa] text-[#7a5b67]"
        )}
      >
        {(
          [
            { id: "all", label: `All (${layers.length})` },
            {
              id: "text",
              label: `Text (${layers.filter((l) => TEXT_KINDS.has(l.kind)).length})`,
            },
            {
              id: "media",
              label: `Media (${layers.filter((l) => l.kind === "image" || l.kind === "seal").length})`,
            },
            {
              id: "shapes",
              label: `Shapes (${layers.filter((l) => l.kind === "shape" || l.kind === "divider").length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              "flex-1 rounded px-1.5 py-1 transition-colors text-center truncate",
              filter === tab.id
                ? dark
                  ? "bg-[#3d2733] font-bold text-white shadow-2xs"
                  : "bg-[#4a0e17] font-bold text-white shadow-2xs"
                : dark
                  ? "hover:text-white hover:bg-white/5"
                  : "hover:text-[#4a0e17] hover:bg-black/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Layer List with Drag and Drop */}
      {filteredRows.length === 0 ? (
        <p
          className={cn(
            "px-4 py-8 text-center text-xs",
            dark ? "text-zinc-400" : "text-[#7a5b67]"
          )}
        >
          {layers.length === 0
            ? "Nothing on the card yet. Add text, a shape or a picture from the tools."
            : "No layers match this filter."}
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
          {selectedIds && selectedIds.length > 1 && (
            <div
              className={cn(
                "mb-2 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium border",
                dark
                  ? "bg-[#3d2733] border-[#dfba73]/40 text-[#dfba73]"
                  : "bg-[#4a0e17]/10 border-[#4a0e17]/20 text-[#4a0e17]"
              )}
            >
              <span>{selectedIds.length} layers selected</span>
              <button
                type="button"
                onClick={() => onSelect("")}
                className="text-[10px] uppercase font-bold tracking-wider hover:underline"
              >
                Deselect
              </button>
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredRows.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul aria-label="Layers list" className="m-0 p-0">
                {filteredRows.map((layer) => (
                  <SortableRow
                    key={layer.id}
                    layer={layer}
                    on={
                      selectedIds && selectedIds.length
                        ? selectedIds.includes(layer.id)
                        : layer.id === selectedId
                    }
                    at={layers.findIndex((l) => l.id === layer.id)}
                    frontIndex={layers.length - 1}
                    canDelete={canDelete}
                    renaming={renaming}
                    draft={draft}
                    setDraft={setDraft}
                    setRenaming={setRenaming}
                    finish={finish}
                    onSelect={onSelect}
                    onToggleSelect={onToggleSelect}
                    onPatch={onPatch}
                    onStack={onStack}
                    onDuplicate={onDuplicate}
                    onDelete={onDelete}
                    dark={dark}
                  />
                ))}

                {/* Pinned Foundation Background Layer */}
                <li
                  role="button"
                  tabIndex={0}
                  data-testid="layer-row-background"
                  onClick={() => onSelect("background")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect("background");
                    }
                  }}
                  className={cn(
                    "mt-1.5 flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors cursor-pointer select-none",
                    selectedId === "background"
                      ? dark
                        ? "border-[#dfba73] bg-[#3d2733] text-[#dfba73] shadow-xs font-semibold"
                        : "border-[#4a0e17] bg-[#4a0e17]/10 text-[#4a0e17] shadow-xs font-semibold"
                      : dark
                        ? "border-transparent bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]"
                        : "border-transparent bg-black/[0.02] text-[#2d1f24] hover:bg-black/[0.05]"
                  )}
                >
                  {/* Visibility eye icon */}
                  <span className="grid h-5 w-5 place-items-center opacity-60">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>

                  {/* Background Thumbnail preview */}
                  <div
                    className={cn(
                      "h-7 w-7 shrink-0 rounded border overflow-hidden flex items-center justify-center shadow-2xs",
                      dark
                        ? "border-white/20 bg-black/40"
                        : "border-black/10 bg-white"
                    )}
                    style={{
                      backgroundColor:
                        background?.kind === "color" && background.color
                          ? background.color
                          : background?.kind === "velvet"
                            ? "#4a0d18"
                            : "#ede6da",
                    }}
                  >
                    {background?.kind === "image" && background.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={background.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : background?.kind === "velvet" ? (
                      <span className="h-4 w-4 rounded-sm bg-[#5c1322] border border-[#dfba73]/40" />
                    ) : (
                      <span className="h-4 w-4 rounded-sm bg-[#fcfbfa] border border-black/10 shadow-2xs" />
                    )}
                  </div>

                  {/* Layer Name */}
                  <span className="flex-1 truncate font-medium">
                    Background
                  </span>

                  {/* Locked icon: background is the foundation layer */}
                  <span
                    title="Foundation canvas layer (locked)"
                    className="opacity-40"
                  >
                    <Icon name="lock" size={13} />
                  </span>
                </li>
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Photopea style bottom layer actions bar */}
      <div
        className={cn(
          "flex h-9 items-center justify-between border-t px-3",
          dark
            ? "border-[#382630] bg-[#1c1217] text-zinc-400"
            : "border-[#e8e2d6] bg-[#f5efe7] text-[#7a5b67]"
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Layer Effects & Adjustments (fx)"
            disabled={!selectedLayer}
            onClick={onOpenFx}
            className={cn(
              "flex items-center gap-1 font-mono text-xs font-bold disabled:opacity-30",
              dark ? "hover:text-[#dfba73]" : "hover:text-[#4a0e17]"
            )}
          >
            fx
          </button>
          <button
            type="button"
            title="Group Selected Layers (Cmd+G)"
            aria-label="Group selection"
            onClick={onGroup}
            className={cn(
              "grid h-6 w-6 place-items-center rounded disabled:opacity-30",
              dark
                ? "hover:bg-white/10 hover:text-white"
                : "hover:bg-[#4a0e17]/10 hover:text-[#4a0e17]"
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
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Duplicate Layer (Cmd+D)"
            disabled={!selectedLayer}
            onClick={() => selectedLayer && onDuplicate(selectedLayer.id)}
            className={cn(
              "grid h-6 w-6 place-items-center rounded disabled:opacity-30",
              dark
                ? "hover:bg-white/10 hover:text-white"
                : "hover:bg-[#4a0e17]/10 hover:text-[#4a0e17]"
            )}
          >
            <Icon name="copy" size={13} />
          </button>
          <button
            type="button"
            title="New Text Layer"
            onClick={() => onAddLayer?.("text")}
            className={cn(
              "grid h-6 w-6 place-items-center rounded",
              dark
                ? "hover:bg-white/10 hover:text-white"
                : "hover:bg-[#4a0e17]/10 hover:text-[#4a0e17]"
            )}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            title="Delete Layer"
            disabled={!selectedLayer || !canDelete(selectedLayer)}
            onClick={() => selectedLayer && onDelete(selectedLayer.id)}
            className={cn(
              "grid h-6 w-6 place-items-center rounded hover:text-red-500 disabled:opacity-30",
              dark ? "hover:bg-white/10" : "hover:bg-red-500/10"
            )}
          >
            <Icon name="delete" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

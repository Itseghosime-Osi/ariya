"use client";

import React, { useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { INVITATION_LAYER_LABELS } from "../../types";
import type { InvitationLayer } from "../../types";
import type { StackMove } from "../../layer-ops";

const KIND_ICON: Record<InvitationLayer["kind"], IconName> = {
  seal: "celebration",
  kicker: "text_fields",
  names: "text_fields",
  message: "text_fields",
  divider: "tune",
  date: "calendar",
  venue: "location",
  dressCode: "text_fields",
  footer: "text_fields",
  text: "text_fields",
  code: "qr_code_scanner",
  shape: "swatch",
  image: "image",
};

/** What the row is called: the host's own name, else the words on it, else its kind. */
export function layerLabel(layer: InvitationLayer): string {
  if (layer.name?.trim()) return layer.name.trim();
  if (layer.kind === "shape") {
    return layer.shape === "ellipse"
      ? "Circle"
      : layer.shape === "line"
        ? "Line"
        : "Rectangle";
  }
  const words = layer.text.trim().replace(/\s+/g, " ");
  if (words && layer.kind !== "seal") return words.slice(0, 28);
  return INVITATION_LAYER_LABELS[layer.kind];
}

function RowButton({
  label,
  pressed,
  onClick,
  children,
  disabled,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
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
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-label-2 hover:bg-black/5 hover:text-night disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy aria-pressed:text-burgundy"
    >
      {children}
    </button>
  );
}

export function LayersDock({
  layers,
  selectedId,
  onSelect,
  onPatch,
  onStack,
  onDuplicate,
  onDelete,
  canDelete,
}: {
  layers: InvitationLayer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPatch: (id: string, patch: Partial<InvitationLayer>) => void;
  onStack: (id: string, move: StackMove) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  /** False for a layer that cannot be removed: a locked one, or the seal while the pass is on. */
  canDelete: (layer: InvitationLayer) => boolean;
}) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const finish = (save: boolean) => {
    if (renaming && save) {
      onPatch(renaming, { name: draft.trim().slice(0, 60) || undefined });
    }
    setRenaming(null);
  };

  // The top of the list is the front of the card.
  const rows = [...layers].reverse();

  return (
    <div data-testid="layers-dock" className="flex min-h-0 flex-1 flex-col">
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-label-2">
          Nothing on the card yet. Add text, a shape or a picture from the
          tools.
        </p>
      ) : (
        <ul
          aria-label="Layers, front first"
          className="min-h-0 flex-1 overflow-y-auto px-2 py-1"
        >
          {rows.map((layer) => {
            const on = layer.id === selectedId;
            const frontIndex = layers.length - 1;
            const at = layers.findIndex((l) => l.id === layer.id);
            return (
              <li key={layer.id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-current={on ? "true" : undefined}
                  onClick={() => onSelect(layer.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(layer.id);
                    } else if (e.key === "F2") {
                      e.preventDefault();
                      setDraft(layer.name ?? layerLabel(layer));
                      setRenaming(layer.id);
                    }
                  }}
                  className={cn(
                    "group flex min-h-11 cursor-pointer items-center gap-1 rounded-xl px-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy",
                    on ? "bg-burgundy/10" : "hover:bg-black/[0.04]",
                    !layer.visible && "opacity-55"
                  )}
                >
                  <Icon
                    name={KIND_ICON[layer.kind]}
                    size={16}
                    className="mx-1.5 shrink-0 text-gold-ink"
                  />
                  {renaming === layer.id ? (
                    <input
                      ref={(el) => {
                        // Focus as the field appears, so the first key typed lands in it.
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
                      className="min-w-0 flex-1 rounded-md border border-burgundy bg-white px-2 py-1 text-sm text-night outline-hidden"
                    />
                  ) : (
                    <span
                      className="min-w-0 flex-1 truncate text-sm text-night"
                      onDoubleClick={() => {
                        setDraft(layer.name ?? layerLabel(layer));
                        setRenaming(layer.id);
                      }}
                    >
                      {layerLabel(layer)}
                    </span>
                  )}
                  <RowButton
                    label={`${layer.visible ? "Hide" : "Show"} ${layerLabel(layer)}`}
                    pressed={!layer.visible}
                    onClick={() =>
                      onPatch(layer.id, { visible: !layer.visible })
                    }
                  >
                    <Icon
                      name={layer.visible ? "visibility" : "visibility_off"}
                      size={16}
                    />
                  </RowButton>
                  <RowButton
                    label={`${layer.locked ? "Unlock" : "Lock"} ${layerLabel(layer)}`}
                    pressed={Boolean(layer.locked)}
                    onClick={() => onPatch(layer.id, { locked: !layer.locked })}
                  >
                    <Icon name="lock" size={16} />
                  </RowButton>
                </div>
                {on && (
                  <div className="flex flex-wrap items-center gap-0.5 px-2 pb-1.5 pt-0.5">
                    <RowButton
                      label="Bring forward"
                      disabled={at === frontIndex}
                      onClick={() => onStack(layer.id, "up")}
                    >
                      <Icon name="expand_less" size={16} />
                    </RowButton>
                    <RowButton
                      label="Send backward"
                      disabled={at === 0}
                      onClick={() => onStack(layer.id, "down")}
                    >
                      <Icon name="expand_more" size={16} />
                    </RowButton>
                    <RowButton
                      label="Rename layer"
                      onClick={() => {
                        setDraft(layer.name ?? layerLabel(layer));
                        setRenaming(layer.id);
                      }}
                    >
                      <Icon name="edit" size={15} />
                    </RowButton>
                    <RowButton
                      label="Duplicate layer"
                      disabled={layer.kind === "code"}
                      onClick={() => onDuplicate(layer.id)}
                    >
                      <Icon name="copy" size={15} />
                    </RowButton>
                    <RowButton
                      label="Delete layer"
                      disabled={!canDelete(layer)}
                      onClick={() => onDelete(layer.id)}
                    >
                      <Icon name="delete" size={15} />
                    </RowButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

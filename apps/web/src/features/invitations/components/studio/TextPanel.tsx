"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { INVITATION_LAYER_LABELS, type InvitationColorRole } from "../../types";
import type { StudioApi } from "./types";

const LABEL =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink";

const FIELD =
  "desk-field w-full rounded-xl px-3 py-2 text-xs text-night focus:outline-none";

const COLOUR_ROLES: { value: InvitationColorRole; label: string }[] = [
  { value: "ink", label: "Ink" },
  { value: "title", label: "Names" },
  { value: "body", label: "Body" },
  { value: "accent", label: "Eyebrow" },
  { value: "foil", label: "Foil" },
  { value: "custom", label: "Custom" },
];

const WEIGHTS = [400, 500, 600, 700] as const;

export function TextPanel({ api }: { api: StudioApi }) {
  const layer = api.design.layers.find((entry) => entry.id === api.selectedId);

  if (!layer) {
    return (
      <div className="space-y-2 py-6 text-center">
        <Icon name="text_fields" size={22} className="mx-auto text-gold-ink" />
        <p className="text-[11px] leading-relaxed text-label-2">
          Pick a layer on the card, or in the Layers tab, to edit its words and
          type.
        </p>
      </div>
    );
  }

  const patch = (values: Parameters<typeof api.updateLayer>[1]) =>
    api.updateLayer(layer.id, values);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className={LABEL}>{INVITATION_LAYER_LABELS[layer.kind]}</p>
        <button
          type="button"
          onClick={() => api.select(null)}
          className="inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-label-2 hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="close" size={12} />
          Done
        </button>
      </div>

      {layer.kind !== "divider" && (
        <div>
          <label htmlFor="layer-text" className={LABEL}>
            Words
          </label>
          <textarea
            id="layer-text"
            rows={3}
            value={layer.text}
            onChange={(event) => patch({ text: event.target.value })}
            className={`${FIELD} resize-none leading-relaxed`}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={LABEL}>Typeface</span>
          <select
            value={layer.font}
            onChange={(event) =>
              patch({ font: event.target.value as "display" | "sans" })
            }
            className={`${FIELD} cursor-pointer`}
          >
            <option value="display">Display serif</option>
            <option value="sans">Sans</option>
          </select>
        </label>

        <label className="block">
          <span className={LABEL}>Colour</span>
          <select
            value={layer.colorRole}
            onChange={(event) =>
              patch({ colorRole: event.target.value as InvitationColorRole })
            }
            className={`${FIELD} cursor-pointer`}
          >
            {COLOUR_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {layer.colorRole === "custom" && (
        <label className="flex items-center gap-2 rounded-xl border border-gold-ink/20 bg-white/40 px-2.5 py-1.5">
          <input
            type="color"
            value={layer.color ?? api.design.palette.ink}
            onChange={(event) => patch({ color: event.target.value })}
            aria-label="Custom layer colour"
            className="h-5 w-5 cursor-pointer rounded border border-black/10 bg-transparent p-0"
          />
          <span className="text-[11px] font-medium text-night">
            {layer.color ?? "Using ink"}
          </span>
        </label>
      )}

      <div>
        <div className="flex items-center justify-between">
          <span className={LABEL}>Size</span>
          <span className="text-[10px] font-semibold tabular-nums text-label-2">
            {layer.size.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={0.1}
          value={layer.size}
          onChange={(event) => patch({ size: Number(event.target.value) })}
          aria-label="Type size"
          className="w-full accent-[#6b1e2e]"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className={LABEL}>Letter spacing</span>
          <span className="text-[10px] font-semibold tabular-nums text-label-2">
            {layer.tracking.toFixed(2)}em
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={layer.tracking}
          onChange={(event) => patch({ tracking: Number(event.target.value) })}
          aria-label="Letter spacing"
          className="w-full accent-[#6b1e2e]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div
          role="group"
          aria-label="Weight"
          className="flex gap-0.5 rounded-full border border-gold-ink/25 bg-white/40 p-0.5"
        >
          {WEIGHTS.map((weight) => (
            <button
              key={weight}
              type="button"
              onClick={() => patch({ weight })}
              aria-pressed={layer.weight === weight}
              className={`h-7 rounded-full px-2 text-[10px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                layer.weight === weight
                  ? "bg-burgundy text-white"
                  : "text-label-2 hover:text-night"
              }`}
            >
              {weight}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Alignment"
          className="flex gap-0.5 rounded-full border border-gold-ink/25 bg-white/40 p-0.5"
        >
          {(["left", "center", "right"] as const).map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => patch({ align })}
              aria-pressed={layer.align === align}
              aria-label={`Align ${align}`}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                layer.align === align
                  ? "bg-burgundy text-white"
                  : "text-label-2 hover:text-night"
              }`}
            >
              <Icon name="text_fields" size={13} />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => patch({ italic: !layer.italic })}
          aria-pressed={layer.italic}
          className={`h-8 rounded-full border px-3 text-[11px] font-semibold italic transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
            layer.italic
              ? "border-burgundy bg-burgundy/5 text-burgundy"
              : "border-gold-ink/25 text-label-2 hover:text-night"
          }`}
        >
          Italic
        </button>
      </div>
    </div>
  );
}

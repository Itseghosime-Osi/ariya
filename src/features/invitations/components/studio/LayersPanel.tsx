"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";
import { INVITATION_LAYER_LABELS } from "../../types";
import type { StudioApi } from "./types";

const LABEL =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink";

export function LayersPanel({ api }: { api: StudioApi }) {
  const { layers } = api.design;
  const single = layers.length <= 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={LABEL}>Card layers</p>
        <span className="text-[10px] font-semibold tabular-nums text-label-2">
          {layers.length}
        </span>
      </div>

      <ul className="divide-y divide-gold-ink/10 overflow-hidden rounded-2xl border border-gold-ink/20 bg-white/35">
        {layers.map((layer, index) => {
          const selected = api.selectedId === layer.id;
          return (
            <li
              key={layer.id}
              className={`flex items-center gap-1 px-2 py-1.5 ${
                selected ? "bg-burgundy/5" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => api.select(layer.id)}
                aria-pressed={selected}
                data-layer-kind={layer.kind}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <span
                  className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] ${
                    selected ? "text-burgundy" : "text-gold-ink"
                  }`}
                >
                  {INVITATION_LAYER_LABELS[layer.kind]}
                </span>
                <span
                  className={`truncate text-[11px] ${
                    layer.visible
                      ? "text-label-2"
                      : "text-label-2/50 line-through"
                  }`}
                >
                  {layer.text || "—"}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  api.updateLayer(layer.id, { visible: !layer.visible })
                }
                aria-label={
                  layer.visible
                    ? `Hide ${INVITATION_LAYER_LABELS[layer.kind]}`
                    : `Show ${INVITATION_LAYER_LABELS[layer.kind]}`
                }
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-2 hover:bg-white/70 hover:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <Icon
                  name={layer.visible ? "visibility" : "visibility_off"}
                  size={14}
                />
              </button>

              <button
                type="button"
                onClick={() => api.moveLayer(layer.id, -1)}
                disabled={index === 0}
                aria-label={`Send ${INVITATION_LAYER_LABELS[layer.kind]} back`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-2 hover:bg-white/70 hover:text-night disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <Icon name="expand_less" size={14} />
              </button>

              <button
                type="button"
                onClick={() => api.moveLayer(layer.id, 1)}
                disabled={index === layers.length - 1}
                aria-label={`Bring ${INVITATION_LAYER_LABELS[layer.kind]} forward`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-2 hover:bg-white/70 hover:text-night disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <Icon name="expand_more" size={14} />
              </button>

              <button
                type="button"
                onClick={() => api.deleteLayer(layer.id)}
                disabled={single}
                aria-label={`Delete ${INVITATION_LAYER_LABELS[layer.kind]}`}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-label-2 hover:bg-white/70 hover:text-[#9e2a2b] disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <Icon name="delete" size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] leading-relaxed text-label-2">
        Select a layer to edit its words in the Text tab, or drag it straight on
        the card.
      </p>
    </div>
  );
}

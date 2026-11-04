"use client";

import React from "react";
import { paletteForTheme } from "../../design";
import {
  INVITATION_THEMES,
  INVITATION_THEME_LABELS,
  type InvitationPalette,
} from "../../types";
import type { StudioApi } from "./types";

const LABEL =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink";

const SWATCHES: { key: keyof InvitationPalette; label: string }[] = [
  { key: "paper", label: "Paper" },
  { key: "paperEdge", label: "Paper edge" },
  { key: "ink", label: "Ink" },
  { key: "title", label: "Names" },
  { key: "body", label: "Body" },
  { key: "accent", label: "Eyebrow" },
  { key: "foil", label: "Foil" },
];

export function DesignPanel({ api }: { api: StudioApi }) {
  const { design } = api;

  return (
    <div className="space-y-4">
      <div>
        <p className={LABEL}>Palette</p>
        <div className="grid grid-cols-2 gap-1.5">
          {INVITATION_THEMES.map((theme) => {
            const palette = paletteForTheme(theme);
            const active = design.theme === theme;
            return (
              <button
                key={theme}
                type="button"
                onClick={() => api.applyTheme(theme)}
                aria-pressed={active}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                  active
                    ? "border-burgundy bg-burgundy/5 text-burgundy"
                    : "border-gold-ink/25 text-night hover:border-gold-ink/60"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 rounded-full border border-black/15"
                  style={{
                    background: `linear-gradient(140deg, ${palette.paper}, ${palette.foil})`,
                  }}
                />
                <span className="truncate">
                  {INVITATION_THEME_LABELS[theme]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={LABEL}>Stage</p>
        <div className="flex gap-1.5">
          {(
            [
              { kind: "paper", label: "Ivory paper" },
              { kind: "velvet", label: "Velvet stage" },
            ] as const
          ).map((option) => (
            <button
              key={option.kind}
              type="button"
              onClick={() => api.setBackground({ kind: option.kind })}
              aria-pressed={design.background.kind === option.kind}
              className={`min-h-9 flex-1 rounded-full border px-3 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                design.background.kind === option.kind
                  ? "border-burgundy bg-burgundy/5 text-burgundy"
                  : "border-gold-ink/25 text-night hover:border-gold-ink/60"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {design.background.kind === "image" && (
          <p className="mt-2 rounded-xl border border-gold-ink/20 bg-white/40 px-3 py-2 text-[11px] leading-relaxed text-label-2">
            Your imported art is the card. Adjust the paper tint over it from
            the Import tab.
          </p>
        )}
      </div>

      <div>
        <p className={LABEL}>Card colours</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SWATCHES.map((swatch) => (
            <label
              key={swatch.key}
              className="flex items-center gap-2 rounded-xl border border-gold-ink/20 bg-white/40 px-2.5 py-1.5"
            >
              <input
                type="color"
                value={design.palette[swatch.key]}
                onChange={(event) =>
                  api.setPaletteColour(swatch.key, event.target.value)
                }
                aria-label={swatch.label}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border border-black/10 bg-transparent p-0"
              />
              <span className="truncate text-[11px] font-medium text-night">
                {swatch.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

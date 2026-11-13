"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Section } from "@/features/seating/hall/studio-ui";
import {
  applyTextStyle,
  createTextStyle,
  deleteTextStyle,
  detachTextStyle,
  updateTextStyle,
} from "../../layer-ops";
import type { InvitationDesign, InvitationLayer } from "../../types";

/**
 * A3: brand styles. Name how a line of text looks, put it on other lines, and later change them
 * all at once. Every button is one edit of the design, so Undo reverses it in one step.
 */
export function BrandStyleSection({
  design,
  layer,
  dark,
  onDesign,
}: {
  design: InvitationDesign;
  layer: InvitationLayer;
  dark?: boolean;
  onDesign: (next: (d: InvitationDesign) => InvitationDesign) => void;
}) {
  const [name, setName] = useState("");
  const styles = design.textStyles ?? [];
  const followed = styles.find((s) => s.id === layer.styleId);
  const followers = followed
    ? design.layers.filter((l) => l.styleId === followed.id).length
    : 0;
  const muted = dark ? "text-zinc-400" : "text-(--studio-mauve)";
  const button = cn(
    "inline-flex min-h-8 items-center justify-center rounded-(--studio-radius-control) border px-2.5 text-xs font-semibold transition pointer-coarse:min-h-11",
    dark
      ? "border-white/12 bg-white/[0.06] text-(--studio-cream) hover:bg-white/[0.12]"
      : "border-hairline bg-white/60 text-night hover:bg-white"
  );
  const field = cn(
    "h-8 min-w-0 flex-1 rounded-(--studio-radius-control) border px-2 text-xs outline-none pointer-coarse:h-11",
    dark
      ? "border-white/15 bg-white/[0.06] text-(--studio-cream) focus:border-(--studio-gold)"
      : "border-(--studio-line) bg-white text-(--studio-ink) focus:border-(--studio-wine)"
  );

  return (
    <Section collapsible defaultClosed dark={dark} title="Brand style">
      <div className="space-y-2.5" data-testid="brand-style">
        {styles.length > 0 && (
          <div>
            <label
              htmlFor="brand-style-pick"
              className={cn("mb-1 block text-xs font-semibold", muted)}
            >
              Follows style
            </label>
            <select
              id="brand-style-pick"
              value={layer.styleId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                onDesign((d) =>
                  id
                    ? applyTextStyle(d, [layer.id], id)
                    : detachTextStyle(d, [layer.id])
                );
              }}
              className={cn(field, "w-full flex-none")}
            >
              <option value="">None</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {followed && (
          <div className="space-y-1.5">
            <p className={cn("text-xs", muted)}>
              {followers === 1
                ? "Only this line follows this style."
                : `${followers} lines follow this style.`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onDesign((d) => updateTextStyle(d, followed.id, layer.id))
                }
                className={button}
              >
                Update style from this line
              </button>
              <button
                type="button"
                onClick={() => onDesign((d) => deleteTextStyle(d, followed.id))}
                className={button}
              >
                Delete style
              </button>
            </div>
          </div>
        )}

        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const clean = name.trim();
            if (!clean) return;
            const id = `style_${Math.random().toString(36).slice(2, 9)}`;
            onDesign((d) => createTextStyle(d, layer.id, clean, id));
            setName("");
          }}
        >
          <label htmlFor="brand-style-name" className="sr-only">
            Name this look as a style
          </label>
          <input
            id="brand-style-name"
            value={name}
            maxLength={40}
            placeholder="Name this look"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            className={field}
          />
          <button type="submit" disabled={!name.trim()} className={button}>
            Save style
          </button>
        </form>
        <p className={cn("text-xs", muted)}>
          Change one line, press Update, and every line that follows the style
          changes with it.
        </p>
      </div>
    </Section>
  );
}

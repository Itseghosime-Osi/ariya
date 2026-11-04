"use client";

import React, { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { StudioApi, StudioImportState } from "./types";

const CONNECTORS = [
  {
    name: "Canva",
    note: "Design a 5:7 card in Canva, export it as PNG, then drop the PNG here.",
  },
  {
    name: "Figma",
    note: "Export your invitation frame as PNG at 1x and import it as the card art.",
  },
  {
    name: "Photoshop",
    note: "Flatten your artwork to PNG, or round-trip an Àríyá design JSON file.",
  },
];

const LABEL =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink";

export function ImportPanel({
  api,
  state,
  onImportFile,
  onExport,
}: {
  api: StudioApi;
  state: StudioImportState;
  onImportFile: (file: File) => void;
  onExport: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hasArt =
    api.design.background.kind === "image" &&
    Boolean(api.design.background.imageUrl);

  return (
    <div className="space-y-4">
      <div>
        <p className={LABEL}>Import a design</p>
        <label
          htmlFor="invitation-import-file"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) onImportFile(file);
          }}
          className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors ${
            dragging
              ? "border-burgundy/70 bg-burgundy/5"
              : "border-gold-ink/30 bg-white/35 hover:border-gold-ink/60 hover:bg-white/55"
          }`}
        >
          <input
            ref={inputRef}
            id="invitation-import-file"
            type="file"
            accept=".json,application/json,image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onImportFile(file);
              event.target.value = "";
            }}
          />
          <Icon
            name={state.busy ? "refresh" : "cloud_upload"}
            size={22}
            className={
              state.busy ? "animate-spin text-burgundy" : "text-gold-ink"
            }
          />
          <span className="text-xs font-semibold text-night">
            {state.busy ? "Importing…" : "Drop a design file or image"}
          </span>
          <span className="text-[11px] text-label-2">
            JSON exported from Àríyá, or a PNG, JPEG or WebP card
          </span>
        </label>
        {state.error && (
          <p role="alert" className="mt-2 text-xs font-medium text-[#9e2a2b]">
            {state.error}
          </p>
        )}
        {state.message && (
          <p
            role="status"
            className="mt-2 rounded-xl border border-emerald-900/15 bg-emerald-50/70 px-3 py-2 text-[11px] text-emerald-900"
          >
            {state.message}
          </p>
        )}
      </div>

      {hasArt && (
        <div className="space-y-2 rounded-2xl border border-gold-ink/20 bg-white/35 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold text-night">
              Imported art
            </span>
            <button
              type="button"
              onClick={() =>
                api.setBackground({ kind: "paper", imageUrl: null })
              }
              className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-burgundy hover:bg-white/60"
            >
              <Icon name="close" size={13} />
              Remove
            </button>
          </div>
          <label className="block">
            <span className={LABEL}>Paper tint over the art</span>
            <input
              type="range"
              min={0}
              max={0.9}
              step={0.05}
              value={api.design.background.overlay}
              onChange={(event) =>
                api.setBackground({ overlay: Number(event.target.value) })
              }
              className="w-full accent-[#6b1e2e]"
            />
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-gold-ink/25 bg-white/50 px-4 text-xs font-semibold text-night transition-colors hover:border-gold-ink/60 hover:bg-white/70"
        >
          <Icon name="download" size={14} />
          Export design file
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-gold-ink/25 bg-white/50 px-4 text-xs font-semibold text-night transition-colors hover:border-gold-ink/60 hover:bg-white/70"
        >
          <Icon name="upload" size={14} />
          Choose a file
        </button>
      </div>

      <div>
        <p className={LABEL}>Bring a design from your tools</p>
        <ul className="divide-y divide-gold-ink/10 overflow-hidden rounded-2xl border border-gold-ink/20 bg-white/35">
          {CONNECTORS.map((connector) => (
            <li key={connector.name} className="px-3 py-2.5">
              <p className="text-xs font-semibold text-night">
                {connector.name}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-label-2">
                {connector.note}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

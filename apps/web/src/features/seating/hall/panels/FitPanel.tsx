"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { FitResult } from "../fit";
import { Section, TableGlyph, Toggle } from "../studio-ui";

export function Swatch({ c }: { c: string }) {
  return (
    <span
      className="block h-6 w-6 rounded-md ring-1 ring-black/10"
      style={{ background: c }}
    />
  );
}

// ---------------------------------------------------------------- fit

export function FitPanel({
  presets,
  preset,
  onPreset,
  fitEmpty,
  fitAround,
  aisle,
  onAisle,
  buffer,
  onBuffer,
  target,
  shortBy,
  tablesNeeded,
  gap,
  busy,
  onFill,
  tableCount,
  emptyCount,
  crowded,
  onRemove,
  onFixCrowding,
  onAutoLayout,
}: {
  presets: { key: string; label: string; shape: string; capacity: number }[];
  preset: { key: string; shape: string; capacity: number };
  onPreset: (k: string) => void;
  fitEmpty: FitResult;
  fitAround: FitResult;
  aisle: boolean;
  onAisle: (v: boolean) => void;
  buffer: number;
  onBuffer: (v: number) => void;
  target: number;
  shortBy: number;
  tablesNeeded: number;
  gap: number;
  busy: string | null;
  onFill: (onlyNeeded: boolean, count?: number) => void;
  tableCount: number;
  emptyCount: number;
  crowded: number;
  onRemove: (n: number) => void;
  onFixCrowding: () => void;
  onAutoLayout: () => void;
}) {
  const [want, setWant] = useState(String(tableCount));
  useEffect(() => setWant(String(tableCount)), [tableCount]);
  const wanted = Math.max(0, Math.round(Number(want) || 0));
  return (
    <div>
      <Section title="Tables in the hall">
        {/* One control for one number: type it, or step it, then Apply. */}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 text-[11px] font-semibold text-label-2">
            <label htmlFor="hall-table-count">Set the number of tables</label>
            <span className="mt-1 flex items-center gap-1">
              <button
                type="button"
                aria-label="One fewer table"
                disabled={busy !== null || wanted === 0}
                onClick={() => setWant(String(Math.max(0, wanted - 1)))}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-hairline bg-white text-night hover:bg-ivory disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                −
              </button>
              <input
                id="hall-table-count"
                type="text"
                inputMode="numeric"
                value={want}
                onChange={(e) => setWant(e.target.value.replace(/[^0-9]/g, ""))}
                className="h-11 w-full min-w-0 rounded-lg border border-hairline bg-white px-2.5 text-center text-base tabular-nums text-night outline-none focus:border-night sm:text-sm"
              />
              <button
                type="button"
                aria-label="One more table"
                disabled={busy !== null}
                onClick={() => setWant(String(wanted + 1))}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-hairline bg-white text-night hover:bg-ivory disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                +
              </button>
            </span>
          </div>
          <button
            type="button"
            disabled={busy !== null || wanted === tableCount}
            onClick={() =>
              wanted > tableCount
                ? onFill(false, wanted - tableCount)
                : onRemove(tableCount - wanted)
            }
            className="min-h-11 rounded-full bg-night px-4 text-xs font-semibold text-white transition-colors hover:bg-burgundy disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Apply
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-label-2">
          {tableCount} now · {emptyCount} empty · {tableCount - emptyCount} with
          guests · about {fitEmpty.placements.length} fit in this hall
        </p>
        <p className="mt-2 text-[11px] text-label-2">
          Fewer tables take away empty ones first, starting with the most
          crowded and those furthest from the stage. Guests are never unseated
          this way.
        </p>
        {crowded > 0 && (
          <div className="mt-3 rounded-xl bg-[#fbeeee] p-3">
            <p className="text-sm text-[#7a1f20]">
              {crowded} {crowded === 1 ? "table is" : "tables are"} too close to
              another table, a wall or an area.
            </p>
            <button
              type="button"
              disabled={busy !== null}
              onClick={onFixCrowding}
              className="mt-2 min-h-11 w-full rounded-full bg-[#9e2a2b] px-4 text-xs font-semibold text-white hover:bg-[#82211f] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              Fix the crowding
            </button>
          </div>
        )}
        <button
          type="button"
          disabled={busy !== null}
          onClick={onAutoLayout}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night hover:border-night/40 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Sparkles size={15} /> Auto layout the whole hall
        </button>
      </Section>
      <Section title="How many tables fit">
        <div className="flex items-end gap-3">
          <p className="font-display text-5xl font-bold leading-none tabular-nums text-night">
            {fitEmpty.count}
          </p>
          <p className="pb-1 text-xs leading-snug text-label-2">
            tables, {fitEmpty.seats} seats
            <br />
            in this empty hall
          </p>
        </div>
        <p className="mt-2 text-xs text-label-2">
          Around what is placed now:{" "}
          <strong className="text-night">{fitAround.count} more</strong>, shown
          as gold outlines in the hall.
        </p>
      </Section>
      <Section title="Table type">
        <div
          className="grid grid-cols-3 gap-1.5"
          role="radiogroup"
          aria-label="Table type"
        >
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={preset.key === p.key}
              onClick={() => onPreset(p.key)}
              className="flex flex-col items-center gap-1 rounded-xl border border-hairline bg-white px-1 py-2 text-[11px] text-night transition-colors hover:border-night/40 aria-checked:border-night aria-checked:bg-night aria-checked:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <TableGlyph shape={p.shape} seats={p.capacity} size={30} />
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-1">
          <Toggle
            label="Keep a centre aisle to the stage"
            checked={aisle}
            onChange={onAisle}
          />
          <label
            className="block text-xs font-semibold text-night"
            htmlFor="fit-buffer"
          >
            Extra seats for surprise guests: {buffer}%
          </label>
          <input
            id="fit-buffer"
            type="range"
            min={0}
            max={30}
            step={5}
            value={buffer}
            onChange={(e) => onBuffer(Number(e.target.value))}
            className="h-9 w-full accent-[#6e1426]"
          />
        </div>
      </Section>
      <Section title="Fill the hall">
        <p className="rounded-xl bg-[#f6f1e8] px-3 py-2.5 text-sm text-night">
          {shortBy > 0
            ? `You need ${tablesNeeded} more ${tablesNeeded === 1 ? "table" : "tables"} for ${target} seats.`
            : "There is a seat for everyone, buffer included."}
          {tablesNeeded > fitAround.count &&
            " That is more than this hall takes: try banquet tables, snug spacing or a bigger hall."}
        </p>
        <div className="mt-3 grid gap-2">
          <button
            type="button"
            disabled={
              busy !== null || tablesNeeded === 0 || fitAround.count === 0
            }
            onClick={() => onFill(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-xs font-semibold uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-wine disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Sparkles size={15} />
            {busy === "fill"
              ? "Placing tables…"
              : `Add the ${Math.min(tablesNeeded, fitAround.count)} I need`}
          </button>
          <button
            type="button"
            disabled={busy !== null || fitAround.count === 0}
            onClick={() => onFill(false)}
            className="min-h-11 rounded-full border border-hairline bg-white px-5 text-xs font-semibold uppercase tracking-[0.12em] text-night transition-colors hover:border-night/40 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Fill every space ({fitAround.count})
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-label-2">
          Real table sizes, {Math.round(gap * 100)} cm between chair backs, 1 m
          along the walls and round each area, and a 1.12 m main aisle. Your
          venue and fire officer have the final say.
        </p>
      </Section>
    </div>
  );
}

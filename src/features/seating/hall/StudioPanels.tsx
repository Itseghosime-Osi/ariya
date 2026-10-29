"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Crown,
  Hand,
  Moon,
  Search,
  Sparkles,
  Sun,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeatingGuest, TableWithGuests } from "../types";
import {
  CHAIR_TYPES,
  DECOR_PRESETS,
  HALL_PRESETS,
  ZONE_DEFAULTS,
  formatFeet,
  type Centrepiece,
  type ChairType,
  type Decor,
  type FloorFinish,
  type HallLayout,
  type Spacing,
} from "./model";
import type { FitResult } from "./fit";
import type { SeatPlan, SeatUnit } from "./autoseat";
import {
  CentrepieceGlyph,
  ChairGlyph,
  LIGHT_PALETTE,
  MetreField,
  Section,
  Segmented,
  Stepper,
  Swatches,
  TableGlyph,
  Tiles,
  Toggle,
} from "./studio-ui";
import type { Pick } from "./Hall3D";

export const CENTREPIECES: { key: Centrepiece; label: string }[] = [
  { key: "tall", label: "Tall florals" },
  { key: "low", label: "Low florals" },
  { key: "candles", label: "Candles" },
  { key: "lanterns", label: "Lanterns" },
  { key: "none", label: "None" },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// ---------------------------------------------------------------- guests

export function GuestsPanel({
  guests,
  tables,
  assigning,
  onStartAssign,
  onAssign,
  onFocusTable,
}: {
  guests: SeatingGuest[];
  tables: TableWithGuests[];
  assigning: string | null;
  onStartAssign: (guestId: string | null) => void;
  onAssign: (guestId: string, tableId: string) => void;
  onFocusTable: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const groups = useMemo(
    () =>
      Array.from(
        new Set(guests.map((g) => g.group_name || g.side || "Guests"))
      ).slice(0, 8),
    [guests]
  );
  const list = guests.filter(
    (g) =>
      (group === "all" || (g.group_name || g.side || "Guests") === group) &&
      g.name.toLowerCase().includes(q.trim().toLowerCase())
  );
  const waiting = guests.reduce((a, g) => a + g.attending_count, 0);

  return (
    <div>
      <Section
        title="Tables in the hall"
        aside={
          <span className="text-[11px] text-label-2">
            {tables.length} {tables.length === 1 ? "table" : "tables"}
          </span>
        }
      >
        {tables.length === 0 ? (
          <p className="text-xs text-label-2">
            Add tables from the toolbar on the right of the hall.
          </p>
        ) : (
          <ul className="-mx-1 flex max-h-[148px] flex-wrap gap-1.5 overflow-y-auto px-1 py-0.5">
            {tables.map((t) => {
              const full = t.occupiedSeats >= t.capacity;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() =>
                      assigning && !full
                        ? onAssign(assigning, t.id)
                        : onFocusTable(t.id)
                    }
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                      assigning && !full
                        ? "border-burgundy bg-burgundy/5 text-burgundy hover:bg-burgundy hover:text-white"
                        : "border-hairline bg-white text-night hover:border-night/40"
                    )}
                  >
                    <TableGlyph
                      shape={t.shape}
                      seats={t.capacity}
                      filled={t.occupiedSeats}
                      size={18}
                    />
                    <span className="font-semibold">{t.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 tabular-nums",
                        full
                          ? "bg-burgundy text-white"
                          : "bg-[#f3ead8] text-[#5c4013]"
                      )}
                    >
                      {t.occupiedSeats}/{t.capacity}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section
        title="Waiting for a seat"
        aside={
          <span className="rounded-full bg-burgundy px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {waiting}
          </span>
        }
      >
        {assigning && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-night px-3 py-2.5 text-xs text-white">
            <Hand size={14} className="shrink-0 text-[#e9c98a]" />
            <span className="flex-1">
              Now click a table in the hall (or above) for{" "}
              <strong>{guests.find((g) => g.id === assigning)?.name}</strong>.
            </span>
            <button
              type="button"
              onClick={() => onStartAssign(null)}
              className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/15"
              aria-label="Stop seating this guest"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-label-2"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a guest"
            aria-label="Find a guest"
            className="h-10 w-full rounded-full border border-hairline bg-white pl-8 pr-3 text-base outline-none focus:border-night sm:text-sm"
          />
        </div>
        {groups.length > 1 && (
          <div
            className="mt-2 flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by group"
          >
            {["all", ...groups].map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={group === g}
                onClick={() => setGroup(g)}
                className="min-h-8 rounded-full border border-hairline bg-white px-2.5 text-[11px] font-semibold capitalize text-label-2 aria-pressed:border-night aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
              >
                {g === "all" ? "Everyone" : g}
              </button>
            ))}
          </div>
        )}
        {guests.length === 0 ? (
          <p className="mt-4 rounded-xl bg-[#f6f1e8] px-3 py-4 text-center text-sm text-night">
            Everyone has a seat.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {list.map((g) => (
              <li
                key={g.id}
                className={cn(
                  "rounded-xl border bg-white p-2 transition-colors",
                  assigning === g.id
                    ? "border-burgundy ring-1 ring-burgundy"
                    : "border-hairline"
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                      g.is_vip
                        ? "bg-[#e9c98a] text-[#3a2410]"
                        : "bg-[#f1ece4] text-night"
                    )}
                    aria-hidden="true"
                  >
                    {g.is_vip ? <Crown size={13} /> : initials(g.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-night">
                      {g.name}
                    </p>
                    {g.seating_conflict_at && (
                      <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#fdf1d8] px-2 py-0.5 text-[10px] font-semibold text-[#7a4a06]">
                        <AlertTriangle size={11} aria-hidden="true" />
                        party size changed, please seat again
                      </p>
                    )}
                    <p className="truncate text-[11px] text-label-2">
                      {g.attending_count}{" "}
                      {g.attending_count === 1 ? "seat" : "seats"}
                      {" · "}
                      {g.group_name || g.side}
                      {g.status !== "accepted" && ` · ${g.status}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onStartAssign(assigning === g.id ? null : g.id)
                    }
                    aria-pressed={assigning === g.id}
                    className="inline-flex min-h-9 items-center rounded-full bg-night px-3 text-[11px] font-semibold text-white transition-colors hover:bg-burgundy aria-pressed:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    {assigning === g.id ? "Choosing…" : "Seat"}
                  </button>
                </div>
                <select
                  aria-label={`Assign ${g.name} to a table`}
                  value=""
                  onChange={(e) =>
                    e.target.value && onAssign(g.id, e.target.value)
                  }
                  className="mt-2 h-9 w-full rounded-lg border border-hairline bg-[#fbf8f2] px-2 text-xs text-night focus:border-night focus:outline-none"
                >
                  <option value="">Or choose a table…</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({Math.max(0, t.capacity - t.occupiedSeats)} left
                      of {t.capacity})
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- room

export function RoomPanel({
  layout,
  onChange,
  onResetZones,
  layers,
  selection,
  onSelectLayer,
}: {
  layout: HallLayout;
  onChange: (patch: Partial<HallLayout>) => void;
  onResetZones: () => void;
  layers: { pick: Pick; label: string; meta: string }[];
  selection: Pick[];
  onSelectLayer: (p: Pick) => void;
}) {
  return (
    <div>
      <Section title="Size of the hall">
        <div className="grid grid-cols-2 gap-1.5">
          {HALL_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange({ width: p.width, length: p.length })}
              aria-pressed={
                layout.width === p.width && layout.length === p.length
              }
              className="rounded-xl border border-hairline bg-white px-2.5 py-2 text-left transition-colors hover:border-night/40 aria-pressed:border-night aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <span className="block text-xs font-semibold">{p.label}</span>
              <span className="text-[11px] opacity-70">
                {p.width} × {p.length} m
              </span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetreField
            id="hall-width"
            label="Width"
            value={layout.width}
            min={6}
            max={120}
            onCommit={(v) => onChange({ width: v })}
          />
          <MetreField
            id="hall-length"
            label="Length"
            value={layout.length}
            min={6}
            max={120}
            onCommit={(v) => onChange({ length: v })}
          />
          <MetreField
            id="hall-ceiling"
            label="Ceiling"
            value={layout.ceiling}
            min={3}
            max={15}
            onCommit={(v) => onChange({ ceiling: v })}
          />
        </div>
        <p className="mt-2 text-[11px] text-label-2">
          {Math.round(layout.width * layout.length)} m² ·{" "}
          {formatFeet(layout.width)} × {formatFeet(layout.length)}. Ask the
          venue for exact sizes.
        </p>
      </Section>
      <Section title="Floor">
        <Tiles<FloorFinish>
          label="Floor"
          cols={4}
          value={layout.decor.floor}
          onPick={(v) => onChange({ decor: { ...layout.decor, floor: v } })}
          options={[
            {
              key: "marble",
              label: "Marble",
              icon: <Swatch c="linear-gradient(135deg,#f3efe8,#d9d2c6)" />,
            },
            {
              key: "wood",
              label: "Wood",
              icon: (
                <Swatch c="repeating-linear-gradient(90deg,#b07a45 0 5px,#9a6638 5px 10px)" />
              ),
            },
            {
              key: "dark",
              label: "Dark",
              icon: <Swatch c="linear-gradient(135deg,#3a3236,#1d1a1c)" />,
            },
            {
              key: "carpet",
              label: "Carpet",
              icon: (
                <Swatch c="radial-gradient(circle,#c9a465 1px,#4a0f1c 1.5px)" />
              ),
            },
          ]}
        />
      </Section>
      <Section title="Walls">
        <Swatches
          label="Wall colour"
          value={layout.decor.wall}
          colours={[
            "#efe7da",
            "#f6f2ea",
            "#e6e8ee",
            "#f1e6d8",
            "#e9dcdc",
            "#d9d2c6",
            "#2b2326",
          ]}
          onPick={(v) => v && onChange({ decor: { ...layout.decor, wall: v } })}
        />
      </Section>
      <Section title="Spacing between tables">
        <Segmented<Spacing>
          label="Spacing between tables"
          value={layout.spacing}
          onPick={(v) => onChange({ spacing: v })}
          options={[
            { key: "snug", label: "Snug" },
            { key: "comfortable", label: "Comfortable" },
            { key: "spacious", label: "Spacious" },
          ]}
        />
        <button
          type="button"
          onClick={onResetZones}
          className="mt-3 min-h-10 w-full rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          Start from a typical owambe layout
        </button>
      </Section>
      <Section title="In this hall">
        <ul className="max-h-56 space-y-0.5 overflow-y-auto">
          {layers.map((l) => {
            const on = selection.some((s) => s.id === l.pick.id);
            return (
              <li key={l.pick.type + l.pick.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelectLayer(l.pick)}
                  className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-xs text-night hover:bg-[#f6f1e8] aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
                >
                  <span className="truncate font-medium">{l.label}</span>
                  <span className="shrink-0 opacity-60">{l.meta}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}

function Swatch({ c }: { c: string }) {
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
  onAddOne,
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
  onAddOne: () => void;
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
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Stepper
              label="Tables"
              value={tableCount}
              min={0}
              max={400}
              onChange={(v) => (v > tableCount ? onAddOne() : onRemove(1))}
            />
          </div>
          <p className="text-[11px] leading-tight text-label-2">
            {emptyCount} empty
            <br />
            {tableCount - emptyCount} with guests
          </p>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <label className="flex-1 text-[11px] font-semibold text-label-2">
            Set the number of tables
            <input
              type="text"
              inputMode="numeric"
              value={want}
              onChange={(e) => setWant(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-1 h-10 w-full rounded-lg border border-hairline bg-white px-2.5 text-base tabular-nums text-night outline-none focus:border-night sm:text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy !== null || wanted === tableCount}
            onClick={() =>
              wanted > tableCount
                ? onFill(false, wanted - tableCount)
                : onRemove(tableCount - wanted)
            }
            className="min-h-10 rounded-full bg-night px-4 text-xs font-semibold text-white transition-colors hover:bg-burgundy disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Apply
          </button>
        </div>
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
              className="mt-2 min-h-10 w-full rounded-full bg-[#9e2a2b] px-4 text-xs font-semibold text-white hover:bg-[#82211f] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
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

// ---------------------------------------------------------------- seat

export function SeatPanel({
  plan,
  units,
  readiness,
  busy,
  onSeat,
}: {
  plan: SeatPlan;
  units: SeatUnit[];
  readiness: number;
  busy: string | null;
  onSeat: () => void;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div>
      <Section title="Seat everyone">
        <div className="flex items-center gap-4">
          <svg
            width="84"
            height="84"
            viewBox="0 0 84 84"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke="#efe7da"
              strokeWidth="8"
            />
            <circle
              cx="42"
              cy="42"
              r={r}
              fill="none"
              stroke="#6e1426"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(c * readiness) / 100} ${c}`}
              transform="rotate(-90 42 42)"
              className="transition-[stroke-dasharray] duration-700 motion-reduce:transition-none"
            />
            <text
              x="42"
              y="47"
              textAnchor="middle"
              className="fill-night font-display text-[18px] font-bold"
            >
              {readiness}%
            </text>
          </svg>
          <p className="text-sm text-night">
            Seats confirmed guests with no table. Families stay together, VIPs
            go to the high table and the front, and no table goes over its
            seats.
          </p>
        </div>
        <ul className="mt-3 space-y-1.5 rounded-xl bg-[#f6f1e8] p-3 text-sm text-night">
          <li>
            <strong>{plan.assignments.length}</strong> of {units.length}{" "}
            confirmed guests can be seated
          </li>
          {plan.split.length > 0 && (
            <li>
              {plan.split.length}{" "}
              {plan.split.length === 1 ? "group spreads" : "groups spread"} over
              neighbouring tables: {plan.split.slice(0, 3).join(", ")}
            </li>
          )}
          {plan.unplaced.length > 0 && (
            <li className="text-[#9e2a2b]">
              {plan.unplaced.length} need more seats:{" "}
              {plan.unplaced
                .slice(0, 3)
                .map((u) => `${u.name} (${u.seats})`)
                .join(", ")}
              . Add tables with Fit.
            </li>
          )}
        </ul>
        <button
          type="button"
          disabled={busy !== null || plan.assignments.length === 0}
          onClick={onSeat}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-xs font-semibold uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-wine disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Wand2 size={15} />
          {busy === "seat"
            ? "Seating guests…"
            : units.length === 0
              ? "Everyone who accepted is seated"
              : `Seat ${plan.assignments.length} guests`}
        </button>
        <p className="mt-2 text-[11px] text-label-2">
          Pending replies wait until they accept. You can move anyone
          afterwards.
        </p>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- décor

export function DecorPanel({
  layout,
  onDecor,
  onLayout,
  styledCount,
  onResetTables,
}: {
  layout: HallLayout;
  onDecor: (d: Decor) => void;
  onLayout: (patch: Partial<HallLayout>) => void;
  styledCount: number;
  onResetTables: () => void;
}) {
  const decor = layout.decor;
  const set = (patch: Partial<Decor>) => onDecor({ ...decor, ...patch });
  return (
    <div>
      <Section title="Mood">
        <Segmented<"day" | "evening">
          label="Mood"
          value={layout.mood}
          onPick={(v) => onLayout({ mood: v })}
          options={[
            { key: "day", label: "Daytime", icon: <Sun size={14} /> },
            { key: "evening", label: "Evening", icon: <Moon size={14} /> },
          ]}
        />
        <div className="mt-2">
          <Toggle
            label="Crystal chandeliers"
            checked={layout.chandeliers}
            onChange={(v) => onLayout({ chandeliers: v })}
          />
        </div>
      </Section>
      <Section title="Colour of the day">
        <div className="grid grid-cols-2 gap-1.5">
          {DECOR_PRESETS.map((p) => {
            const on =
              decor.linen === p.decor.linen && decor.sash === p.decor.sash;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onDecor({ ...p.decor, floor: decor.floor, wall: decor.wall })
                }
                className="group overflow-hidden rounded-xl border border-hairline bg-white text-left transition-all hover:-translate-y-px hover:shadow-sm aria-pressed:border-night aria-pressed:ring-1 aria-pressed:ring-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <span className="flex h-7" aria-hidden="true">
                  {[
                    p.decor.linen,
                    p.decor.sash ?? p.decor.linen,
                    p.decor.flower,
                    p.decor.drape ?? "#fff",
                  ].map((c, i) => (
                    <span
                      key={i}
                      className="flex-1"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="block px-2 py-1.5 text-[11px] font-semibold text-night">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Table cloths">
        <Swatches
          label="Table cloth"
          value={decor.linen}
          onPick={(v) => v && set({ linen: v })}
        />
      </Section>
      <Section title="Chairs">
        <Tiles<ChairType>
          label="Chair type"
          value={decor.chair}
          onPick={(v) => set({ chair: v })}
          options={CHAIR_TYPES.map((c) => ({
            key: c.key,
            label: c.label,
            icon: <ChairGlyph type={c.key} />,
          }))}
        />
        {decor.chair === "covered" && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold text-label-2">
              Chair cover
            </p>
            <Swatches
              label="Chair cover"
              value={decor.cover}
              onPick={(v) => v && set({ cover: v })}
            />
          </div>
        )}
        <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
          Sash
        </p>
        <Swatches
          label="Chair sash"
          value={decor.sash}
          allowNone
          onPick={(v) => set({ sash: v })}
        />
      </Section>
      <Section title="Centrepieces">
        <Tiles<Centrepiece>
          label="Centrepiece"
          value={decor.centrepiece}
          onPick={(v) => set({ centrepiece: v })}
          options={CENTREPIECES.map((c) => ({
            ...c,
            icon: <CentrepieceGlyph kind={c.key} />,
          }))}
        />
        <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
          Flowers
        </p>
        <Swatches
          label="Flowers"
          value={decor.flower}
          onPick={(v) => v && set({ flower: v })}
        />
      </Section>
      <Section title="Drapes & light">
        <p className="mb-1.5 text-[11px] font-semibold text-label-2">
          Wall drapes
        </p>
        <Swatches
          label="Wall drapes"
          value={decor.drape}
          allowNone
          onPick={(v) => set({ drape: v })}
        />
        <p className="mb-1.5 mt-3 text-[11px] font-semibold text-label-2">
          Uplighting
        </p>
        <Swatches
          label="Uplighting"
          value={decor.uplight}
          allowNone
          colours={LIGHT_PALETTE}
          onPick={(v) => set({ uplight: v })}
        />
      </Section>
      {styledCount > 0 && (
        <Section title="Tables styled on their own">
          <p className="text-xs text-label-2">
            {styledCount} {styledCount === 1 ? "table has" : "tables have"}{" "}
            their own styling and ignore the choices above.
          </p>
          <button
            type="button"
            onClick={onResetTables}
            className="mt-2 min-h-10 w-full rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Make every table match the hall
          </button>
        </Section>
      )}
    </div>
  );
}

export const ZONE_LABEL = (k: keyof typeof ZONE_DEFAULTS) =>
  ZONE_DEFAULTS[k].label;

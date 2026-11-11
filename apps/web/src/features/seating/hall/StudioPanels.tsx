"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Crown,
  Hand,
  Loader2,
  Moon,
  Plus,
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
  VENUE_BLURB,
  VENUE_ENVIRONMENT,
  VENUE_LABEL,
  ZONE_DEFAULTS,
  formatFeet,
  type Centrepiece,
  type ChairType,
  type Decor,
  type FloorFinish,
  type HallLayout,
  type Spacing,
} from "./model";
import type {
  AcUnit,
  AlcoholAnswer,
  CakeAnswer,
  CateringReport,
  Confidence,
  Cooling,
  Level,
  Mount,
  RiskItem,
  RiskReport,
  ThermalReport,
  VenueProfile,
  VenueType,
} from "@ariya/studio";
import {
  defaultOverage,
  hasBar,
  overageFor,
  overageWords,
  perHead,
  type CateringAnswers,
} from "./catering";
import {
  questionsFor,
  readVenueValue,
  venueFormIssues,
  writeVenueValue,
  type VenueQuestion,
} from "./venue-questions";
import type { FitResult } from "./fit";
import { addRiskToChecklistAction } from "@/features/checklist/actions";
import { dueWords, groupRisks } from "./risk";
import type { SeatPlan, SeatUnit } from "./autoseat";
import {
  CentrepieceGlyph,
  ChairGlyph,
  LIGHT_PALETTE,
  MetreField,
  Section,
  Segmented,
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
  onOpenFit,
}: {
  guests: SeatingGuest[];
  tables: TableWithGuests[];
  assigning: string | null;
  onStartAssign: (guestId: string | null) => void;
  onAssign: (guestId: string, tableId: string) => void;
  onFocusTable: (id: string) => void;
  /** Opens the Fit tool, where the hall is filled with tables. */
  onOpenFit?: () => void;
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
          <div className="rounded-xl bg-[#f6f1e8] p-3">
            <p className="text-xs text-night">
              <strong className="font-semibold">Add tables first.</strong>{" "}
              Guests can only be seated at a table. Use + at the top of the hall
              to add one, or fill the hall in one go.
            </p>
            {onOpenFit && (
              <button
                type="button"
                onClick={onOpenFit}
                className="mt-2 inline-flex min-h-11 items-center rounded-full bg-night px-4 text-xs font-semibold text-white hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                Fill the hall with tables
              </button>
            )}
          </div>
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
                      {g.status === "pending" && " · awaits reply"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={tables.length === 0}
                    title={tables.length === 0 ? "Add tables first" : undefined}
                    onClick={() =>
                      onStartAssign(assigning === g.id ? null : g.id)
                    }
                    aria-pressed={assigning === g.id}
                    aria-label={`Seat ${g.name}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-night px-4 text-xs font-semibold text-white transition-colors hover:bg-burgundy aria-pressed:bg-burgundy disabled:bg-[#eadfd9] disabled:text-label-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    {assigning === g.id ? "Choosing…" : "Seat"}
                  </button>
                </div>
                {/* The table list appears only for the guest being seated: one picker, not one
                    per card, and never when there is no table to pick. */}
                {assigning === g.id && tables.length > 0 && (
                  <select
                    aria-label={`Assign ${g.name} to a table`}
                    value=""
                    onChange={(e) =>
                      e.target.value && onAssign(g.id, e.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-hairline bg-[#fbf8f2] px-2 text-sm text-night focus:border-night focus:outline-none"
                  >
                    <option value="">
                      Click a table in the hall, or pick one…
                    </option>
                    {tables.map((t) => {
                      const left = Math.max(0, t.capacity - t.occupiedSeats);
                      return (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={left < g.attending_count}
                        >
                          {t.name} ({left} left of {t.capacity})
                        </option>
                      );
                    })}
                  </select>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------- room

const VENUE_ORDER: VenueType[] = [
  "hall",
  "pillared-hall",
  "marquee",
  "pole-tent",
  "stretch-tent",
  "garden",
  "field",
  "beach",
  "rooftop",
  "church",
  "hybrid",
];

/** A small line drawing of each venue type, so the picker reads as pictures, not a list. */
function VenueGlyph({ type }: { type: VenueType }) {
  const s = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
  };
  return (
    <svg viewBox="0 0 44 30" aria-hidden="true" className="h-7 w-10">
      {type === "hall" && (
        <>
          <path d="M5 26V13l17-7 17 7v13" {...s} />
          <path d="M3 26h38" {...s} />
        </>
      )}
      {type === "pillared-hall" && (
        <>
          <path d="M5 26V10h34v16" {...s} />
          <path d="M14 26V14M30 26V14" {...s} />
          <path d="M3 26h38" {...s} />
        </>
      )}
      {type === "marquee" && (
        <>
          <path d="M4 14 22 5l18 9" {...s} />
          <path d="M7 14v12M37 14v12M22 14v12" {...s} />
          <path d="M3 26h38" {...s} />
        </>
      )}
      {type === "pole-tent" && (
        <>
          <path d="M4 24 22 6l18 18" {...s} />
          <path d="M22 6v18" {...s} />
          <path d="M3 26h38" {...s} />
        </>
      )}
      {type === "stretch-tent" && (
        <>
          <path d="M5 22c6-9 12-9 17-4s11 5 17-4" {...s} />
          <path d="M5 22v4M39 14v12" {...s} />
          <path d="M3 26h38" {...s} />
        </>
      )}
      {type === "garden" && (
        <>
          <path d="M3 26h38" {...s} />
          <circle cx="12" cy="16" r="5" {...s} />
          <path d="M12 21v5" {...s} />
          <circle cx="32" cy="18" r="4" {...s} />
          <path d="M32 22v4" {...s} />
        </>
      )}
      {type === "field" && (
        <>
          <path d="M3 26h38" {...s} />
          <path d="M6 20h6M16 20h6M26 20h6M36 20h4" {...s} />
          <path d="M8 14h4M20 14h4M32 14h4" {...s} />
        </>
      )}
      {type === "beach" && (
        <>
          <circle cx="33" cy="9" r="4" {...s} />
          <path d="M3 22c5-4 9-4 14 0s9 4 14 0 7-3 10-1" {...s} />
          <path d="M3 27c5-4 9-4 14 0s9 4 14 0 7-3 10-1" {...s} />
        </>
      )}
      {type === "rooftop" && (
        <>
          <path d="M5 26V16h34v10" {...s} />
          <path d="M5 16v-3M39 16v-3" {...s} />
          <path d="M12 16v-6h5v6M27 16v-8h5v8" {...s} />
          <path d="M3 26h38" {...s} />
        </>
      )}
      {type === "church" && (
        <>
          <path d="M8 26V14l14-8 14 8v12" {...s} />
          <path d="M22 6V1M19 3h6" {...s} />
          <path d="M18 26v-7h8v7" {...s} />
          <path d="M3 26h38" {...s} />
        </>
      )}
      {type === "hybrid" && (
        <>
          <path d="M4 26V15l9-5 9 5v11" {...s} />
          <path d="M24 26V18l8-4 8 4v8" {...s} />
          <path d="M3 26h38" {...s} />
        </>
      )}
    </svg>
  );
}

function QuestionField({
  question,
  venue,
  onChange,
}: {
  question: VenueQuestion;
  venue: VenueProfile;
  onChange: (venue: VenueProfile) => void;
}) {
  const id = `venue-${question.key.replace(/\./g, "-")}`;
  const raw = readVenueValue(venue, question.key);
  const [text, setText] = useState(raw == null ? "" : String(raw));
  useEffect(() => setText(raw == null ? "" : String(raw)), [raw]);
  const issue = venueFormIssues(venue)[question.key];

  const commit = (value: string) => {
    if (
      question.kind === "number" ||
      (question.kind === "select" && question.numeric)
    ) {
      const n = Number(value.replace(",", "."));
      onChange(
        writeVenueValue(
          venue,
          question.key,
          value === "" || !Number.isFinite(n) ? null : n
        )
      );
    } else {
      onChange(writeVenueValue(venue, question.key, value));
    }
  };

  return (
    <div title={question.consumer}>
      <label htmlFor={id} className="text-[11px] font-semibold text-label-2">
        {question.label}
      </label>
      {question.kind === "select" ? (
        <select
          id={id}
          value={raw == null ? "" : String(raw)}
          onChange={(e) => commit(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-hairline bg-white px-2.5 text-base text-night outline-none focus:border-night sm:text-sm"
        >
          <option value="">Not set</option>
          {question.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="mt-1 flex items-center rounded-lg border border-hairline bg-white pr-2.5 focus-within:border-night">
          <input
            id={id}
            type="text"
            inputMode={question.kind === "number" ? "decimal" : "text"}
            value={text}
            placeholder={question.placeholder}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => commit(text)}
            onKeyDown={(e) => e.key === "Enter" && commit(text)}
            className="h-10 w-full min-w-0 rounded-lg bg-transparent px-2.5 text-base tabular-nums text-night outline-none sm:text-sm"
          />
          {question.unit && (
            <span className="text-xs text-label-2">{question.unit}</span>
          )}
        </div>
      )}
      {issue && (
        <p role="alert" className="mt-1 text-[11px] leading-snug text-burgundy">
          {issue}
        </p>
      )}
      <span className="sr-only">{question.consumer}</span>
    </div>
  );
}

/** The venue facts the studio asks for, driven by the per-type question schema. */
export function VenueFacts({
  venue,
  onChange,
}: {
  venue: VenueProfile;
  onChange: (venue: VenueProfile) => void;
}) {
  return (
    <>
      {questionsFor(venue.type).map((group) => (
        <Section key={group.title} title={group.title}>
          <div className="grid grid-cols-2 gap-2">
            {group.questions.map((q) => (
              <QuestionField
                key={q.key}
                question={q}
                venue={venue}
                onChange={onChange}
              />
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

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
      <Section title="Where is it?">
        <div className="grid grid-cols-2 gap-1.5">
          {VENUE_ORDER.map((type) => {
            const active = layout.venue.type === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  onChange({
                    venue: {
                      ...layout.venue,
                      type,
                      environment: VENUE_ENVIRONMENT[type],
                    },
                  })
                }
                aria-pressed={active}
                className={cn(
                  "flex items-start gap-2 rounded-xl border border-hairline bg-white p-2 text-left transition-colors hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
                  active && "border-night bg-night text-white"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0",
                    active ? "text-white" : "text-night/70"
                  )}
                >
                  <VenueGlyph type={type} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">
                    {VENUE_LABEL[type]}
                  </span>
                  <span
                    className={cn(
                      "block text-[11px] leading-snug",
                      active ? "text-white/70" : "text-label-2"
                    )}
                  >
                    {VENUE_BLURB[type]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <VenueFacts
        venue={layout.venue}
        onChange={(venue) => onChange({ venue })}
      />
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
            accepted invitations without a table can be seated
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
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory transition-colors hover:bg-wine disabled:bg-[#eadfd9] disabled:text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Wand2 size={15} aria-hidden="true" />
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

/** The heat-map scale, shared with the 3D overlay so the legend and the floor agree. */
export const HEAT_STOPS = [
  "#2c7bb6",
  "#abd9e9",
  "#ffffbf",
  "#fdae61",
  "#d7191c",
];

const MOUNTS: { key: Mount; label: string }[] = [
  { key: "wall", label: "Wall" },
  { key: "cassette", label: "Cassette" },
  { key: "floor", label: "Floor" },
];

/** The four sizes sold locally, in "HP". */
const UNIT_SIZES = [1, 1.5, 2, 2.5];

const temp = (v: number) => `${v.toFixed(1)} °C`;

/**
 * The thermal deck: the verdict, the cooling the host has planned, and the heat map read out as a
 * table. The map itself is drawn on the floor of the 3D hall; this is its non-visual equivalent.
 */
export function ThermalPanel({
  report,
  status,
  cooling,
  onCooling,
  placing,
  onTogglePlacing,
  onAddUnit,
  onDeleteUnit,
  onUpdateUnit,
  onFocusArea,
  heat,
  onToggleHeat,
}: {
  report: ThermalReport | null;
  status: "loading" | "ready" | "unavailable";
  cooling: Cooling | null;
  onCooling: (patch: Partial<Cooling>) => void;
  placing: boolean;
  onTogglePlacing: () => void;
  onAddUnit: () => void;
  onDeleteUnit: (id: string) => void;
  onUpdateUnit: (id: string, patch: Partial<AcUnit>) => void;
  onFocusArea: (id: string) => void;
  heat: boolean;
  onToggleHeat: () => void;
}) {
  const units = cooling?.units ?? [];
  const ach = cooling?.ach ?? 5;
  const targetC = cooling?.targetC ?? 24;
  const field = report?.field ?? null;
  const advice = report?.advice ?? null;
  const plant = report?.plant ?? null;
  const sizing = report?.sizing ?? null;

  if (status !== "ready") {
    return (
      <Section title="Cooling">
        <p className="text-[11px] leading-snug text-label-2">
          {status === "loading"
            ? "Working out the cooling…"
            : "The cooling model needs the layout engine, which did not load on this device. The rest of the studio still works."}
        </p>
      </Section>
    );
  }

  return (
    <div>
      {advice && (
        <Section title="The verdict">
          <div
            className={cn(
              "rounded-xl border p-3",
              advice.level === "viable"
                ? "border-[#1f6b4a]/30 bg-[#1f6b4a]/5"
                : "border-[#a3263b]/30 bg-[#a3263b]/5"
            )}
          >
            <p className="text-sm font-semibold leading-snug text-night">
              {advice.headline}
            </p>
            <ul className="mt-2 space-y-1.5">
              {advice.reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-1.5 text-[11px] leading-snug text-label-2"
                >
                  <span aria-hidden="true" className="mt-1 shrink-0">
                    ·
                  </span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section title="How leaky is the room?">
        <label
          htmlFor="thermal-ach"
          className="flex items-center justify-between text-[11px] font-semibold text-label-2"
        >
          <span>Air changes an hour</span>
          <span className="tabular-nums text-night">{ach}</span>
        </label>
        <input
          id="thermal-ach"
          type="range"
          min={0}
          max={15}
          step={1}
          value={ach}
          onChange={(e) => onCooling({ ach: Number(e.target.value) })}
          className="mt-2 w-full accent-burgundy"
        />
        <div className="flex justify-between text-[10px] text-label-2">
          <span>Sealed</span>
          <span>Draughty</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-label-2">
          The biggest uncertainty in the whole model — a factor of three here
          swings the load by about 40 %. A closed hall is 3–5; a marquee 5–10.
        </p>
      </Section>

      <Section title="What counts as comfortable?">
        <label
          htmlFor="thermal-target"
          className="flex items-center justify-between text-[11px] font-semibold text-label-2"
        >
          <span>Target temperature</span>
          <span className="tabular-nums text-night">{targetC} °C</span>
        </label>
        <input
          id="thermal-target"
          type="range"
          min={18}
          max={30}
          step={1}
          value={targetC}
          onChange={(e) => onCooling({ targetC: Number(e.target.value) })}
          className="mt-2 w-full accent-burgundy"
        />
        <div className="flex justify-between text-[10px] text-label-2">
          <span>18 °C</span>
          <span>30 °C</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-label-2">
          Every degree below the outdoor air adds load. 24 °C is the usual
          target for a seated hall.
        </p>
      </Section>

      <Section
        title="Air conditioners"
        aside={
          <span className="text-[11px] tabular-nums text-label-2">
            {units.length}
            {sizing ? ` of ${sizing.count}` : ""}
          </span>
        }
      >
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onTogglePlacing}
            aria-pressed={placing}
            className={cn(
              "min-h-11 flex-1 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
              placing
                ? "bg-night text-white"
                : "border border-hairline bg-white text-night hover:border-night/40"
            )}
          >
            {placing ? "Click the floor · cancel" : "Place on the floor"}
          </button>
          <button
            type="button"
            onClick={onAddUnit}
            className="min-h-11 rounded-full border border-hairline bg-white px-4 text-xs font-semibold text-night transition-colors hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Add one
          </button>
        </div>
        {units.length === 0 ? (
          <p className="mt-2 text-[11px] leading-snug text-label-2">
            No units placed yet. The verdict above is for the set the room
            needs; place units to see where the cold actually lands.
          </p>
        ) : (
          <p className="mt-2 text-[11px] leading-snug text-label-2">
            Drag a unit on the floor to move it. Each one is drawn where it
            sits, so the map and the plan agree.
          </p>
        )}
        {units.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {units.map((u, i) => (
              <li
                key={u.id}
                className="rounded-xl border border-hairline bg-white p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-night">
                    Unit {i + 1} · {u.hp} HP
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteUnit(u.id)}
                    aria-label={`Remove unit ${i + 1}`}
                    className="grid h-11 w-11 place-items-center rounded-full text-label-2 hover:bg-[#f1ece4] hover:text-night focus-visible:outline-2 focus-visible:outline-burgundy"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-1.5 flex gap-1">
                  {MOUNTS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      aria-pressed={u.mount === m.key}
                      onClick={() => onUpdateUnit(u.id, { mount: m.key })}
                      className="min-h-11 flex-1 rounded-lg border border-hairline text-[11px] font-medium text-label-2 transition-colors aria-pressed:border-night aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex gap-1">
                  {UNIT_SIZES.map((hp) => (
                    <button
                      key={hp}
                      type="button"
                      aria-pressed={u.hp === hp}
                      aria-label={`${hp} HP`}
                      onClick={() => onUpdateUnit(u.id, { hp })}
                      className="min-h-11 flex-1 rounded-lg border border-hairline text-[11px] font-medium tabular-nums text-label-2 transition-colors aria-pressed:border-night aria-pressed:bg-night aria-pressed:text-white focus-visible:outline-2 focus-visible:outline-burgundy"
                    >
                      {hp}
                    </button>
                  ))}
                </div>
                <div className="mt-1">
                  <Toggle
                    label="Inverter"
                    hint="Starts gently, so a roomful does not trip the generator"
                    checked={u.inverter}
                    onChange={(v) => onUpdateUnit(u.id, { inverter: v })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {field && (
        <Section title="Where it is warmest">
          <Toggle
            label="Show the heat map"
            hint="Paints the floor of the 3D hall; the table below says the same thing"
            checked={heat}
            onChange={onToggleHeat}
          />
          <div
            className="mt-2 h-3 w-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${HEAT_STOPS.join(", ")})`,
            }}
            aria-hidden="true"
          />
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-label-2">
            <span>{temp(field.minC)}</span>
            <span>{temp(field.maxC)}</span>
          </div>
          <table className="mt-2 w-full text-[11px]">
            <caption className="sr-only">
              Mean and peak temperature by area, warmest first
            </caption>
            <thead>
              <tr className="text-left text-label-2">
                <th scope="col" className="pb-1 font-semibold">
                  Area
                </th>
                <th scope="col" className="pb-1 text-right font-semibold">
                  Mean
                </th>
                <th scope="col" className="pb-1 text-right font-semibold">
                  Peak
                </th>
              </tr>
            </thead>
            <tbody>
              {field.areas.map((a) => (
                <tr key={a.id} className="border-t border-hairline">
                  <th scope="row" className="py-1 text-left font-medium">
                    <button
                      type="button"
                      onClick={() => onFocusArea(a.id)}
                      className="text-left text-night underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-burgundy"
                    >
                      {a.label}
                    </button>
                  </th>
                  <td className="py-1 text-right tabular-nums">
                    {temp(a.meanC)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-label-2">
                    {temp(a.maxC)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-[11px] leading-snug text-label-2">
            The room averages {temp(field.meanC)}. The map is drawn on the floor
            of the hall.
          </p>
        </Section>
      )}

      {plant && (
        <Section title="What it asks of the plant">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-xl border border-hairline bg-white p-2">
              <span className="block text-[10px] uppercase tracking-wide text-label-2">
                Generator
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-night">
                {plant.runningKw.toFixed(0)} kW
              </span>
              <span className="block text-[10px] text-label-2">
                {plant.surgeKw.toFixed(0)} kW starting
              </span>
            </div>
            <div className="rounded-xl border border-hairline bg-white p-2">
              <span className="block text-[10px] uppercase tracking-wide text-label-2">
                Condensate
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-night">
                {plant.condensateLph.toFixed(0)} L/h
              </span>
              <span className="block text-[10px] text-label-2">
                a drain, not a tray
              </span>
            </div>
          </div>
        </Section>
      )}

      {report && (
        <Section title="How we got this">
          <details className="text-[11px] leading-snug text-label-2">
            <summary className="cursor-pointer font-semibold text-night">
              The inputs, the rule and the source
            </summary>
            <dl className="mt-2 space-y-1.5">
              <div>
                <dt className="font-semibold text-night">Inputs</dt>
                <dd>
                  {report.loads.totalKw.toFixed(0)} kW of load:{" "}
                  {report.loads.sensibleKw.toFixed(0)} kW sensible,{" "}
                  {report.loads.latentKw.toFixed(0)} kW latent. Sensible heat
                  ratio {report.loads.shr.toFixed(2)}.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-night">The rule</dt>
                <dd>
                  A split removes its sticker capacity less the sun and a fouled
                  coil, and its coil fixes how much moisture it can take out.
                  The room is the balance of what it gains against what the set
                  removes.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-night">The source</dt>
                <dd>
                  Research §C.4–C.8: the sensible and latent balances, the split
                  catalogue, and the plant figures. A screening tool, not a
                  design — a real HVAC engineer will refine it.
                </dd>
              </div>
            </dl>
          </details>
        </Section>
      )}
    </div>
  );
}

/** How sure the model is, as a dot. §E.11 asks for one per line. */
function ConfidenceDot({ level }: { level: Confidence }) {
  const { className, title } = {
    high: {
      className: "bg-[#1f6b4a]",
      title: "Follows from arithmetic on your numbers",
    },
    medium: { className: "bg-[#b8860b]", title: "Depends on how people eat" },
    low: {
      className: "bg-[#b4483a]",
      title: "Depends on something no one can predict",
    },
  }[level];
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        className
      )}
      title={title}
      aria-label={`Confidence: ${level}`}
      role="img"
    />
  );
}

/** A number a caterer can read at a glance: no decimals on something you count. */
function quantity(v: number): string {
  return Math.abs(v - Math.round(v)) < 0.05
    ? String(Math.round(v))
    : v.toFixed(1);
}

const ALCOHOL_OPTIONS: { key: AlcoholAnswer; label: string }[] = [
  { key: "none", label: "None" },
  { key: "beer-wine", label: "Beer & wine" },
  { key: "full-bar", label: "Full bar" },
  { key: "unsure", label: "Not sure" },
];

const CAKE_OPTIONS: { key: CakeAnswer; label: string }[] = [
  { key: "ceremonial", label: "Cutting" },
  { key: "dessert", label: "Dessert" },
  { key: "decoration", label: "Photo only" },
];

/**
 * The catering deck: the three questions that swing the list, then the shopping list itself,
 * grouped by the unit a caterer quotes in.
 */
export function CateringPanel({
  report,
  status,
  plan,
  guests,
  onPlan,
  onExport,
  exporting,
}: {
  report: CateringReport | null;
  status: "loading" | "ready" | "unavailable";
  plan: CateringAnswers;
  guests: number;
  onPlan: (patch: Partial<CateringAnswers>) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  if (status !== "ready") {
    return (
      <Section title="Catering">
        <p className="text-[11px] leading-snug text-label-2">
          {status === "loading"
            ? "Working out what to buy…"
            : "The catering model needs the layout engine, which did not load on this device. The rest of the studio still works."}
        </p>
      </Section>
    );
  }

  return (
    <div>
      <Section title="The three questions that matter">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-label-2">
              Will you serve alcohol?
            </p>
            <Segmented
              label="Will you serve alcohol?"
              value={plan.alcohol}
              options={ALCOHOL_OPTIONS}
              onPick={(alcohol) => onPlan({ alcohol })}
            />
            {!hasBar(plan) && (
              <p className="mt-1.5 text-[11px] leading-snug text-label-2">
                No bar, so there is nothing to buy for one — the water, soft
                drinks and ice stay on the list. Changed your mind?{" "}
                <button
                  type="button"
                  onClick={() => onPlan({ alcohol: "beer-wine" })}
                  className="font-semibold text-burgundy underline underline-offset-2"
                >
                  Put the bar back
                </button>
                .
              </p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-label-2">
              Is the cake pudding or a photograph?
            </p>
            <Segmented
              label="What the cake is for"
              value={plan.cake}
              options={CAKE_OPTIONS}
              onPick={(cake) => onPlan({ cake })}
            />
          </div>
          <Toggle
            label="Takeaway packs"
            hint="A pack for guests to take home adds 10–20 % to the food"
            checked={plan.takeaway}
            onChange={(takeaway) => onPlan({ takeaway })}
          />
        </div>
      </Section>

      <Section title="How it is served">
        <div className="space-y-4">
          <Segmented
            label="Service style"
            value={plan.style}
            options={[
              { key: "plated", label: "Plated" },
              { key: "family", label: "Family" },
              { key: "buffet", label: "Buffet" },
              { key: "cocktail", label: "Cocktail" },
            ]}
            onPick={(style) => onPlan({ style })}
          />
          <Toggle
            label="Vendor meals"
            hint="Feeding the photographers, DJ and planners — usually 8 % of guests"
            checked={plan.vendors !== 0}
            onChange={(on) => onPlan({ vendors: on ? null : 0 })}
          />
          <Toggle
            label="Plus-ones"
            hint="10 % more than your RSVP, which is what an open Nigerian event usually sees"
            checked={(plan.plusOnes ?? 0) > 0}
            onChange={(on) => onPlan({ plusOnes: on ? null : 0 })}
          />
          <Toggle
            label="Cold display"
            hint="Adds ice for the drinks table"
            checked={plan.coldDisplay}
            onChange={(coldDisplay) => onPlan({ coldDisplay })}
          />
          <Toggle
            label="Hot weather"
            hint="30 °C and above needs more ice per guest"
            checked={plan.hotWeather}
            onChange={(hotWeather) => onPlan({ hotWeather })}
          />
        </div>
      </Section>

      <Section title="How much spare food do you want?">
        <label
          htmlFor="catering-overage"
          className="flex items-center justify-between text-[11px] font-semibold text-label-2"
        >
          <span>Spare food</span>
          <span className="tabular-nums text-night">
            {Math.round(overageFor(plan, guests) * 100)} %
          </span>
        </label>
        <input
          id="catering-overage"
          type="range"
          min={0}
          max={40}
          step={1}
          value={Math.round(overageFor(plan, guests) * 100)}
          onChange={(e) => onPlan({ overage: Number(e.target.value) / 100 })}
          className="mt-2 w-full accent-burgundy"
        />
        <div className="flex justify-between text-[10px] text-label-2">
          <span>Nothing spare</span>
          <span>40 %</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-label-2">
          {overageWords(overageFor(plan, guests))}. A room of {guests} usually
          wants {Math.round(defaultOverage(guests) * 100)} %
          {plan.overage === null ? " — what this is set to" : ""}.
        </p>
        {plan.overage !== null && (
          <button
            type="button"
            onClick={() => onPlan({ overage: null })}
            className="mt-2 text-[11px] font-semibold text-burgundy underline underline-offset-2"
          >
            Back to the usual {Math.round(defaultOverage(guests) * 100)} %
          </button>
        )}
      </Section>

      {report && (
        <>
          <Section title="Who you are cooking for">
            <p className="text-[11px] leading-relaxed text-label-2">
              <span className="text-sm font-semibold text-night">
                {report.effectiveGuests}
              </span>{" "}
              to cook for, not {guests}: plus-ones and vendors eat too. Add{" "}
              {Math.round(report.overage * 100)} % spare food and you are
              plating{" "}
              <span className="font-semibold text-night">
                {report.portions}
              </span>{" "}
              portions.
            </p>
          </Section>

          <Section title="The shopping list">
            <div className="space-y-5">
              {report.groups.map((g) => (
                <div key={g.unit}>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-label-2">
                    By the {g.label}
                  </p>
                  <ul className="space-y-1.5">
                    {g.lines.map((l) => (
                      <li
                        key={l.label}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="flex min-w-0 items-baseline gap-1.5">
                          <ConfidenceDot level={l.confidence} />
                          <span className="truncate text-sm text-night">
                            {l.label}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="text-sm font-semibold text-night">
                            {quantity(l.likely)}
                          </span>
                          <span className="ml-1 text-[11px] text-label-2">
                            {l.unit}
                          </span>
                          <span className="block text-[10px] text-label-2">
                            {quantity(l.low)}–{quantity(l.high)}
                          </span>
                          {l.perGuest > 0 && (
                            <span className="block text-[10px] text-label-3">
                              ≈ {perHead(l)}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          <Section title="What this is">
            <div className="space-y-3">
              {report.notes.map((n, i) => (
                <p key={i} className="text-[11px] leading-relaxed text-label-2">
                  {n}
                </p>
              ))}
              <p className="rounded-lg border border-hairline bg-[#faf7f2] p-2.5 text-[11px] leading-relaxed text-label-2">
                These are defensible estimates within about ±20 %, not a cited
                standard. Take the Likely column to your caterer and adjust.
              </p>
              <button
                type="button"
                onClick={onExport}
                disabled={exporting}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-burgundy px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              >
                {exporting
                  ? "Preparing the sheet…"
                  : "Download the list as a PDF"}
              </button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- risk

/** How a likelihood or impact reads, from calm to alarming. */
const LEVEL_TONE: Record<Level, string> = {
  low: "border-hairline text-label-2",
  "low-medium": "border-[#b8860b]/40 text-[#8a6608]",
  medium: "border-[#b8860b] text-[#8a6608]",
  high: "border-[#b4483a] text-[#b4483a]",
};

/**
 * The risk register, grouped the way the research groups it. Safety-critical rows carry a badge
 * and their groups put them first, so a blocked exit never hides below a late cake. Every row opens
 * to the mitigation, where the advice comes from, and why the rule fired for this plan.
 */
export function RiskPanel({
  report,
  status,
  eventDate,
  eventId,
  addedRiskIds,
}: {
  report: RiskReport | null;
  status: "loading" | "ready" | "unavailable";
  eventDate: string | null;
  eventId: string;
  addedRiskIds: string[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, "adding" | "added">>(() =>
    Object.fromEntries(addedRiskIds.map((id) => [id, "added" as const]))
  );
  const [addError, setAddError] = useState<string | null>(null);

  const addToChecklist = useCallback(
    async (item: RiskItem) => {
      if (added[item.id]) return;
      setAddError(null);
      setAdded((a) => ({ ...a, [item.id]: "adding" }));
      const result = await addRiskToChecklistAction(eventId, {
        id: item.id,
        title: item.title,
        mitigation: item.mitigation,
        derivation: item.derivation,
        source: item.source,
        due: item.due,
      });
      if (result.error) {
        setAdded((a) => {
          const next = { ...a };
          delete next[item.id];
          return next;
        });
        setAddError(result.error);
        return;
      }
      setAdded((a) => ({ ...a, [item.id]: "added" }));
    },
    [added, eventId]
  );

  if (status !== "ready") {
    return (
      <Section title="What could go wrong">
        <p className="text-[11px] leading-snug text-label-2">
          {status === "loading"
            ? "Reading the plan for risks…"
            : "The risk register needs the layout engine, which did not load on this device. The rest of the studio still works."}
        </p>
      </Section>
    );
  }

  if (!report) {
    return (
      <Section title="What could go wrong">
        <p className="text-[11px] leading-snug text-label-2">
          Nothing to report yet — change the plan and the register follows it.
        </p>
      </Section>
    );
  }

  const groups = groupRisks(report.items);
  const safety = report.items.filter((i) => i.safetyCritical).length;

  return (
    <div>
      <Section
        title="What could go wrong"
        aside={
          <span className="text-[11px] font-semibold tabular-nums text-label-2">
            {report.items.length} to watch
          </span>
        }
      >
        <p className="text-[11px] leading-relaxed text-label-2">
          {safety > 0 ? (
            <>
              <span className="font-semibold text-night">{safety}</span> of
              these can hurt someone. The rest cost you money or the mood.
            </>
          ) : (
            "None of these can hurt someone — they are the experiential risks."
          )}{" "}
          {eventDate
            ? "Each one is dated from your event."
            : "Add the event date and each one gets a deadline."}
        </p>
        {addError && (
          <p
            role="status"
            className="mt-2 text-[11px] leading-snug text-[#b4483a]"
          >
            {addError}
          </p>
        )}
      </Section>

      {groups.map((g) => (
        <Section key={g.key} title={g.label}>
          <ul className="space-y-2">
            {g.items.map((item) => {
              const expanded = open === item.id;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-lg border",
                    item.safetyCritical
                      ? "border-[#b4483a]/50 bg-[#fdf4f2]"
                      : "border-hairline bg-white"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : item.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 w-full items-start gap-2 px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {item.safetyCritical && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#b4483a] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            <AlertTriangle size={9} aria-hidden="true" /> Safety
                          </span>
                        )}
                        <span className="text-sm leading-snug text-night">
                          {item.title}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={cn(
                            "rounded border px-1 py-px font-semibold",
                            LEVEL_TONE[item.likelihood]
                          )}
                        >
                          Likely: {levelWords(item.likelihood)}
                        </span>
                        <span
                          className={cn(
                            "rounded border px-1 py-px font-semibold",
                            LEVEL_TONE[item.impact]
                          )}
                        >
                          Impact: {levelWords(item.impact)}
                        </span>
                        <span className="font-semibold tabular-nums text-label-2">
                          {item.due ? dueWords(item.due) : item.when}
                        </span>
                      </span>
                    </span>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={cn(
                        "mt-1 shrink-0 text-label-2 transition-transform motion-reduce:transition-none",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>

                  {expanded && (
                    <div className="space-y-2 border-t border-hairline/70 px-2.5 py-2">
                      <p className="text-[11px] leading-relaxed text-night">
                        <span className="font-semibold text-label-2">
                          Do this:{" "}
                        </span>
                        {item.mitigation}
                      </p>
                      <p className="text-[11px] leading-relaxed text-label-2">
                        <span className="font-semibold">Because: </span>
                        {item.derivation}.
                      </p>
                      <p className="text-[10px] leading-snug text-label-2">
                        {item.due
                          ? `Due ${dueWords(item.due)} — ${item.when}.`
                          : `${item.when}.`}{" "}
                        Source: {item.source}.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void addToChecklist(item)}
                          disabled={Boolean(added[item.id])}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-hairline bg-ivory px-3 text-[11px] font-semibold text-night transition-colors hover:bg-white disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                        >
                          {added[item.id] === "added" ? (
                            <>
                              <Check size={12} aria-hidden="true" /> On the
                              checklist
                            </>
                          ) : added[item.id] === "adding" ? (
                            <>
                              <Loader2
                                size={12}
                                aria-hidden="true"
                                className="animate-spin motion-reduce:animate-none"
                              />
                              Adding…
                            </>
                          ) : (
                            <>
                              <Plus size={12} aria-hidden="true" /> Add to
                              checklist
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      ))}

      <Section title="How to read this">
        <div className="space-y-2.5">
          {report.notes.map((n, i) => (
            <p key={i} className="text-[11px] leading-relaxed text-label-2">
              {n}
            </p>
          ))}
        </div>
      </Section>
    </div>
  );
}

function levelWords(level: Level): string {
  return {
    low: "Low",
    "low-medium": "Low–Med",
    medium: "Med",
    high: "High",
  }[level];
}

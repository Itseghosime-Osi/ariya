"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  HALL_PRESETS,
  VENUE_BLURB,
  VENUE_ENVIRONMENT,
  VENUE_LABEL,
  formatFeet,
  type FloorFinish,
  type HallLayout,
  type Spacing,
} from "../model";
import type { VenueProfile, VenueType } from "@ariya/studio";
import {
  questionsFor,
  readVenueValue,
  venueFormIssues,
  writeVenueValue,
  type VenueQuestion,
} from "../venue-questions";
import { MetreField, Section, Segmented, Swatches, Tiles } from "../studio-ui";
import type { Pick } from "../Hall3D";
import { Swatch } from "./FitPanel";

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

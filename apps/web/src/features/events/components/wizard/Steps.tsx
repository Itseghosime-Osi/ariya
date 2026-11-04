"use client";

import React, { useRef } from "react";
import NumberFlow from "@number-flow/react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Calendar } from "./Calendar";
import { Chip, Eyebrow, fieldClass } from "./Chips";
import {
  AREAS,
  GUESTS_PER_PARTY,
  INTAKE_OPTIONS,
  OCCASIONS,
  PALETTES,
  PALETTE_CUSTOM,
  PARTY_MAX,
  PARTY_MIN,
  PARTY_PRESETS,
  TIME_SLOTS,
  VENUE_STARTERS,
  dayParts,
  occasionOf,
  saturdayInMonths,
  saturdayOnOrAfter,
  type IntakeMethod,
  type OccasionKey,
} from "./wizard-data";

export interface Draft {
  occasion: OccasionKey;
  name1: string;
  name2: string;
  title: string;
  ymd: string;
  slot: string;
  venue: string;
  area: string;
  paletteKey: string;
  dressCode: string;
  parties: number;
  intake: IntakeMethod;
}

export interface StepProps {
  draft: Draft;
  set: (patch: Partial<Draft>) => void;
}

const legend = "mb-3 block";
const sr = "sr-only";

/** A text field that ticks itself green the moment it is good to go. */
function Tick({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-rsvp-accepted text-white transition-[transform,opacity] duration-300 ease-out",
        ok ? "scale-100 opacity-100" : "scale-50 opacity-0"
      )}
    >
      <Icon name="check" size={13} />
    </span>
  );
}
const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Step 1: what are we celebrating, and for whom. */
export function StepWho({
  draft,
  set,
  suggestions,
}: StepProps & { suggestions: string[] }) {
  const occasion = occasionOf(draft.occasion);
  const twoNames = occasion.names === 2;
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className={legend}>
          <Eyebrow>The occasion</Eyebrow>
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {OCCASIONS.map((o, i) => (
            <Chip
              key={o.key}
              index={i}
              name="occasion"
              value={o.key}
              checked={draft.occasion === o.key}
              onChange={(v) => set({ occasion: v as OccasionKey })}
              testId={`occasion-${o.key}`}
            >
              <span aria-hidden="true">{o.emoji}</span>
              {o.label}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div
        className={cn(
          "grid gap-4",
          twoNames ? "sm:grid-cols-[1fr_auto_1fr] sm:items-end" : ""
        )}
      >
        <div>
          <label htmlFor="name-1" className="mb-2 block">
            <Eyebrow>{occasion.nameLabels[0]}</Eyebrow>
          </label>
          <div className="relative">
            <input
              id="name-1"
              type="text"
              autoComplete="off"
              className={cn(fieldClass, "pr-12 font-display text-xl")}
              placeholder={occasion.namePlaceholders[0]}
              value={draft.name1}
              onChange={(e) => set({ name1: e.target.value })}
            />
            <Tick ok={draft.name1.trim().length > 0} />
          </div>
        </div>
        {twoNames && (
          <>
            <span
              aria-hidden="true"
              className="hidden pb-3 font-display text-3xl italic text-gold-ink sm:block"
            >
              &amp;
            </span>
            <div>
              <label htmlFor="name-2" className="mb-2 block">
                <Eyebrow>{occasion.nameLabels[1]}</Eyebrow>
              </label>
              <div className="relative">
                <input
                  id="name-2"
                  type="text"
                  autoComplete="off"
                  className={cn(fieldClass, "pr-12 font-display text-xl")}
                  placeholder={occasion.namePlaceholders[1]}
                  value={draft.name2}
                  onChange={(e) => set({ name2: e.target.value })}
                />
                <Tick ok={draft.name2.trim().length > 0} />
              </div>
            </div>
          </>
        )}
      </div>

      <div>
        <label htmlFor="title" className="mb-2 block">
          <Eyebrow>Title</Eyebrow>
        </label>
        <div className="flex items-center gap-2">
          <input
            id="title"
            type="text"
            autoComplete="off"
            className={fieldClass}
            placeholder={suggestions[0] ?? "Appears once you add the names"}
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          <button
            type="button"
            disabled={suggestions.length < 2}
            onClick={() => {
              const at = suggestions.indexOf(draft.title);
              set({ title: suggestions[(at + 1) % suggestions.length] });
            }}
            aria-label="Suggest another title"
            className="group grid h-12 w-12 shrink-0 place-items-center rounded-full border border-gold-ink/25 bg-white/70 text-burgundy transition-[transform,border-color] hover:border-gold-ink/60 active:scale-90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            <Icon
              name="refresh"
              size={18}
              className="transition-transform duration-500 group-active:rotate-180"
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Step 2: a calendar to tap, a time of day, and a few shortcuts. */
export function StepWhen({
  draft,
  set,
  now,
  daysAway,
}: StepProps & { now: Date | null; daysAway: number | null }) {
  const slot = TIME_SLOTS.find((s) => s.key === draft.slot);
  const picked = dayParts(draft.ymd);
  const quick = now
    ? [
        { label: "Next Saturday", ymd: saturdayOnOrAfter(addDays(now, 7)) },
        { label: "In 3 months", ymd: saturdayInMonths(now, 3) },
        { label: "In 6 months", ymd: saturdayInMonths(now, 6) },
        { label: "In a year", ymd: saturdayInMonths(now, 12) },
      ]
    : [];
  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-10">
      {now ? (
        <Calendar
          value={draft.ymd}
          onChange={(ymd) => set({ ymd })}
          now={now}
        />
      ) : (
        <div
          aria-hidden="true"
          className="min-h-[380px] animate-pulse rounded-3xl bg-gold-ink/10"
        />
      )}

      <div className="space-y-7">
        <fieldset>
          <legend className={legend}>
            <Eyebrow>Jump to</Eyebrow>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {quick.map((q, i) => (
              <button
                key={q.label}
                type="button"
                onClick={() => set({ ymd: q.ymd })}
                style={{ "--i": i } as React.CSSProperties}
                className={cn(
                  "wiz-rise min-h-11 rounded-full border px-4 py-2 text-sm font-semibold transition-[transform,background-color,border-color] duration-150 hover:border-gold-ink/60 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink",
                  draft.ymd === q.ymd
                    ? "border-burgundy bg-burgundy/10 text-burgundy"
                    : "border-gold-ink/25 bg-white/70 text-night"
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={legend}>
            <Eyebrow>Time of day (Lagos time)</Eyebrow>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {TIME_SLOTS.map((s, i) => (
              <Chip
                key={s.key}
                name="slot"
                value={s.key}
                checked={draft.slot === s.key}
                onChange={(v) => set({ slot: v })}
                index={i + 2}
                testId={`slot-${s.key}`}
              >
                {s.label}
                <span className="text-xs font-medium opacity-75">
                  {s.clock}
                </span>
              </Chip>
            ))}
          </div>
        </fieldset>

        <p
          aria-live="polite"
          className="rounded-2xl bg-tint-sand px-4 py-3 text-sm text-night"
        >
          {picked ? (
            <span key={draft.ymd + draft.slot} className="wiz-in inline-block">
              <strong className="font-display text-base">{picked.long}</strong>
              {slot ? ` at ${slot.clock}` : ""}
              {daysAway !== null && daysAway > 0
                ? `. That's ${daysAway} ${daysAway === 1 ? "day" : "days"} from today.`
                : daysAway === 0
                  ? ". That's today!"
                  : daysAway !== null
                    ? ". That date has already passed."
                    : ""}
            </span>
          ) : (
            "Choose a day and we'll count down to it."
          )}
        </p>
      </div>
    </div>
  );
}

/** Step 3: where, and what everyone wears. */
export function StepWhere({ draft, set }: StepProps) {
  const venueRef = useRef<HTMLInputElement>(null);
  const starter = (value: string) => {
    const known = VENUE_STARTERS.includes(draft.venue);
    if (!draft.venue.trim() || known) set({ venue: value });
    venueRef.current?.focus();
  };
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className={legend}>
          <Eyebrow>City</Eyebrow>
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {AREAS.map((a, i) => (
            <Chip
              key={a}
              index={i}
              name="area-chip"
              value={a}
              checked={draft.area === a}
              onChange={(v) => set({ area: v })}
            >
              {a}
            </Chip>
          ))}
        </div>
        <label htmlFor="area" className={sr}>
          Another city or area
        </label>
        <input
          id="area"
          type="text"
          autoComplete="off"
          className={cn(fieldClass, "mt-3 max-w-md")}
          placeholder="Another city or area"
          value={draft.area}
          onChange={(e) => set({ area: e.target.value })}
        />
      </fieldset>

      <fieldset>
        <legend className={legend}>
          <Eyebrow>Venue</Eyebrow>
        </legend>
        <div className="flex flex-wrap gap-2.5">
          {VENUE_STARTERS.map((v, i) => (
            <Chip
              key={v}
              index={i}
              name="venue-starter"
              value={v}
              checked={draft.venue === v}
              onChange={starter}
            >
              {v}
            </Chip>
          ))}
        </div>
        <label htmlFor="venue" className={sr}>
          Venue name
        </label>
        <div className="relative mt-3">
          <input
            ref={venueRef}
            id="venue"
            type="text"
            autoComplete="off"
            className={cn(fieldClass, "pr-12")}
            placeholder="Venue name, e.g. The Grand Pavilion"
            value={draft.venue}
            onChange={(e) => set({ venue: e.target.value })}
          />
          <Tick ok={draft.venue.trim().length >= 2} />
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>
          <Eyebrow>Aṣọ-Ẹbí colours</Eyebrow>
        </legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PALETTES.map((p, i) => {
            const on = draft.paletteKey === p.key;
            return (
              <label
                key={p.key}
                className="wiz-rise group relative block min-w-0"
                style={{ "--i": i } as React.CSSProperties}
              >
                <input
                  type="radio"
                  name="palette"
                  value={p.key}
                  checked={on}
                  onChange={() =>
                    set({ paletteKey: p.key, dressCode: p.dressCode })
                  }
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border bg-white/80 px-3 py-2 text-sm font-semibold text-night transition-[transform,border-color,box-shadow] duration-150 hover:border-gold-ink/60 active:scale-[0.97] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-ink",
                    on
                      ? "wiz-pop border-burgundy shadow-[0_10px_24px_-16px_rgba(110,20,38,0.7)]"
                      : "border-gold-ink/25"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${p.colors[0]} 0 55%, ${p.colors[1]} 55% 100%)`,
                    }}
                  />
                  <span className="min-w-0 leading-tight">{p.label}</span>
                  {on && (
                    <Icon
                      name="check"
                      size={16}
                      className="ml-auto shrink-0 text-burgundy"
                    />
                  )}
                </span>
              </label>
            );
          })}
          <label className="relative col-span-2 block sm:col-span-3">
            <input
              type="radio"
              name="palette"
              value={PALETTE_CUSTOM}
              checked={draft.paletteKey === PALETTE_CUSTOM}
              onChange={() => set({ paletteKey: PALETTE_CUSTOM })}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border bg-white/60 px-4 py-2 text-sm font-semibold text-night transition-colors hover:border-gold-ink/60 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-ink",
                draft.paletteKey === PALETTE_CUSTOM
                  ? "border-burgundy"
                  : "border-dashed border-gold-ink/40"
              )}
            >
              <Icon name="stylus" size={16} />
              In my own words
            </span>
          </label>
        </div>
        {draft.paletteKey === PALETTE_CUSTOM && (
          <div className="mt-4">
            <label htmlFor="dressCode" className="mb-2 block">
              <Eyebrow>Aṣọ-Ẹbí and dress code</Eyebrow>
            </label>
            <input
              id="dressCode"
              type="text"
              autoComplete="off"
              className={fieldClass}
              placeholder="e.g. Aṣọ-Ẹbí: Burgundy velvet and champagne gold"
              value={draft.dressCode}
              onChange={(e) => set({ dressCode: e.target.value })}
            />
          </div>
        )}
      </fieldset>
    </div>
  );
}

/** Step 4: how the list gets in, and how big it is. */
export function StepGuests({ draft, set }: StepProps) {
  const dots = Math.max(1, Math.round(draft.parties / 10));
  const nudge = (by: number) =>
    set({
      parties: Math.min(PARTY_MAX, Math.max(PARTY_MIN, draft.parties + by)),
    });
  return (
    <div className="space-y-8">
      <fieldset>
        <legend className={legend}>
          <Eyebrow>How will guests come in?</Eyebrow>
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          {INTAKE_OPTIONS.map((o, i) => {
            const on = draft.intake === o.key;
            return (
              <label
                key={o.key}
                className="wiz-rise relative"
                style={{ "--i": i } as React.CSSProperties}
              >
                <input
                  type="radio"
                  name="intake"
                  value={o.key}
                  checked={on}
                  onChange={() => set({ intake: o.key })}
                  data-testid={`intake-${o.key}`}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "flex h-full min-h-[112px] cursor-pointer flex-col gap-1.5 rounded-2xl border bg-white/80 p-4 transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-gold-ink/60 active:scale-[0.98] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold-ink",
                    on
                      ? "border-burgundy shadow-[0_12px_28px_-18px_rgba(110,20,38,0.7)]"
                      : "border-gold-ink/25"
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full transition-colors",
                        on
                          ? "bg-burgundy text-champagne"
                          : "bg-gold/20 text-burgundy"
                      )}
                    >
                      <Icon name={o.icon} size={18} />
                    </span>
                    {on && (
                      <Icon
                        name="check_circle"
                        size={18}
                        className="text-burgundy"
                      />
                    )}
                  </span>
                  <span className="font-display text-lg font-bold leading-tight text-night">
                    {o.title}
                  </span>
                  <span className="text-xs text-label-2">{o.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <label htmlFor="parties">
            <Eyebrow>How many invitations?</Eyebrow>
          </label>
          <p className="text-sm text-label-2">
            About{" "}
            <strong className="tabular-nums text-night">
              {draft.parties * GUESTS_PER_PARTY}
            </strong>{" "}
            guests, at {GUESTS_PER_PARTY} per invitation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => nudge(-10)}
            aria-label="Fewer invitations"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold-ink/25 bg-white/80 text-xl font-bold text-night transition-transform hover:border-gold-ink/60 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
          >
            <span aria-hidden="true">−</span>
          </button>
          <input
            id="parties"
            type="range"
            min={PARTY_MIN}
            max={PARTY_MAX}
            step={10}
            value={draft.parties}
            onChange={(e) => set({ parties: Number(e.target.value) })}
            className="h-11 w-full cursor-pointer accent-[#6e1426]"
            data-testid="parties-range"
          />
          <button
            type="button"
            onClick={() => nudge(10)}
            aria-label="More invitations"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold-ink/25 bg-white/80 text-xl font-bold text-night transition-transform hover:border-gold-ink/60 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <NumberFlow
            value={draft.parties}
            respectMotionPreference
            className="font-display text-4xl font-bold tabular-nums text-burgundy"
          />
          <span className="text-sm text-label-2">invitations</span>
          <span className="mx-1 h-6 w-px bg-gold-ink/25" aria-hidden="true" />
          {PARTY_PRESETS.map((n) => (
            <Chip
              key={n}
              name="party-preset"
              value={String(n)}
              checked={draft.parties === n}
              onChange={(v) => set({ parties: Number(v) })}
            >
              {n}
            </Chip>
          ))}
        </div>
        <div
          className="mt-4 flex flex-wrap gap-1"
          aria-hidden="true"
          title="Each dot is ten invitations"
        >
          {Array.from({ length: dots }, (_, i) => (
            <span
              key={i}
              className="wiz-rise h-2.5 w-2.5 rounded-full bg-[#b8864b]"
              style={
                {
                  opacity: 0.45 + ((i * 7) % 11) / 20,
                  "--i": Math.min(i, 24) / 3,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

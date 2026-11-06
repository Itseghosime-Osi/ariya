"use client";

import { useMemo, useState } from "react";
import type {
  AlcoholAnswer,
  CakeAnswer,
  CateringReport,
  ThermalReport,
} from "@ariya/studio";
import { cn } from "@/lib/utils";
import type { HallLayout } from "./model";
import { cateringRequest } from "./catering";
import { thermalRequest } from "./thermal";
import { useStudioEngine } from "./useStudioEngine";
import {
  ENVIRONMENT_CARDS,
  SERVICE_CARDS,
  VENUE_CARDS,
  applySimpleAnswers,
  cateringFromSimple,
  defaultEnvironmentFor,
  defaultSimpleAnswers,
  guestsFromSimple,
  type SimpleAnswers,
  type TimeOfDay,
} from "./simple-mode";

/**
 * Simple mode (7.1): six questions, then a plan.
 *
 * The answers are kept in local state and written to the same `hall_layout` document the studio
 * edits (7.2), so switching modes loses nothing. The outputs — verdict, shopping list — come from
 * the same Rust engine the studio calls, via the same request builders, so the two modes cannot
 * disagree about a number.
 */

export interface SimpleModeProps {
  layout: HallLayout;
  onLayoutChange: (next: HallLayout) => void;
  /** The hall's own capacity, so the plan can say whether the guest count fits. */
  totalCapacity: number;
  /** The event's own guest count, so question 2 opens on the real number, not a placeholder. */
  guestCount: number;
}

export function SimpleMode({
  layout,
  onLayoutChange,
  totalCapacity,
  guestCount,
}: SimpleModeProps) {
  const [answers, setAnswers] = useState<SimpleAnswers>(() =>
    answersFromLayout(layout, guestCount)
  );
  const [showResults, setShowResults] = useState(false);
  const { engine, status } = useStudioEngine();

  const guests = guestsFromSimple(answers);

  const pick = (patch: Partial<SimpleAnswers>) => {
    const next = { ...answers, ...patch };
    setAnswers(next);
    onLayoutChange(applySimpleAnswers(layout, next));
  };

  const reports = useMemo(() => {
    if (!engine || !showResults) return null;
    const plan = applySimpleAnswers(layout, answers);
    const catering = cateringFromSimple(answers);
    try {
      return {
        thermal: engine.thermal(thermalRequest(plan, guests)),
        catering: engine.catering(cateringRequest(catering, guests)),
      };
    } catch {
      return null;
    }
  }, [engine, showResults, layout, answers, guests]);

  return (
    <div className="mx-auto w-full max-w-3xl overflow-y-auto px-4 pb-24 pt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-label-2">
        Six questions
      </p>
      <h2 className="mt-1 font-display text-xl text-night">
        Tell us about the day
      </h2>
      <p className="mt-1 text-sm text-label-2">
        Answer these and we will work out the room. You can switch to the full
        studio at any time; nothing you answer here is lost.
      </p>

      <Question n={1} title="What kind of venue?" hint="Pick the closest.">
        <Cards
          value={answers.venueType}
          items={VENUE_CARDS}
          onPick={(venueType) =>
            pick({
              venueType,
              // A garden is not indoors. Moving the venue moves the setting with it, unless the
              // host has already said otherwise — which they have, by the time they reach q4.
              environment: defaultEnvironmentFor(venueType),
            })
          }
        />
      </Question>

      <Question n={2} title="How many guests?" hint="A round number is fine.">
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={2000}
            value={answers.guests}
            aria-label="How many guests"
            onChange={(e) => pick({ guests: Number(e.target.value) || 1 })}
            className="min-h-12 w-32 rounded-xl border border-hairline bg-white px-3 text-base font-semibold text-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          />
          <p className="text-sm text-label-2">
            {totalCapacity > 0
              ? `The hall seats ${totalCapacity} now.`
              : "The hall has no tables yet."}
          </p>
        </div>
        {totalCapacity > 0 && guests > totalCapacity && (
          <p className="mt-2 rounded-xl border border-[#c9a465]/40 bg-[#fdf6e8] px-3 py-2 text-xs font-medium text-[#5c4013]">
            That is {guests - totalCapacity} more than there is room for. The
            studio can show you where to add tables.
          </p>
        )}
      </Question>

      <Question n={3} title="What happens at the table?">
        <Cards
          value={answers.service}
          items={SERVICE_CARDS}
          onPick={(service) => pick({ service })}
        />
      </Question>

      <Question n={4} title="Where will people sit?">
        <Cards
          value={answers.environment}
          items={ENVIRONMENT_CARDS}
          onPick={(environment) => pick({ environment })}
        />
      </Question>

      <Question n={5} title="What time of day?">
        <Cards
          value={answers.timeOfDay}
          items={[
            {
              key: "afternoon" as TimeOfDay,
              label: "Afternoon",
              blurb: "Daylight, and the heat with it",
            },
            {
              key: "evening" as TimeOfDay,
              label: "Evening",
              blurb: "After sunset, cooler air",
            },
          ]}
          onPick={(timeOfDay) => pick({ timeOfDay })}
        />
      </Question>

      <Question n={6} title="What about drinks and cake?">
        <div className="space-y-3">
          <Cards
            label="Will you serve alcohol?"
            value={answers.alcohol}
            items={[
              {
                key: "none" as AlcoholAnswer,
                label: "None",
                blurb: "A dry event",
              },
              {
                key: "beer-wine" as AlcoholAnswer,
                label: "Beer & wine",
                blurb: "The usual reception bar",
              },
              {
                key: "full-bar" as AlcoholAnswer,
                label: "Full bar",
                blurb: "Spirits and cocktails too",
              },
              {
                key: "unsure" as AlcoholAnswer,
                label: "Not sure",
                blurb: "Show me both",
              },
            ]}
            onPick={(alcohol) => pick({ alcohol })}
          />
          <Cards
            label="Is the cake dessert or decoration?"
            value={answers.cake}
            items={[
              {
                key: "dessert" as CakeAnswer,
                label: "Dessert",
                blurb: "Sliced and eaten",
              },
              {
                key: "ceremonial" as CakeAnswer,
                label: "Served with coffee",
                blurb: "A slice for each guest",
              },
              {
                key: "decoration" as CakeAnswer,
                label: "Decoration",
                blurb: "Cut for photographs only",
              },
            ]}
            onPick={(cake) => pick({ cake })}
          />
        </div>
      </Question>

      <button
        type="button"
        onClick={() => setShowResults(true)}
        disabled={status === "loading"}
        className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-burgundy px-6 text-sm font-semibold text-ivory hover:bg-wine disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        {status === "loading" ? "Working out your plan…" : "Show me the plan"}
      </button>

      {showResults && (
        <SimpleResults
          guests={guests}
          reports={reports}
          engineUnavailable={status === "unavailable"}
          totalCapacity={totalCapacity}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- results */

function SimpleResults({
  guests,
  reports,
  engineUnavailable,
  totalCapacity,
}: {
  guests: number;
  reports: {
    thermal: ThermalReport;
    catering: CateringReport;
  } | null;
  engineUnavailable: boolean;
  totalCapacity: number;
}) {
  return (
    <section className="mt-8 space-y-4" aria-live="polite">
      <h2 className="font-display text-xl text-night">Your plan</h2>

      {engineUnavailable && (
        <p className="rounded-xl border border-hairline bg-white px-4 py-3 text-sm text-label-2">
          The planning engine did not load on this device, so the numbers are
          not available. Your answers are saved, and everything is there when
          you open this on another device.
        </p>
      )}

      {!reports && !engineUnavailable && (
        <p className="text-sm text-label-2">Working out the numbers…</p>
      )}

      {reports && (
        <>
          {/* The temperature verdict, in the engine's own words (open decision 3: plain language
              only in Simple mode, no SHR). */}
          <Card title="How it will feel">
            <p className="text-base font-semibold text-night">
              {reports.thermal.advice.headline}
            </p>
            <Why
              reasons={reports.thermal.advice.reasons}
              what="how we got this"
            />
          </Card>

          <Card title="What to buy">
            <p className="text-sm text-label-2">
              {reports.catering.portions} portions for {guests} guests.
            </p>
            <ul className="mt-2 space-y-2">
              {reports.catering.groups.map((group) => (
                <li key={group.unit}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-label-2">
                    {group.label}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {group.lines.map((line) => (
                      <li key={line.label} className="text-sm text-night">
                        <div className="flex items-baseline justify-between gap-3">
                          <span>{line.label}</span>
                          <span className="shrink-0 tabular-nums text-label-2">
                            {line.likely}
                          </span>
                        </div>
                        {/* The low–high band, so a host sees the range they are planning in. */}
                        <p className="text-[11px] text-label-2">{line.basis}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <Why reasons={reports.catering.notes} what="how we got this" />
          </Card>

          <Card title="Room to seat them">
            <p className="text-sm text-night">
              {totalCapacity > 0 && totalCapacity >= guests
                ? `The hall takes ${totalCapacity} — enough for ${guests}.`
                : totalCapacity > 0
                  ? `The hall takes ${totalCapacity}, which is short of ${guests}.`
                  : "The hall has no tables yet. The studio can lay them out for you."}
            </p>
            <p className="mt-1 text-xs text-label-2">
              To see where every table goes, switch to Studio mode.
            </p>
          </Card>

          <Card title="What to do next">
            <p className="text-sm text-night">
              The checklist is built from these answers. Open it to see the
              first task, and what it is waiting on.
            </p>
          </Card>
        </>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- pieces */

function Question({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6" aria-labelledby={`q-${n}`}>
      <h3
        id={`q-${n}`}
        className="flex items-baseline gap-2 text-sm font-semibold text-night"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f6f1e8] text-[11px] font-bold text-burgundy">
          {n}
        </span>
        {title}
      </h3>
      {hint && <p className="ml-8 mt-0.5 text-xs text-label-2">{hint}</p>}
      <div className="ml-8 mt-2">{children}</div>
    </section>
  );
}

/** A picture-card question: one choice, big targets, and a line saying what it means. */
function Cards<T extends string>({
  label,
  value,
  items,
  onPick,
}: {
  label?: string;
  value: T;
  items: { key: T; label: string; blurb: string }[];
  onPick: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label ?? "Choose one"}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      {items.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onPick(o.key)}
          className={cn(
            "flex min-h-[64px] flex-col justify-center rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
            value === o.key
              ? "border-burgundy bg-burgundy text-ivory"
              : "border-hairline bg-white text-night hover:border-night/30"
          )}
        >
          <span className="text-sm font-semibold">{o.label}</span>
          <span
            className={cn(
              "mt-0.5 text-[11px] leading-snug",
              value === o.key ? "text-ivory/80" : "text-label-2"
            )}
          >
            {o.blurb}
          </span>
        </button>
      ))}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white px-4 py-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-label-2">
        {title}
      </h3>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** The "how we got this" disclosure every derived number carries (7.3). */
function Why({ reasons, what }: { reasons: string[]; what: string }) {
  if (reasons.length === 0) return null;
  return (
    <details className="mt-2">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs font-semibold text-burgundy underline">
        {what}
      </summary>
      <ul className="mt-1 space-y-1 pl-4 text-xs leading-relaxed text-label-2">
        {reasons.map((r) => (
          <li key={r} className="list-disc">
            {r}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Read the stored document back into the six answers, so switching modes is lossless. */
export function answersFromLayout(
  layout: HallLayout,
  guestCount?: number
): SimpleAnswers {
  const base = defaultSimpleAnswers();
  const catering = layout.venue.catering;
  return {
    venueType: layout.venue.type ?? base.venueType,
    // The guest count is the event's, not the layout's, so it is passed in rather than stored.
    guests: guestCount && guestCount > 0 ? guestCount : base.guests,
    service:
      catering?.style === "cocktail"
        ? "cocktail"
        : catering?.style === "buffet" && (catering?.hours ?? 5) <= 2
          ? "ceremony"
          : "seated",
    environment: layout.venue.environment ?? base.environment,
    timeOfDay: layout.mood === "day" ? "afternoon" : "evening",
    alcohol: catering?.alcohol ?? base.alcohol,
    cake: catering?.cake ?? base.cake,
  };
}

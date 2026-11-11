"use client";

import { cn } from "@/lib/utils";
import type {
  AlcoholAnswer,
  CakeAnswer,
  CateringReport,
  Confidence,
} from "@ariya/studio";
import {
  defaultOverage,
  hasBar,
  overageFor,
  overageWords,
  perHead,
  type CateringAnswers,
} from "../catering";
import { Section, Segmented, Toggle } from "../studio-ui";

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

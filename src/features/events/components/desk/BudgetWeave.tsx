"use client";

import React, { useState } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Icon } from "@/components/ui/icon";
import { formatKobo } from "@/lib/format";
import {
  formatNairaCompact,
  type BudgetSummary,
} from "../../lib/overview-insights";

// Band colours: each holds 3:1 on ivory, and every band is labelled in the legend too.
const BANDS = [
  "#6e1426",
  "#8a6620",
  "#2e6a4f",
  "#3b5b8a",
  "#b4531f",
  "#7a4b8c",
  "#5a474e",
];

/**
 * The money as one length of woven cloth: each vendor category is a band as wide as its cost, the
 * paid part in full colour and the rest still on the loom (hatched). Point at a band, or tab to it,
 * to see its numbers.
 */
export function BudgetWeave({
  eventId,
  budget,
}: {
  eventId: string;
  budget: BudgetSummary;
}) {
  const [active, setActive] = useState<string | null>(null);
  const cats = budget.categories;
  const total = Math.max(1, budget.committedKobo);
  const paidPct =
    budget.committedKobo > 0
      ? Math.round((budget.paidKobo / budget.committedKobo) * 100)
      : 0;
  const shown = cats.find((c) => c.category === active);

  return (
    <section
      aria-labelledby="budget-title"
      className="bento-card relative overflow-hidden p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            Budget
          </div>
          <h2
            id="budget-title"
            className="mt-1 font-display text-2xl font-bold text-night"
          >
            The money, woven
          </h2>
        </div>
        {cats.length > 0 && (
          <dl className="flex gap-4 text-right sm:gap-6">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-label-2">
                Committed
              </dt>
              <dd
                className="font-display text-2xl font-bold sm:text-3xl text-night tabular-nums"
                title={formatKobo(budget.committedKobo)}
              >
                {formatNairaCompact(budget.committedKobo)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-label-2">
                Paid
              </dt>
              <dd className="font-display text-2xl font-bold sm:text-3xl text-burgundy tabular-nums">
                <NumberFlow
                  value={paidPct}
                  suffix="%"
                  respectMotionPreference
                />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.16em] text-label-2">
                To go
              </dt>
              <dd className="font-display text-2xl font-bold sm:text-3xl text-night tabular-nums">
                {formatNairaCompact(budget.outstandingKobo)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {cats.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-hairline px-4 py-8 text-center sm:flex-row sm:gap-4 sm:text-left">
          <p className="text-sm text-label-2">
            Add vendors with their costs and deposits, and your budget will
            weave itself here.
          </p>
          <Link
            href={`/events/${eventId}/vendors`}
            className="mt-3 inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-burgundy px-4 text-xs font-semibold text-white hover:bg-wine sm:mt-0"
          >
            <Icon name="add_circle" size={16} />
            Add a vendor
          </Link>
        </div>
      ) : (
        <>
          {/* The cloth */}
          <div className="relative mt-6">
            <div
              className="flex h-16 gap-1 overflow-hidden rounded-2xl"
              onPointerLeave={() => setActive(null)}
            >
              {cats.map((c, i) => {
                const colour = BANDS[i % BANDS.length];
                const paid =
                  c.costKobo > 0 ? Math.min(1, c.paidKobo / c.costKobo) : 0;
                const dim = active && active !== c.category;
                return (
                  <button
                    key={c.category}
                    type="button"
                    onPointerEnter={() => setActive(c.category)}
                    onFocus={() => setActive(c.category)}
                    onBlur={() => setActive(null)}
                    aria-label={`${c.category}: ${formatKobo(c.costKobo)} committed, ${formatKobo(c.paidKobo)} paid`}
                    className="relative h-full min-w-6 overflow-hidden rounded-xl outline-none transition-[opacity,transform] duration-200 focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2"
                    style={{
                      flexGrow: Math.max(c.costKobo, total * 0.02),
                      flexBasis: 0,
                      opacity: dim ? 0.35 : 1,
                      transform:
                        active === c.category ? "translateY(-3px)" : undefined,
                      background: `repeating-linear-gradient(135deg, ${colour}33 0 5px, ${colour}14 5px 10px)`,
                    }}
                  >
                    <span
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${paid * 100}%`,
                        background: `repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 8px), ${colour}`,
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div
              className={`pointer-events-none mt-3 flex min-h-[44px] flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl bg-surface-container px-4 py-2.5 text-sm transition-opacity ${
                shown ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden="true"
            >
              {shown && (
                <>
                  <span className="font-semibold text-night">
                    {shown.category}
                  </span>
                  <span className="text-label-2">
                    <b className="text-night">
                      {formatNairaCompact(shown.costKobo)}
                    </b>{" "}
                    committed
                  </span>
                  <span className="text-label-2">
                    <b className="text-night">
                      {formatNairaCompact(shown.paidKobo)}
                    </b>{" "}
                    paid
                  </span>
                  <span className="text-label-2">
                    {shown.vendors} {shown.vendors === 1 ? "vendor" : "vendors"}
                  </span>
                </>
              )}
            </div>
          </div>

          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs">
            {cats.map((c, i) => (
              <li
                key={c.category}
                className="flex items-center gap-1.5 text-label-2"
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: BANDS[i % BANDS.length] }}
                  aria-hidden="true"
                />
                <span className="font-semibold text-night">{c.category}</span>
                <span className="tabular-nums">
                  {formatNairaCompact(c.costKobo)}
                </span>
              </li>
            ))}
            <li className="ml-auto">
              <Link
                href={`/events/${eventId}/vendors`}
                className="inline-flex items-center gap-1 font-semibold text-burgundy hover:underline"
              >
                All vendors <Icon name="arrow_forward" size={14} />
              </Link>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

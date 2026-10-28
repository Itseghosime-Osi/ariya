import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatKobo } from "@/lib/format";
import {
  formatNairaCompact,
  type BudgetSummary,
} from "../../lib/overview-insights";

/**
 * The money, in naira: what's committed to vendors, what's paid, and a bar per category with the paid
 * share woven in gold. Bars, not a pie: categories are compared, not sliced.
 */
export function BudgetTile({
  eventId,
  budget,
}: {
  eventId: string;
  budget: BudgetSummary;
}) {
  const top = budget.categories.slice(0, 5);
  const max = Math.max(1, ...top.map((c) => c.costKobo));
  const paidPct =
    budget.committedKobo > 0
      ? Math.round((budget.paidKobo / budget.committedKobo) * 100)
      : 0;

  return (
    <figure className="bento-card flex h-full flex-col p-6 sm:p-7">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
        Budget
      </div>
      <h2 className="mt-1 font-display text-2xl font-bold text-night">
        The money
      </h2>

      {budget.categories.length === 0 ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-hairline px-4 py-8 text-center">
          <p className="text-sm text-label-2">
            Add vendors with their costs and deposits to see your budget take
            shape.
          </p>
          <Link
            href={`/events/${eventId}/vendors`}
            className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-burgundy px-4 text-xs font-semibold text-white hover:bg-wine"
          >
            <Icon name="add_circle" size={16} />
            Add a vendor
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-3">
            <div
              className="font-display text-3xl font-bold text-night tabular-nums"
              title={formatKobo(budget.committedKobo)}
            >
              {formatNairaCompact(budget.committedKobo)}
            </div>
            <div className="text-xs text-label-2">
              committed to{" "}
              {budget.categories.reduce((s, c) => s + c.vendors, 0)} vendors
            </div>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container"
              aria-hidden="true"
            >
              <div
                className="weave-fill h-full rounded-full"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-label-2">
              <span>
                <b className="text-night tabular-nums">
                  {formatNairaCompact(budget.paidKobo)}
                </b>{" "}
                paid
              </span>
              <span>
                <b className="text-night tabular-nums">
                  {formatNairaCompact(budget.outstandingKobo)}
                </b>{" "}
                to go
              </span>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {top.map((c) => (
              <li key={c.category}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-semibold text-night">
                    {c.category}
                  </span>
                  <span className="tabular-nums text-label-2">
                    {formatNairaCompact(c.costKobo)}
                  </span>
                </div>
                <div
                  className="relative mt-1 h-2 rounded-full bg-surface-container"
                  aria-hidden="true"
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#e7d3d6]"
                    style={{ width: `${(c.costKobo / max) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-burgundy"
                    style={{
                      width: `${(Math.min(c.paidKobo, c.costKobo) / max) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <figcaption className="sr-only">
            {formatKobo(budget.committedKobo)} committed,{" "}
            {formatKobo(budget.paidKobo)} paid ({paidPct}%),{" "}
            {formatKobo(budget.outstandingKobo)} outstanding.
          </figcaption>
          <Link
            href={`/events/${eventId}/vendors`}
            className="mt-auto inline-flex items-center gap-1 pt-5 text-xs font-semibold text-burgundy hover:underline"
          >
            All vendors <Icon name="arrow_forward" size={14} />
          </Link>
        </>
      )}
    </figure>
  );
}

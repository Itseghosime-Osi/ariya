"use client";

import React, { useState } from "react";
import NumberFlow from "@number-flow/react";
import { Icon } from "@/components/ui/icon";
import { formatKobo } from "@/lib/format";
import { formatNairaCompact } from "@/features/events/lib/overview-insights";
import type { VendorFinancialStats, VendorWithTasks } from "../types";
import {
  balanceDue,
  categoryTone,
  paidRatio,
  summariseDeliverables,
} from "../lib/vendor-insights";

const RING = 64;
const RING_STROKE = 7;

/**
 * Every contract as one length of woven cloth: each vendor is a band as wide as its fee, the paid
 * part in full colour and the rest still on the loom. Point at a band, or tab to it, to read its
 * numbers. Deliverables close in the ring beside it.
 */
export function VendorLoom({
  vendors,
  stats,
}: {
  vendors: VendorWithTasks[];
  stats: VendorFinancialStats;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = vendors.find((vendor) => vendor.id === activeId) ?? null;
  const deliverables = summariseDeliverables(vendors);
  const paidPct =
    stats.contractedKobo > 0
      ? Math.round((stats.depositsPaidKobo / stats.contractedKobo) * 100)
      : 0;
  const captionId = "vendor-loom-caption";

  return (
    <section
      aria-labelledby="vendor-loom-title"
      className="profile-card relative overflow-hidden rounded-[28px] p-4 text-champagne sm:p-7"
    >
      <span aria-hidden="true" className="profile-card__weave" />
      <div className="relative flex items-start justify-between gap-4 sm:flex-wrap sm:gap-5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold">
            Money
          </div>
          <h2
            id="vendor-loom-title"
            className="mt-0.5 font-display text-xl font-bold text-[#fff6dc] sm:mt-1 sm:text-2xl"
          >
            The contracts, woven
          </h2>
          <p className="mt-1 hidden max-w-md text-sm text-champagne/65 sm:block">
            Solid cloth is paid; the hatched stretch is still owed.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="relative hidden place-items-center sm:grid">
            <svg
              width={RING}
              height={RING}
              viewBox={`0 0 ${RING} ${RING}`}
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={RING / 2}
                cy={RING / 2}
                r={RING / 2 - RING_STROKE / 2}
                fill="none"
                stroke="rgba(255,246,220,0.14)"
                strokeWidth={RING_STROKE}
              />
              <circle
                cx={RING / 2}
                cy={RING / 2}
                r={RING / 2 - RING_STROKE / 2}
                fill="none"
                stroke="#e9c98a"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={`${Math.max(0.001, deliverables.ratio)} 1`}
                style={{
                  transition:
                    "stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </svg>
            <span className="absolute font-display text-sm font-bold text-[#fff6dc] tabular-nums">
              {Math.round(deliverables.ratio * 100)}%
            </span>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-champagne/65">
              Deliverables
            </div>
            <div className="font-display text-xl font-bold text-[#fff6dc] tabular-nums">
              {deliverables.done}
              <span className="text-base font-normal text-champagne/65">
                /{deliverables.total}
              </span>
            </div>
            <div className="text-xs text-champagne/65">
              {stats.overdueTasksCount > 0 ? (
                <span className="font-semibold text-[#ff9aa8]">
                  {stats.overdueTasksCount} overdue
                </span>
              ) : deliverables.total === 0 ? (
                "No tasks yet"
              ) : (
                "All on schedule"
              )}
            </div>
          </div>
        </div>
      </div>

      <dl className="relative mt-4 grid grid-cols-3 gap-3 sm:mt-6 sm:gap-6">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-champagne/65">
            Contracted
          </dt>
          <dd
            className="font-display text-xl font-bold text-[#fff6dc] tabular-nums sm:text-3xl"
            title={formatKobo(stats.contractedKobo)}
          >
            {formatNairaCompact(stats.contractedKobo)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-champagne/65">
            Paid
          </dt>
          <dd className="font-display text-xl font-bold text-gold tabular-nums sm:text-3xl">
            <NumberFlow value={paidPct} suffix="%" respectMotionPreference />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.16em] text-champagne/65">
            To go
          </dt>
          <dd
            className="font-display text-xl font-bold text-[#fff6dc] tabular-nums sm:text-3xl"
            title={formatKobo(stats.balanceDueKobo)}
          >
            {formatNairaCompact(stats.balanceDueKobo)}
          </dd>
        </div>
      </dl>

      {vendors.length === 0 ? (
        <p className="relative mt-4 rounded-2xl border border-dashed border-gold/25 px-4 py-6 text-center text-sm text-champagne/65">
          Add your first vendor and the cloth starts to weave itself here.
        </p>
      ) : (
        <>
          <div
            className="relative mt-4 flex h-10 gap-1 sm:mt-6 sm:h-14 overflow-hidden rounded-2xl"
            onPointerLeave={() => setActiveId(null)}
          >
            {vendors.map((vendor) => {
              const paid = paidRatio(vendor);
              const tone = categoryTone(vendor.category);
              const on = activeId === vendor.id;
              return (
                <button
                  key={vendor.id}
                  type="button"
                  onPointerEnter={() => setActiveId(vendor.id)}
                  onFocus={() => setActiveId(vendor.id)}
                  onBlur={() => setActiveId(null)}
                  aria-describedby={captionId}
                  aria-label={`${vendor.name}: ${formatKobo(vendor.cost_kobo)} contract, ${Math.round(paid * 100)}% paid`}
                  className="relative min-w-[10px] overflow-hidden rounded-md transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  style={{
                    flexGrow: Math.max(vendor.cost_kobo, 1),
                    flexBasis: 0,
                    backgroundColor: `${tone}44`,
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(255,246,220,0.16) 0 3px, transparent 3px 7px)",
                    transform: on ? "scaleY(1.06)" : undefined,
                  }}
                >
                  <span
                    className="absolute inset-y-0 left-0"
                    style={{ width: `${paid * 100}%`, backgroundColor: tone }}
                  />
                  <span
                    className={`absolute inset-0 transition-colors ${on ? "bg-white/20" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          <p
            id={captionId}
            aria-live="polite"
            className="mt-2 min-h-[1.25rem] truncate text-xs text-champagne/65 sm:mt-3 sm:text-sm"
          >
            {active ? (
              <>
                <span className="font-semibold text-[#fff6dc]">
                  {active.name}
                </span>
                {" · "}
                {formatKobo(active.cost_kobo)} contract ·{" "}
                {formatKobo(active.deposit_kobo)} paid ·{" "}
                {formatKobo(balanceDue(active))} to go
              </>
            ) : (
              <>
                <Icon name="info" size={13} className="mr-1 inline text-gold" />
                <span className="sm:hidden">
                  Tap a band to read its numbers.
                </span>
                <span className="hidden sm:inline">
                  Hover or tab through the bands to see each vendor&rsquo;s
                  numbers.
                </span>
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}

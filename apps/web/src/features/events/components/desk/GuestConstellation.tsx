"use client";

import React, { useEffect, useMemo, useState } from "react";
import NumberFlow from "@number-flow/react";
import type { EventMetrics } from "../../types";
import {
  layoutConstellation,
  type ConstellationGuest,
} from "../../lib/overview-insights";

const MULTIPLIER_KEY = "ariya-overrun";
const MULTIPLIERS = [1, 1.25, 1.5, 2, 2.5, 3];

type Filter = "all" | ConstellationGuest["status"];
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "accepted", label: "Coming" },
  { key: "pending", label: "Yet to reply" },
  { key: "declined", label: "Declined" },
];

/**
 * The guest list as a night sky: every party is a star, the bride's people in one bloom and the
 * groom's in another. Confirmed guests glow gold, those yet to reply are open rings, declines are
 * faint dust, so it reads without colour. Pick a filter to light up one group; hover a star to see
 * who it is. Below, an "expected on the day" estimate, because owambes famously outgrow the list.
 */
export function GuestConstellation({
  eventId,
  guests,
  metrics,
}: {
  eventId: string;
  guests: ConstellationGuest[];
  metrics: EventMetrics;
}) {
  const layout = useMemo(() => layoutConstellation(guests), [guests]);
  const [hover, setHover] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [multiplier, setMultiplier] = useState(1.5);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(`${MULTIPLIER_KEY}:${eventId}`));
      if (MULTIPLIERS.includes(v)) setMultiplier(v);
    } catch {
      /* default estimate */
    }
  }, [eventId]);

  const step = (dir: 1 | -1) => {
    const i = MULTIPLIERS.indexOf(multiplier);
    const next =
      MULTIPLIERS[Math.max(0, Math.min(MULTIPLIERS.length - 1, i + dir))];
    setMultiplier(next);
    try {
      localStorage.setItem(`${MULTIPLIER_KEY}:${eventId}`, String(next));
    } catch {
      /* not remembered */
    }
  };

  const counts = {
    all: metrics.totalParties,
    accepted: metrics.acceptedParties,
    pending: metrics.awaitingParties,
    declined: metrics.declinedParties,
  };
  const expected = Math.round(metrics.acceptedGuests * multiplier);
  const hovered = layout.dots.find((d) => d.id === hover);
  const captionId = `constellation-caption-${eventId}`;

  return (
    <figure className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-[#12040a] p-6 text-ivory shadow-[0_24px_50px_-28px_rgba(28,7,13,0.75)] sm:p-7">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_40%,rgba(110,20,38,0.55),transparent_70%)]"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
            Guests
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold">
            Your constellation
          </h2>
        </div>
        <div className="text-right">
          <div className="font-display text-4xl font-bold leading-none text-[#e9c98a] tabular-nums">
            <NumberFlow
              value={metrics.acceptedGuests}
              respectMotionPreference
            />
          </div>
          <div className="text-[11px] text-ivory/70">people coming</div>
        </div>
      </div>

      <div
        className="relative mt-4 flex flex-wrap gap-1.5"
        role="group"
        aria-label="Show guests"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === f.key
                ? "bg-[#e9c98a] text-[#1c070d]"
                : "bg-ivory/10 text-ivory/85 hover:bg-ivory/15"
            }`}
          >
            {f.label}{" "}
            <span className="tabular-nums opacity-75">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="relative mt-3 flex-1">
        {layout.dots.length === 0 ? (
          <div className="grid h-full min-h-[200px] place-items-center rounded-2xl border border-dashed border-ivory/20 text-center text-sm text-ivory/75">
            <p>
              Your guests will appear here as stars,
              <br />
              one for every party you invite.
            </p>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            role="img"
            aria-labelledby={captionId}
            className="w-full overflow-visible"
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <radialGradient id={`star-${eventId}`}>
                <stop offset="0" stopColor="#fff6dc" />
                <stop offset="0.5" stopColor="#e9c98a" />
                <stop offset="1" stopColor="#b8864b" />
              </radialGradient>
            </defs>
            {layout.groups.map((g) => (
              <text
                key={g.label}
                x={g.x}
                y={layout.height - 4}
                textAnchor="middle"
                className="fill-[#d8c8ce] text-[9px] font-semibold uppercase tracking-[0.18em]"
              >
                {g.label} · {g.count}
              </text>
            ))}
            {layout.dots.map((d, i) => {
              const lit = filter === "all" || filter === d.status;
              const common = {
                onPointerEnter: () => setHover(d.id),
                style: {
                  transformOrigin: `${d.x}px ${d.y}px`,
                  animation: `desk-star 520ms cubic-bezier(0.34,1.4,0.64,1) ${Math.min(i * 6, 900)}ms both`,
                  opacity: lit ? 1 : 0.12,
                  transition: "opacity 250ms ease",
                } as React.CSSProperties,
              };
              if (d.status === "accepted")
                return (
                  <circle
                    key={d.id}
                    cx={d.x}
                    cy={d.y}
                    r={d.r}
                    fill={`url(#star-${eventId})`}
                    {...common}
                    style={{
                      ...common.style,
                      filter:
                        lit && filter === "accepted"
                          ? "drop-shadow(0 0 3px rgba(233,201,138,0.9))"
                          : undefined,
                    }}
                  />
                );
              if (d.status === "pending")
                return (
                  <circle
                    key={d.id}
                    cx={d.x}
                    cy={d.y}
                    r={Math.max(1.2, d.r - 0.6)}
                    fill="none"
                    stroke="#f4efe6"
                    strokeOpacity={0.85}
                    strokeWidth={1.1}
                    {...common}
                  />
                );
              return (
                <circle
                  key={d.id}
                  cx={d.x}
                  cy={d.y}
                  r={Math.max(0.9, d.r * 0.5)}
                  fill="#8a7378"
                  {...common}
                />
              );
            })}
            {hovered && (
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r={hovered.r + 3.5}
                fill="none"
                stroke="#e9c98a"
                strokeWidth={1}
              />
            )}
          </svg>
        )}
        <div
          className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap rounded-full bg-ivory px-3 py-1 text-xs font-semibold text-[#1c070d] shadow-lg transition-opacity duration-150 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          {hovered
            ? `${hovered.name} · ${hovered.status === "accepted" ? "coming" : hovered.status === "pending" ? "yet to reply" : "can't make it"}`
            : ""}
        </div>
      </div>

      <figcaption id={captionId} className="sr-only">
        {metrics.acceptedGuests} people coming, {metrics.awaitingGuests} yet to
        reply and {metrics.declinedGuests} declined, across{" "}
        {metrics.totalParties} invited parties.
      </figcaption>

      <div className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl bg-ivory/[0.07] px-4 py-3 ring-1 ring-ivory/10">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e9c98a]">
            Expected on the day
          </div>
          <div className="font-display text-2xl font-bold tabular-nums">
            ≈ <NumberFlow value={expected} respectMotionPreference />
          </div>
          <div className="text-[11px] text-ivory/70">
            An estimate for plates and souvenirs
          </div>
        </div>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Overrun estimate"
        >
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={multiplier === MULTIPLIERS[0]}
            aria-label="Lower the estimate"
            className="grid h-9 w-9 place-items-center rounded-full bg-ivory/10 text-ivory hover:bg-ivory/20 disabled:opacity-40"
          >
            −
          </button>
          <span
            className="w-12 text-center text-sm font-bold tabular-nums"
            aria-live="polite"
          >
            ×{multiplier}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={multiplier === MULTIPLIERS[MULTIPLIERS.length - 1]}
            aria-label="Raise the estimate"
            className="grid h-9 w-9 place-items-center rounded-full bg-ivory/10 text-ivory hover:bg-ivory/20 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
    </figure>
  );
}

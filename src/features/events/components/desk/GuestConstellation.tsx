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

/**
 * Every guest party is a star: the bride's people in one bloom, the groom's in another. Confirmed
 * guests are filled burgundy, those yet to reply are open gold rings, and declines are small and grey,
 * so the picture reads without colour. Hover a star to see who it is. Beneath, the plain numbers and an
 * "expected on the day" estimate, because Nigerian weddings famously grow past the RSVP list.
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

  const people =
    metrics.acceptedGuests + metrics.awaitingGuests + metrics.declinedGuests;
  const pct = (n: number) => (people > 0 ? (n / people) * 100 : 0);
  const expected = Math.round(metrics.acceptedGuests * multiplier);
  const hovered = layout.dots.find((d) => d.id === hover);
  const captionId = `constellation-caption-${eventId}`;

  return (
    <figure className="bento-card relative flex h-full flex-col p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            Guests
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold text-night">
            Your constellation
          </h2>
        </div>
        <div className="text-right">
          <div className="font-display text-3xl font-bold leading-none text-burgundy tabular-nums">
            <NumberFlow
              value={metrics.acceptedGuests}
              respectMotionPreference
            />
          </div>
          <div className="text-[11px] text-label-2">coming</div>
        </div>
      </div>

      <div className="relative mt-3 flex-1">
        {layout.dots.length === 0 ? (
          <div className="grid h-full min-h-[180px] place-items-center rounded-2xl border border-dashed border-hairline text-center text-sm text-label-2">
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
            className="w-full"
            onPointerLeave={() => setHover(null)}
          >
            {layout.groups.map((g) => (
              <text
                key={g.label}
                x={g.x}
                y={layout.height - 4}
                textAnchor="middle"
                className="fill-[#5a474e] text-[9px] font-semibold uppercase tracking-[0.18em]"
              >
                {g.label} · {g.count}
              </text>
            ))}
            {layout.dots.map((d, i) => {
              const common = {
                onPointerEnter: () => setHover(d.id),
                style: {
                  transformOrigin: `${d.x}px ${d.y}px`,
                  animation: `desk-star 520ms cubic-bezier(0.34,1.4,0.64,1) ${Math.min(i * 6, 900)}ms both`,
                } as React.CSSProperties,
              };
              if (d.status === "accepted")
                return (
                  <circle
                    key={d.id}
                    cx={d.x}
                    cy={d.y}
                    r={d.r}
                    fill="#6e1426"
                    {...common}
                  />
                );
              if (d.status === "pending")
                return (
                  <circle
                    key={d.id}
                    cx={d.x}
                    cy={d.y}
                    r={Math.max(1.2, d.r - 0.6)}
                    fill="#fff"
                    stroke="#8a6620"
                    strokeWidth={1.2}
                    {...common}
                  />
                );
              return (
                <circle
                  key={d.id}
                  cx={d.x}
                  cy={d.y}
                  r={Math.max(1, d.r * 0.55)}
                  fill="#b9a9ad"
                  {...common}
                />
              );
            })}
            {hovered && (
              <circle
                cx={hovered.x}
                cy={hovered.y}
                r={hovered.r + 3}
                fill="none"
                stroke="#1c070d"
                strokeWidth={1}
              />
            )}
          </svg>
        )}
        <div
          className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-[#1c070d] px-3 py-1 text-xs font-semibold text-ivory shadow-lg transition-opacity duration-150 ${
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

      {/* The plain numbers: a stacked bar plus a legend that doubles colour with shape */}
      <div className="mt-4">
        <div
          className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-container"
          aria-hidden="true"
        >
          <span
            className="h-full rounded-full bg-[#6e1426]"
            style={{ width: `${pct(metrics.acceptedGuests)}%` }}
          />
          <span
            className="h-full rounded-full bg-[#d8b46a]"
            style={{ width: `${pct(metrics.awaitingGuests)}%` }}
          />
          <span
            className="h-full rounded-full bg-[#b9a9ad]"
            style={{ width: `${pct(metrics.declinedGuests)}%` }}
          />
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <li className="flex items-center gap-1.5 text-label-2">
            <span
              className="h-2.5 w-2.5 rounded-full bg-[#6e1426]"
              aria-hidden="true"
            />
            <span>
              <b className="text-night tabular-nums">
                {metrics.acceptedGuests}
              </b>{" "}
              coming
            </span>
          </li>
          <li className="flex items-center gap-1.5 text-label-2">
            <span
              className="h-2.5 w-2.5 rounded-full border-[1.5px] border-[#8a6620] bg-white"
              aria-hidden="true"
            />
            <span>
              <b className="text-night tabular-nums">
                {metrics.awaitingGuests}
              </b>{" "}
              to reply
            </span>
          </li>
          <li className="flex items-center gap-1.5 text-label-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#b9a9ad]"
              aria-hidden="true"
            />
            <span>
              <b className="text-night tabular-nums">
                {metrics.declinedGuests}
              </b>{" "}
              declined
            </span>
          </li>
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-tint-sand px-4 py-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-ink">
            Expected on the day
          </div>
          <div className="font-display text-2xl font-bold text-night tabular-nums">
            ≈ <NumberFlow value={expected} respectMotionPreference />
          </div>
          <div className="text-[11px] text-label-2">
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
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-night shadow-sm disabled:opacity-40"
          >
            −
          </button>
          <span
            className="w-12 text-center text-sm font-bold tabular-nums text-night"
            aria-live="polite"
          >
            ×{multiplier}
          </span>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={multiplier === MULTIPLIERS[MULTIPLIERS.length - 1]}
            aria-label="Raise the estimate"
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-night shadow-sm disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>
    </figure>
  );
}

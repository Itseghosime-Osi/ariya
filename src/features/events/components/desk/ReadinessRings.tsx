"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Icon } from "@/components/ui/icon";
import type { Readiness, ReadinessKey } from "../../lib/overview-insights";
import { celebrate, claimMilestone } from "./celebrate";

// Each colour holds 3:1 against the ivory card; the legend always carries words and numbers too.
const RING: Record<
  ReadinessKey,
  { colour: string; track: string; href: string }
> = {
  guests: { colour: "#c1283d", track: "#f6dde1", href: "guests" },
  seating: { colour: "#2e6a4f", track: "#dcebe2", href: "seating" },
  vendors: { colour: "#8a6620", track: "#f1e6cf", href: "vendors" },
  budget: { colour: "#b4531f", track: "#f6e1d3", href: "vendors" },
  tasks: { colour: "#3b5b8a", track: "#dfe6f1", href: "vendors" },
};

const SIZE = 240;
const STROKE = 12;
const GAP = 4;

/**
 * Five rings to close before the owambe, one inside the other: replies, seating, vendors, deposits,
 * tasks. They draw in on arrival; point at a ring (or its row) and it comes forward with its own
 * number in the centre. The first time a ring closes, the desk celebrates.
 */
export function ReadinessRings({
  eventId,
  readiness,
}: {
  eventId: string;
  readiness: Readiness;
}) {
  const [drawn, setDrawn] = useState(false);
  const [active, setActive] = useState<ReadinessKey | null>(null);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const closed = readiness.segments.filter(
      (s) => s.total > 0 && s.ratio >= 1
    );
    const fresh = closed.filter((s) => claimMilestone(`${eventId}:${s.key}`));
    if (fresh.length === 0) return;
    const t = window.setTimeout(() => {
      setAnnounce(
        `${fresh.map((s) => s.label).join(" and ")} complete. Well done!`
      );
      void celebrate({ x: 0.32, y: 0.5 });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [eventId, readiness]);

  const activeSeg = readiness.segments.find((s) => s.key === active) ?? null;
  const centreValue = activeSeg
    ? Math.round(activeSeg.ratio * 100)
    : readiness.overall;
  const captionId = `rings-caption-${eventId}`;

  return (
    <figure className="bento-card relative flex h-full flex-col overflow-hidden p-6 sm:p-7">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
        Readiness
      </div>
      <h2 className="mt-1 font-display text-2xl font-bold text-night">
        Five rings to close
      </h2>

      <div className="mt-5 flex flex-1 flex-col items-center gap-5">
        <div
          className="relative shrink-0"
          style={{ width: SIZE, height: SIZE }}
          onPointerLeave={() => setActive(null)}
        >
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-labelledby={captionId}
            className="-rotate-90"
          >
            {readiness.segments.map((s, i) => {
              const r = SIZE / 2 - STROKE / 2 - i * (STROKE + GAP);
              const ring = RING[s.key];
              const dim = active && active !== s.key;
              return (
                <g
                  key={s.key}
                  onPointerEnter={() => setActive(s.key)}
                  style={{
                    opacity: dim ? 0.22 : 1,
                    transition: "opacity 200ms ease",
                  }}
                >
                  <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={r}
                    fill="none"
                    stroke={ring.track}
                    strokeWidth={STROKE}
                  />
                  {s.ratio > 0 && (
                    <circle
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={r}
                      fill="none"
                      stroke={ring.colour}
                      strokeWidth={STROKE}
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray={`${drawn ? Math.max(0.001, s.ratio) : 0} 1`}
                      style={{
                        transition: `stroke-dasharray 1100ms cubic-bezier(0.22,1,0.36,1) ${150 + i * 130}ms`,
                        filter:
                          s.ratio >= 1
                            ? `drop-shadow(0 0 5px ${ring.colour}88)`
                            : undefined,
                      }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
          <div
            className="pointer-events-none absolute inset-0 grid place-items-center"
            aria-hidden="true"
          >
            <div className="text-center">
              <div className="flex items-baseline justify-center font-display font-bold leading-none text-night">
                <NumberFlow
                  value={drawn ? centreValue : 0}
                  respectMotionPreference
                  className="text-3xl tabular-nums"
                />
                <span className="text-lg text-gold-ink">%</span>
              </div>
              <div className="mt-0.5 max-w-[5rem] text-[9px] leading-tight font-semibold uppercase tracking-[0.16em] text-label-2">
                {activeSeg ? activeSeg.label : "ready"}
              </div>
            </div>
          </div>
        </div>

        <ul className="w-full space-y-1">
          {readiness.segments.map((s) => {
            const ring = RING[s.key];
            const done = s.total > 0 && s.ratio >= 1;
            const on = active === s.key;
            return (
              <li key={s.key}>
                <Link
                  href={`/events/${eventId}/${ring.href}`}
                  onPointerEnter={() => setActive(s.key)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(s.key)}
                  onBlur={() => setActive(null)}
                  className={`flex min-h-[40px] items-center gap-3 rounded-xl px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy ${
                    on ? "bg-surface-container" : "hover:bg-surface-container"
                  }`}
                >
                  <span
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
                    style={{ background: done ? ring.colour : ring.track }}
                    aria-hidden="true"
                  >
                    {done ? (
                      <Icon name="check" size={12} className="text-white" />
                    ) : (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: ring.colour }}
                      />
                    )}
                  </span>
                  <span className="flex-1 text-night">{s.label}</span>
                  <span className="font-semibold tabular-nums text-label-2">
                    {s.summary}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <figcaption id={captionId} className="sr-only">
        {readiness.overall}% ready overall.{" "}
        {readiness.segments.map((s) => `${s.label}: ${s.summary}`).join("; ")}.
      </figcaption>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </figure>
  );
}

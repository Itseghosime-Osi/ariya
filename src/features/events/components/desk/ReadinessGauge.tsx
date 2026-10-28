"use client";

import React, { useEffect, useState } from "react";
import NumberFlow from "@number-flow/react";
import { Icon } from "@/components/ui/icon";
import type { Readiness, ReadinessKey } from "../../lib/overview-insights";
import { celebrate, claimMilestone } from "./celebrate";

// Bright enough for 3:1 against the night card; each segment also carries its own label and numbers.
const COLOUR: Record<ReadinessKey, string> = {
  guests: "#f57c8a",
  seating: "#7fd1a8",
  vendors: "#e9c98a",
  budget: "#f6a96b",
  tasks: "#9db8f0",
};

const ARC = "M 22 134 A 108 108 0 0 1 238 134";
const GAP = 0.02;
const SEG = (1 - GAP * 4) / 5;

/**
 * Five rings to close before the owambe: a semicircle in five segments (guests, seating, vendors,
 * deposits, tasks), each filled to its own share. Segments draw in one after another; the first time
 * one closes, the desk celebrates.
 */
export function ReadinessGauge({
  eventId,
  readiness,
}: {
  eventId: string;
  readiness: Readiness;
}) {
  const [drawn, setDrawn] = useState(false);
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
      void celebrate({ x: 0.3, y: 0.45 });
    }, 1100);
    return () => window.clearTimeout(t);
  }, [eventId, readiness]);

  const captionId = `readiness-caption-${eventId}`;
  const summary = readiness.segments
    .map((s) => `${s.label}: ${s.summary}`)
    .join("; ");

  return (
    <figure className="relative flex h-full flex-col overflow-hidden rounded-[28px] bg-[#1c070d] p-6 text-ivory shadow-[0_24px_50px_-28px_rgba(28,7,13,0.7)] sm:p-7">
      <div
        className="weave absolute inset-0 opacity-[0.05]"
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
            Readiness
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold">
            Five rings to close
          </h2>
        </div>
      </div>

      <div className="relative mx-auto mt-4 w-full max-w-[340px]">
        <svg
          viewBox="0 0 260 146"
          role="img"
          aria-labelledby={captionId}
          className="w-full overflow-visible"
        >
          {readiness.segments.map((s, i) => {
            const start = i * (SEG + GAP);
            return (
              <g key={s.key}>
                <path
                  d={ARC}
                  pathLength={1}
                  fill="none"
                  stroke="rgba(244,239,230,0.1)"
                  strokeWidth={18}
                  strokeDasharray={`0 ${start} ${SEG} 1`}
                />
                {s.ratio > 0 && (
                  <path
                    d={ARC}
                    pathLength={1}
                    fill="none"
                    stroke={COLOUR[s.key]}
                    strokeWidth={18}
                    strokeDasharray={`0 ${start} ${drawn ? SEG * s.ratio : 0} 1`}
                    style={{
                      transition: `stroke-dasharray 900ms cubic-bezier(0.22,1,0.36,1) ${120 + i * 140}ms`,
                      filter:
                        s.ratio >= 1
                          ? `drop-shadow(0 0 6px ${COLOUR[s.key]})`
                          : undefined,
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center"
          aria-hidden="true"
        >
          <div className="flex items-baseline font-display font-bold leading-none text-ivory">
            <NumberFlow
              value={drawn ? readiness.overall : 0}
              respectMotionPreference
              className="text-6xl tabular-nums"
            />
            <span className="text-2xl text-[#e9c98a]">%</span>
          </div>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-ivory/70">
            ready
          </span>
        </div>
      </div>

      <figcaption id={captionId} className="sr-only">
        {readiness.overall}% ready overall. {summary}.
      </figcaption>

      <ul className="relative mt-6 grid gap-2.5">
        {readiness.segments.map((s) => {
          const pct = Math.round(s.ratio * 100);
          const done = s.total > 0 && s.ratio >= 1;
          return (
            <li key={s.key} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(${COLOUR[s.key]} ${pct * 3.6}deg, rgba(244,239,230,0.12) 0)`,
                }}
              >
                <span className="grid h-4 w-4 place-items-center rounded-full bg-[#1c070d]">
                  {done && (
                    <Icon name="check" size={11} className="text-ivory" />
                  )}
                </span>
              </span>
              <span className="flex-1 text-ivory/85">{s.label}</span>
              <span className="font-semibold tabular-nums text-ivory">
                {s.summary}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </figure>
  );
}

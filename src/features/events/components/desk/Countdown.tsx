"use client";

import React, { useEffect, useState } from "react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";

function partsUntil(target: number, now: number) {
  const ms = Math.max(0, target - now);
  const totalMinutes = Math.floor(ms / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
    done: ms === 0,
  };
}

/**
 * Days, hours and minutes to the day, in big Bodoni numerals that roll as they change. It ticks once
 * every 20 seconds; the label for screen readers is static and says the same in words.
 */
export function Countdown({
  dateIso,
  initialNow,
  tone = "dark",
}: {
  dateIso: string;
  initialNow: number;
  tone?: "dark" | "light";
}) {
  const target = new Date(dateIso).getTime();
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  if (Number.isNaN(target)) return null;
  const p = partsUntil(target, now);
  const unit = tone === "dark" ? "text-ivory/70" : "text-label-2";
  const num = tone === "dark" ? "text-[#e9c98a]" : "text-burgundy";
  const label = `${p.days} days, ${p.hours} hours and ${p.minutes} minutes to go`;

  return (
    <div
      role="timer"
      aria-live="off"
      aria-label={label}
      className="flex items-end gap-4 sm:gap-6"
    >
      <NumberFlowGroup>
        {(
          [
            ["days", p.days],
            ["hours", p.hours],
            ["mins", p.minutes],
          ] as const
        ).map(([name, value], i) => (
          <div
            key={name}
            className="flex flex-col items-center"
            aria-hidden="true"
          >
            <NumberFlow
              value={value}
              format={{ minimumIntegerDigits: i === 0 ? 1 : 2 }}
              respectMotionPreference
              className={`font-display font-bold leading-none tabular-nums ${num} ${
                i === 0
                  ? "text-6xl sm:text-7xl"
                  : i === 1
                    ? "text-4xl sm:text-5xl"
                    : "text-2xl sm:text-3xl"
              }`}
            />
            <span
              className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${unit}`}
            >
              {name}
            </span>
          </div>
        ))}
      </NumberFlowGroup>
    </div>
  );
}

"use client";

import React, { ViewTransition, useEffect, useState } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Icon } from "@/components/ui/icon";
import { formatEventDate } from "@/lib/format";
import type { Event, EventMetrics } from "../../types";
import { GoldDust } from "./GoldDust";
import { MonogramSeal } from "./MonogramSeal";
import { SparkleSurface } from "./Sparkles";
import { TiltCard } from "./TiltCard";

interface DeskHeroProps {
  event: Event;
  metrics: EventMetrics;
  initialNow: number;
  checkedInPeople: number;
}

const DAY = 86_400_000;

function useNow(initial: number) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/**
 * The desk's hero, kept spare: the couple's wax seal (it tilts and catches the light), their names,
 * one line of details, and a single countdown number inside a halo that fills as the day approaches.
 * Gold dust drifts and scatters from the cursor; a tap anywhere throws sparkles.
 */
export function DeskHero({
  event,
  metrics,
  initialNow,
  checkedInPeople,
}: DeskHeroProps) {
  const now = useNow(initialNow);
  const target = new Date(event.date).getTime();
  const hasDate = Boolean(event.date) && !Number.isNaN(target);
  const ms = hasDate ? Math.max(0, target - now) : 0;
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const isToday = hasDate && ms < DAY && now - target < DAY;

  // How much of the planning season has passed, from creating the event to the day.
  const created = new Date(event.created_at).getTime();
  const span = hasDate && created < target ? target - created : 0;
  const elapsed =
    span > 0 ? Math.min(1, Math.max(0.03, (now - created) / span)) : 0;
  const venue = [event.venue, event.area]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");
  const names = event.couple || event.title;
  const expected = Math.max(metrics.acceptedGuests, 0);

  return (
    <ViewTransition
      name={`celebration-${event.id}`}
      share="desk-morph"
      default="none"
    >
      <SparkleSurface className="overflow-hidden rounded-[32px] bg-[#1c070d] text-ivory shadow-[0_30px_60px_-30px_rgba(28,7,13,0.65)]">
        <div className="desk-aurora" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div
          className="weave absolute inset-0 opacity-[0.05]"
          aria-hidden="true"
        />
        <GoldDust density={46} />
        <div className="desk-grain absolute inset-0" aria-hidden="true" />

        <section
          aria-labelledby="desk-title"
          className="relative grid items-center gap-8 p-6 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:gap-10 lg:p-11"
        >
          <TiltCard max={12} className="mx-auto w-fit rounded-full lg:mx-0">
            <div className="relative grid h-36 w-36 place-items-center rounded-full sm:h-44 sm:w-44">
              <span
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(233,201,138,0.35),transparent_68%)] blur-md"
                aria-hidden="true"
              />
              <MonogramSeal
                text={names}
                size={168}
                className="relative h-full w-full drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
              />
              <span className="foil-sheen rounded-full" aria-hidden="true" />
            </div>
          </TiltCard>

          <div className="min-w-0 text-center lg:text-left">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#e9c98a]">
              Celebration Desk{" "}
              <span className="px-1.5 text-ivory/40" aria-hidden="true">
                ·
              </span>
              <span className="normal-case tracking-normal text-ivory/75">
                Every yes, together.
              </span>
            </div>
            <h1
              id="desk-title"
              className="mt-3 font-display text-4xl font-bold leading-[1.02] text-ivory sm:text-6xl"
            >
              {names}
            </h1>
            {event.couple && event.title && event.couple !== event.title && (
              <p className="mt-2 font-display text-lg italic text-ivory/75">
                {event.title}
              </p>
            )}
            <p className="mt-4 text-sm text-ivory/80">
              {hasDate ? formatEventDate(event.date) : "Date to be set"}
              {venue && (
                <>
                  <span className="px-2 text-[#e9c98a]" aria-hidden="true">
                    ✦
                  </span>
                  {venue}
                </>
              )}
            </p>
            <nav
              aria-label="Quick actions"
              className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start"
            >
              {[
                {
                  href: `/events/${event.id}/guests`,
                  label: "Guests",
                  icon: "add_circle" as const,
                  primary: true,
                },
                {
                  href: `/events/${event.id}/page-editor`,
                  label: "Event page",
                  icon: "visibility" as const,
                },
                {
                  href: `/events/${event.id}/check-in`,
                  label: "Check-in",
                  icon: "qr_code_scanner" as const,
                },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a] ${
                    a.primary
                      ? "bg-[#e9c98a] text-[#1c070d] shadow-[0_10px_30px_-12px_rgba(233,201,138,0.9)]"
                      : "bg-ivory/10 text-ivory ring-1 ring-ivory/20 hover:bg-ivory/15"
                  }`}
                >
                  <Icon name={a.icon} size={17} />
                  {a.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* One number: the countdown, in a halo that fills through the planning season */}
          <div className="mx-auto lg:mx-0">
            <div className="relative grid h-48 w-48 place-items-center sm:h-56 sm:w-56">
              <svg
                viewBox="0 0 200 200"
                className="absolute inset-0 -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="rgba(244,239,230,0.1)"
                  strokeWidth="3"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  stroke="url(#halo-gold)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={`${isToday ? 1 : elapsed} 1`}
                  className="transition-[stroke-dasharray] duration-1000"
                />
                <defs>
                  <linearGradient id="halo-gold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f6dca8" />
                    <stop offset="1" stopColor="#b8864b" />
                  </linearGradient>
                </defs>
              </svg>
              <div
                className="desk-ring absolute inset-3 rounded-full"
                aria-hidden="true"
              />
              {isToday ? (
                <div className="relative text-center" aria-live="polite">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
                    Owambe mode
                  </div>
                  <div className="mt-1 font-display text-6xl font-bold leading-none tabular-nums">
                    {checkedInPeople}
                  </div>
                  <div className="mt-1 text-xs text-ivory/75">
                    of {expected} at the gate
                  </div>
                </div>
              ) : hasDate ? (
                <div
                  className="relative text-center"
                  role="timer"
                  aria-live="off"
                  aria-label={`${days} days, ${hours} hours and ${minutes} minutes to go`}
                >
                  <NumberFlow
                    value={days}
                    respectMotionPreference
                    className="font-display text-7xl font-bold leading-none text-[#e9c98a] tabular-nums sm:text-8xl"
                    aria-hidden="true"
                  />
                  <div
                    className="mt-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-ivory/80"
                    aria-hidden="true"
                  >
                    {days === 1 ? "day to go" : "days to go"}
                  </div>
                  <div
                    className="mt-2 text-xs tabular-nums text-ivory/70"
                    aria-hidden="true"
                  >
                    {hours}h {String(minutes).padStart(2, "0")}m
                  </div>
                </div>
              ) : (
                <p className="relative max-w-[9rem] text-center text-sm text-ivory/80">
                  Set a date to start the countdown
                </p>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-ivory/75">
              {metrics.acceptedGuests}{" "}
              {metrics.acceptedGuests === 1 ? "guest" : "guests"} coming so far
            </p>
          </div>
        </section>
      </SparkleSurface>
    </ViewTransition>
  );
}

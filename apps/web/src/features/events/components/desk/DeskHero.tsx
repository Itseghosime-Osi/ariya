"use client";

import React, { ViewTransition, useEffect, useState } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { Icon } from "@/components/ui/icon";
import { formatEventDate, getLagosDateKey } from "@/lib/format";
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
  // "Today" and "past" follow the Lagos calendar day, not a rolling 24 hours.
  const isToday =
    hasDate && getLagosDateKey(now) === getLagosDateKey(event.date);
  const isPast = hasDate && !isToday && now > target;

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
    <div>
      <ViewTransition
        name={`celebration-${event.id}`}
        share="desk-morph"
        default="none"
      >
        <SparkleSurface className="overflow-hidden rounded-[28px] bg-[#1c070d] sm:rounded-4xl text-ivory shadow-[0_30px_60px_-30px_rgba(28,7,13,0.65)]">
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
            className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 p-4 sm:gap-8 sm:p-9 lg:grid-cols-[auto_1fr_auto] lg:gap-10 lg:p-11"
          >
            <TiltCard
              max={12}
              className="w-fit rounded-full sm:mx-auto lg:mx-0"
            >
              <div className="relative grid h-[76px] w-[76px] place-items-center rounded-full sm:h-44 sm:w-44">
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

            <div className="min-w-0 sm:text-center lg:text-left">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e9c98a] sm:text-[11px] sm:tracking-[0.26em]">
                Celebration Desk
                <span className="hidden sm:inline">
                  <span className="px-1.5 text-ivory/40" aria-hidden="true">
                    ·
                  </span>
                  <span className="normal-case tracking-normal text-ivory/75">
                    Every yes, together.
                  </span>
                </span>
              </div>
              <h1
                id="desk-title"
                className="mt-1 font-display text-[1.65rem] font-bold leading-[1.05] text-ivory sm:mt-3 sm:text-6xl"
              >
                {names}
              </h1>
              {event.couple && event.title && event.couple !== event.title && (
                <p className="mt-2 hidden font-display text-lg italic text-ivory/75 sm:block">
                  {event.title}
                </p>
              )}
              <p className="mt-1 text-xs text-ivory/80 sm:mt-4 sm:text-sm">
                {hasDate ? formatEventDate(event.date) : "Date to be set"}
                {venue && (
                  <>
                    <span
                      className="hidden px-2 text-[#e9c98a] sm:inline"
                      aria-hidden="true"
                    >
                      ✦
                    </span>
                    <span className="block truncate sm:inline">{venue}</span>
                  </>
                )}
              </p>
              <nav
                aria-label="Quick actions"
                className="col-span-2 grid grid-cols-3 gap-2 sm:col-span-1 mt-6 sm:flex sm:flex-wrap sm:justify-center lg:justify-start"
              >
                {[
                  {
                    href: `/events/${event.id}/guests`,
                    label: "Guests",
                    short: "Guests",
                    icon: "add_circle" as const,
                    primary: true,
                  },
                  {
                    href: `/events/${event.id}/page-editor`,
                    label: "Event page",
                    short: "Page",
                    icon: "visibility" as const,
                  },
                  {
                    href: `/events/${event.id}/check-in`,
                    label: "Check-in",
                    short: "Check-in",
                    icon: "qr_code_scanner" as const,
                  },
                ].map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className={`inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[13px] font-semibold transition-transform sm:min-h-11 sm:gap-2 sm:px-4 sm:text-sm hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a] ${
                      a.primary
                        ? "bg-[#e9c98a] text-[#1c070d] shadow-[0_10px_30px_-12px_rgba(233,201,138,0.9)]"
                        : "bg-ivory/10 text-ivory ring-1 ring-ivory/20 hover:bg-ivory/15"
                    }`}
                  >
                    <Icon name={a.icon} size={17} className="hidden sm:block" />
                    <span className="sm:hidden">{a.short}</span>
                    <span className="hidden sm:inline">{a.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* One number: the countdown, in a halo that fills through the planning season */}
            <div className="mx-auto hidden lg:mx-0 lg:block">
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
                <div className="relative h-full w-full">
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
                  ) : isPast ? (
                    <div className="relative text-center">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
                        Celebrated
                      </div>
                      <div className="mt-1 font-display text-6xl font-bold leading-none tabular-nums">
                        {checkedInPeople}
                      </div>
                      <div className="mt-1 text-xs text-ivory/75">
                        came through the gate
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
                        className="font-display text-6xl font-bold leading-none text-[#e9c98a] tabular-nums sm:text-7xl"
                        aria-hidden="true"
                      />
                      <div
                        className="text-[11px] font-semibold uppercase tracking-[0.26em] text-ivory/80"
                        aria-hidden="true"
                      >
                        {days === 1 ? "day to go" : "days to go"}
                      </div>
                      <div
                        className="mt-1 text-xs tabular-nums text-ivory/70"
                        aria-hidden="true"
                      >
                        {hours}h {String(minutes).padStart(2, "0")}m
                      </div>
                    </div>
                  ) : (
                    <p className="relative max-w-36 text-center text-sm text-ivory/80">
                      Set a date to start the countdown
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-ivory/75">
                {metrics.acceptedGuests}{" "}
                {metrics.acceptedGuests === 1 ? "guest" : "guests"} coming so
                far
              </p>
            </div>
          </section>
          <section
            aria-label="Countdown and guest count"
            className="relative flex items-center justify-between gap-3 border-t border-[#e9c98a]/15 bg-black/20 px-4 py-2.5 lg:hidden"
          >
            <div className="min-w-0">
              {isToday ? (
                <p className="flex items-baseline gap-2" aria-live="polite">
                  <span className="font-display text-2xl font-bold tabular-nums text-[#e9c98a]">
                    {checkedInPeople}
                  </span>
                  <span className="text-xs text-ivory/75">
                    of {expected} at the gate · Owambe mode
                  </span>
                </p>
              ) : isPast ? (
                <p className="flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold tabular-nums text-[#e9c98a]">
                    {checkedInPeople}
                  </span>
                  <span className="text-xs text-ivory/75">
                    came through the gate
                  </span>
                </p>
              ) : hasDate ? (
                <p
                  className="flex items-baseline gap-2"
                  role="timer"
                  aria-live="off"
                  aria-label={`${days} days, ${hours} hours and ${minutes} minutes to go`}
                >
                  <NumberFlow
                    value={days}
                    respectMotionPreference
                    className="font-display text-2xl font-bold leading-none text-[#e9c98a] tabular-nums"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-ivory/80" aria-hidden="true">
                    {days === 1 ? "day" : "days"} to go ·{" "}
                    <span className="tabular-nums text-ivory/65">
                      {hours}h {String(minutes).padStart(2, "0")}m
                    </span>
                  </span>
                </p>
              ) : (
                <p className="text-xs text-ivory/75">
                  Set a date to start the countdown
                </p>
              )}
            </div>
            <p className="shrink-0 text-right text-xs text-ivory/75">
              <b className="font-display text-lg tabular-nums text-ivory">
                {metrics.acceptedGuests}
              </b>{" "}
              {metrics.acceptedGuests === 1 ? "guest" : "guests"} coming
            </p>
          </section>
        </SparkleSurface>
      </ViewTransition>
    </div>
  );
}

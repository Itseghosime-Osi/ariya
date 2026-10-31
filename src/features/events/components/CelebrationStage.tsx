"use client";

import React, { ViewTransition, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { Icon } from "@/components/ui/icon";
import { formatEventDate, getLagosDateKey } from "@/lib/format";
import type { EventWithMetrics } from "../types";
import { Countdown } from "./desk/Countdown";
import { GoldDust } from "./desk/GoldDust";
import { MonogramSeal } from "./desk/MonogramSeal";
import { SparkleSurface } from "./desk/Sparkles";
import { TiltCard } from "./desk/TiltCard";
import { celebrate } from "./desk/celebrate";

/**
 * The stage at the top of Home: your upcoming celebrations one at a time, on velvet with drifting gold
 * dust that scatters from the cursor. Swipe, use the arrows or the dots (or the arrow keys) to move
 * between them; tap anywhere for sparkles; throw confetti whenever you like. Opening one morphs it into
 * its celebration desk.
 */
export function CelebrationStage({
  items,
  now,
}: {
  items: EventWithMetrics[];
  now: number;
}) {
  const slides = items.slice(0, 6);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const drag = useRef<{ x: number; id: number } | null>(null);
  if (slides.length === 0) return null;

  const go = (next: number) => {
    const n = (next + slides.length) % slides.length;
    setDir(next > index ? 1 : -1);
    setIndex(n);
  };
  const item = slides[index];
  const { event, metrics } = item;
  const hasDate = Boolean(getLagosDateKey(event.date));
  const replied = Math.max(0, Math.min(100, Math.round(metrics.rsvpRate)));
  const venue = [event.venue, event.area]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");
  const names = event.couple || event.title;
  const many = slides.length > 1;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Your upcoming celebrations"
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <SparkleSurface
        className="overflow-hidden rounded-[32px] bg-[#1c070d] text-ivory shadow-[0_30px_60px_-30px_rgba(28,7,13,0.65)]"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, id: e.pointerId };
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!many || !d || d.id !== e.pointerId) return;
          const dx = e.clientX - d.x;
          if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <div
          className="desk-aurora transition-[filter] duration-700"
          style={{ filter: `blur(60px) hue-rotate(${index * 14}deg)` }}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>
        <div
          className="weave absolute inset-0 opacity-[0.05]"
          aria-hidden="true"
        />
        <GoldDust density={56} />
        <div className="desk-grain absolute inset-0" aria-hidden="true" />

        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#e9c98a]">
              {many
                ? `Coming up · ${index + 1} of ${slides.length}`
                : "Next celebration"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const r = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                void celebrate({
                  x: (r.left + r.width / 2) / window.innerWidth,
                  y: (r.top + r.height / 2) / window.innerHeight,
                });
              }}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-ivory/10 px-4 text-xs font-semibold text-ivory ring-1 ring-ivory/20 transition-transform hover:-translate-y-0.5 hover:bg-ivory/15 active:scale-95"
            >
              <span aria-hidden="true">🎉</span> Throw confetti
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <m.div
              key={event.id}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ type: "spring", visualDuration: 0.35, bounce: 0.1 }}
              className="mt-6 grid items-center gap-8 md:grid-cols-[auto_1fr] lg:grid-cols-[auto_1fr_auto]"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${slides.length}: ${names}`}
            >
              <TiltCard max={14} className="mx-auto w-fit rounded-full md:mx-0">
                <div className="relative grid h-32 w-32 place-items-center rounded-full sm:h-40 sm:w-40">
                  <span
                    className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(233,201,138,0.35),transparent_68%)] blur-md"
                    aria-hidden="true"
                  />
                  <MonogramSeal
                    text={names}
                    size={156}
                    className="relative h-full w-full drop-shadow-[0_16px_26px_rgba(0,0,0,0.55)]"
                  />
                  <span
                    className="foil-sheen rounded-full"
                    aria-hidden="true"
                  />
                </div>
              </TiltCard>

              <div className="min-w-0 text-center md:text-left">
                <div className="font-display text-3xl font-bold leading-[1.05] sm:text-5xl">
                  {names}
                </div>
                {event.couple && event.title !== event.couple && (
                  <div className="mt-1 font-display text-base italic text-ivory/75 sm:text-lg">
                    {event.title}
                  </div>
                )}
                <p className="mt-3 text-sm text-ivory/80">
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
                <ViewTransition
                  name={`celebration-${event.id}`}
                  share="desk-morph"
                  default="none"
                >
                  <Link
                    href={`/events/${event.id}`}
                    data-testid="featured-celebration"
                    onPointerDown={(e) => e.stopPropagation()}
                    className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#e9c98a] px-5 text-sm font-semibold text-[#1c070d] shadow-[0_10px_30px_-12px_rgba(233,201,138,0.9)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]"
                  >
                    Open the celebration desk
                    <Icon name="arrow_forward" size={16} />
                  </Link>
                </ViewTransition>
              </div>

              <div className="desk-ring mx-auto flex items-center gap-6 rounded-[28px] bg-[#1c070d]/60 p-5 backdrop-blur-sm md:col-span-2 lg:col-span-1 lg:mx-0">
                {hasDate && <Countdown dateIso={event.date} initialNow={now} />}
                <div
                  className="relative grid h-32 w-32 shrink-0 place-items-center"
                  role="img"
                  aria-label={`${replied}% of guests have replied`}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="absolute inset-0 -rotate-90"
                    aria-hidden="true"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(244,239,230,0.12)"
                      strokeWidth="8"
                    />
                    <m.circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#e9c98a"
                      strokeWidth="8"
                      strokeLinecap="round"
                      pathLength={1}
                      initial={{ strokeDasharray: "0 1" }}
                      animate={{
                        strokeDasharray: `${Math.max(0.001, replied / 100)} 1`,
                      }}
                      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                  <div className="text-center leading-none" aria-hidden="true">
                    <div className="font-display text-xl font-bold tabular-nums">
                      {replied}%
                    </div>
                    <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-ivory/75">
                      replied
                    </div>
                  </div>
                </div>
              </div>
            </m.div>
          </AnimatePresence>

          {many && (
            <div className="mt-8 flex items-center justify-center gap-3 md:justify-start">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous celebration"
                className="grid h-10 w-10 place-items-center rounded-full bg-ivory/10 text-ivory ring-1 ring-ivory/20 hover:bg-ivory/20"
              >
                <Icon name="chevron_left" size={18} />
              </button>
              <div className="flex items-center">
                {slides.map((s, i) => (
                  <button
                    key={s.event.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show ${s.event.couple || s.event.title}`}
                    aria-current={i === index ? "true" : undefined}
                    className="grid h-6 min-w-6 place-items-center"
                  >
                    <span
                      className={`block h-1.5 rounded-full transition-all duration-300 ${
                        i === index
                          ? "w-7 bg-[#e9c98a]"
                          : "w-1.5 bg-ivory/40 hover:bg-ivory/70"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next celebration"
                className="grid h-10 w-10 place-items-center rounded-full bg-ivory/10 text-ivory ring-1 ring-ivory/20 hover:bg-ivory/20"
              >
                <Icon name="chevron_right" size={18} />
              </button>
            </div>
          )}
        </div>
      </SparkleSurface>
    </section>
  );
}

"use client";

import React, { ViewTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatEventDate } from "@/lib/format";
import type { Event, EventMetrics } from "../../types";
import { Countdown } from "./Countdown";

interface DeskHeroProps {
  event: Event;
  metrics: EventMetrics;
  initialNow: number;
  checkedInPeople: number;
}

/** The desk's hero: the couple in Bodoni over a slow aurora and the Àríyá weave, with the countdown in a gold ring. */
export function DeskHero({
  event,
  metrics,
  initialNow,
  checkedInPeople,
}: DeskHeroProps) {
  const isToday =
    metrics.daysAway === 0 &&
    Boolean(event.date) &&
    new Date(event.date).getTime() > initialNow - 86_400_000;
  const venue = [event.venue, event.area]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");
  const expected = Math.max(metrics.acceptedGuests, 0);

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <ViewTransition
      name={`celebration-${event.id}`}
      share="desk-morph"
      default="none"
    >
      <section
        aria-labelledby="desk-title"
        onPointerMove={onMove}
        className="desk-spot relative overflow-hidden rounded-[32px] bg-[#1c070d] text-ivory shadow-[0_30px_60px_-30px_rgba(28,7,13,0.65)]"
      >
        <div className="desk-aurora" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div
          className="weave absolute inset-0 opacity-[0.06]"
          aria-hidden="true"
        />
        <div className="desk-grain absolute inset-0" aria-hidden="true" />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:p-10">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em]">
              <span className="text-[#e9c98a]">Celebration Desk</span>
              <span className="text-ivory/40" aria-hidden="true">
                ·
              </span>
              <span className="text-ivory/75 normal-case tracking-normal text-xs">
                Every yes, together.
              </span>
            </div>

            <div>
              <h1
                id="desk-title"
                className="font-display text-4xl font-bold leading-[1.05] text-ivory sm:text-5xl lg:text-6xl"
              >
                {event.couple || event.title}
              </h1>
              {event.couple && event.title && event.couple !== event.title && (
                <p className="mt-2 font-display text-lg italic text-ivory/80 sm:text-xl">
                  {event.title}
                </p>
              )}
            </div>

            <ul className="flex flex-wrap gap-2 text-xs" aria-label="Details">
              <li className="inline-flex items-center gap-1.5 rounded-full bg-ivory/10 px-3 py-1.5 text-ivory/90 ring-1 ring-ivory/15">
                <Icon name="calendar" size={14} className="text-[#e9c98a]" />
                {event.date ? formatEventDate(event.date) : "Date to be set"}
              </li>
              {venue && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-ivory/10 px-3 py-1.5 text-ivory/90 ring-1 ring-ivory/15">
                  <Icon name="location" size={14} className="text-[#e9c98a]" />
                  {venue}
                </li>
              )}
              {event.dress_code && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-ivory/10 px-3 py-1.5 text-ivory/90 ring-1 ring-ivory/15">
                  <Icon name="styler" size={14} className="text-[#e9c98a]" />
                  {event.dress_code}
                </li>
              )}
            </ul>

            <div className="flex flex-wrap gap-2 pt-1">
              <Link
                href={`/events/${event.id}/guests`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#e9c98a] px-5 text-sm font-semibold text-[#1c070d] shadow-[0_10px_30px_-10px_rgba(233,201,138,0.8)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]"
              >
                <Icon name="add_circle" size={18} />
                Guests &amp; RSVPs
              </Link>
              <Link
                href={`/events/${event.id}/page-editor`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ivory/10 px-5 text-sm font-semibold text-ivory ring-1 ring-ivory/20 transition-colors hover:bg-ivory/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]"
              >
                <Icon name="visibility" size={18} />
                Event page
              </Link>
              <Link
                href={`/events/${event.id}/check-in`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ivory/10 px-5 text-sm font-semibold text-ivory ring-1 ring-ivory/20 transition-colors hover:bg-ivory/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e9c98a]"
              >
                <Icon name="qr_code_scanner" size={18} />
                Check-in desk
              </Link>
            </div>
          </div>

          {/* The countdown, or on the day, the gate */}
          <div className="desk-ring rounded-[28px] bg-[#1c070d]/60 p-6 backdrop-blur-sm sm:p-7">
            {isToday ? (
              <div aria-live="polite">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="desk-here absolute inline-flex h-full w-full rounded-full bg-[#e9c98a]" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#e9c98a]" />
                  </span>
                  Owambe mode · gates open
                </div>
                <div className="mt-3 font-display text-6xl font-bold leading-none text-ivory tabular-nums">
                  {checkedInPeople}
                  <span className="text-2xl text-ivory/60"> / {expected}</span>
                </div>
                <p className="mt-2 text-sm text-ivory/75">
                  guests through the gate so far
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-ivory/10">
                  <div
                    className="weave-fill h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${expected > 0 ? Math.min(100, (checkedInPeople / expected) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : event.date ? (
              <>
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#e9c98a]">
                  Until the big day
                </div>
                <Countdown dateIso={event.date} initialNow={initialNow} />
                <p className="mt-4 text-sm text-ivory/75">
                  {metrics.acceptedGuests}{" "}
                  {metrics.acceptedGuests === 1 ? "guest is" : "guests are"}{" "}
                  coming so far
                  {metrics.awaitingParties > 0 && (
                    <>
                      {" "}
                      · {metrics.awaitingParties}{" "}
                      {metrics.awaitingParties === 1 ? "party" : "parties"} yet
                      to reply
                    </>
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-ivory/80">
                Set a date in Event page to start the countdown.
              </p>
            )}
          </div>
        </div>
      </section>
    </ViewTransition>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatEventDate } from "@/lib/format";
import type { Event } from "../../types";
import { MonogramSeal } from "./MonogramSeal";
import { TiltCard } from "./TiltCard";

/**
 * The invitation as your guests will hold it: ivory card, a hairline of gold, the wax seal, and the
 * couple's own words. It tilts toward the pointer and catches the light like foil.
 */
export function InvitationPreview({ event }: { event: Event }) {
  const names = event.couple || event.title;
  const venue = [event.venue, event.area]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");
  return (
    <section
      aria-labelledby="invitation-title"
      className="bento-card flex h-full flex-col p-6 sm:p-7"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            Your invitation
          </div>
          <h2
            id="invitation-title"
            className="mt-1 font-display text-2xl font-bold text-night"
          >
            As your guests see it
          </h2>
        </div>
      </div>

      <div className="mt-5 flex flex-1 items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_30%,#3a0f1a,#1c070d_70%)] p-6 sm:p-8">
        <TiltCard max={9} className="w-full max-w-[340px]">
          <div
            data-testid="invitation-tile"
            className="desk-paper relative aspect-[5/7] w-full overflow-hidden rounded-[20px] px-7 py-8 text-center"
          >
            <span className="foil-sheen" aria-hidden="true" />
            <div
              className="weave absolute inset-x-0 top-0 h-10 opacity-[0.12]"
              aria-hidden="true"
            />
            <div className="relative flex h-full flex-col items-center">
              <MonogramSeal text={names} size={58} className="drop-shadow-md" />
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7a5612]">
                {event.invitation_subheadline || "Together with their families"}
              </p>
              <p className="mt-3 font-display text-[1.65rem] font-bold leading-tight text-[#6e1426]">
                {names}
              </p>
              <p className="mt-3 max-w-[15rem] text-xs leading-relaxed text-[#4a3a30]">
                {event.invitation_message ||
                  "request the pleasure of your company as they celebrate their union"}
              </p>
              <div
                className="my-4 flex w-full items-center gap-3"
                aria-hidden="true"
              >
                <span className="h-px flex-1 bg-[#b8864b]/50" />
                <span className="text-[#b8864b]">✦</span>
                <span className="h-px flex-1 bg-[#b8864b]/50" />
              </div>
              <p className="text-sm font-semibold text-[#2a2118]">
                {event.date
                  ? formatEventDate(event.date)
                  : "Date to be announced"}
              </p>
              {venue && <p className="mt-1 text-xs text-[#4a3a30]">{venue}</p>}
              {event.dress_code && (
                <p className="mt-2 text-[11px] italic text-[#5a474e]">
                  Dress code: {event.dress_code}
                </p>
              )}
              <p className="mt-auto pt-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a5612]">
                {event.rsvp_by
                  ? `Kindly reply by ${formatEventDate(event.rsvp_by).split(",")[0]}`
                  : "Kindly reply"}
              </p>
            </div>
          </div>
        </TiltCard>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-label-2">
          Each guest gets their own link and their own seat.
        </p>
        <Link
          href={`/events/${event.id}/invitations`}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-burgundy px-4 text-sm font-semibold text-white hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Icon name="stylus" size={16} />
          Design it
        </Link>
      </div>
    </section>
  );
}

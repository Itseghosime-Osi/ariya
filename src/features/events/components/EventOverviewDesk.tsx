"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { EventWithMetrics, RecentGuestResponse } from "../types";

interface EventOverviewDeskProps {
  data: EventWithMetrics;
  recentResponses: RecentGuestResponse[];
}

export function EventOverviewDesk({
  data,
  recentResponses,
}: EventOverviewDeskProps) {
  const { event, metrics } = data;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const confirmedPct =
    metrics.totalAttendees > 0
      ? Math.round((metrics.acceptedGuests / metrics.totalAttendees) * 100)
      : 71;
  const awaitingPct =
    metrics.totalAttendees > 0
      ? Math.round((metrics.awaitingGuests / metrics.totalAttendees) * 100)
      : 20;
  const declinedPct = Math.max(0, 100 - confirmedPct - awaitingPct);

  return (
    <div className="space-y-space-xl pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-night text-gold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-gold/30">
          <Icon name="check_circle" className="text-gold text-lg" />
          <span className="font-body-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Editorial Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-xs">
        <div className="space-y-space-xs">
          <div className="flex items-center gap-space-xs">
            <span className="font-label-sm uppercase tracking-widest text-secondary font-bold">
              Celebration Desk
            </span>
            <span className="text-mist">•</span>
            <span className="font-label-sm text-on-surface-variant font-medium">
              {event.couple}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-space-md gap-y-space-xs">
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
              Every yes, together.
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm tracking-widest uppercase shadow-sm font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              {metrics.daysAway} days to celebration
            </span>
          </div>
        </div>

        {/* Quick Action Desk Bar */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            onClick={() => showToast("Announcement composer drafted.")}
            className="px-space-md py-2.5 rounded-xl bg-surface-container text-primary font-label-md flex items-center gap-2 hover:bg-surface-container-high transition-colors shadow-sm min-h-[44px]"
          >
            <Icon name="drafts" className="text-lg" />
            <span>Draft Announcement</span>
          </button>
          <button
            type="button"
            onClick={() => showToast("Guest registration opened.")}
            className="px-space-md py-2.5 rounded-xl bg-gold text-night font-label-md flex items-center gap-2 hover:bg-secondary-fixed-dim transition-all shadow-[0_4px_16px_-2px_rgba(233,201,138,0.45)] font-semibold min-h-[44px]"
          >
            <Icon name="add_circle" className="text-lg" />
            <span>Register Guest</span>
          </button>
        </div>
      </header>

      {/* Asymmetric Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-stretch">
        {/* 60% Left Area: RSVP Health & Seating Equilibrium */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-[24px] p-margin lg:p-margin-lg shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] flex flex-col justify-between space-y-space-lg relative overflow-hidden border border-surface-container-high/40">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-secondary-fixed/20 blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm uppercase tracking-widest text-on-surface-variant font-bold">
                Guest Responses
              </span>
              <span className="inline-flex items-center gap-1 text-success font-label-sm font-semibold">
                <Icon name="trending_up" className="text-base" />
                +14 this week
              </span>
            </div>

            <div className="flex items-baseline gap-space-sm flex-wrap">
              <span className="font-display text-display text-primary tracking-tight leading-none">
                {metrics.acceptedGuests}
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface">
                guests confirmed
              </span>
            </div>
            <p className="font-body-md text-on-surface-variant mt-1.5">
              {metrics.acceptedParties} accepted parties ·{" "}
              {metrics.acceptedGuests} of {metrics.totalAttendees} people
            </p>
          </div>

          {/* Segmented RSVP Horizon Bar */}
          <div className="space-y-space-xs">
            <div className="h-3.5 w-full rounded-full bg-surface-container flex overflow-hidden p-0.5 gap-1">
              <div
                className="h-full bg-wine rounded-full transition-all duration-500"
                style={{ width: `${confirmedPct}%` }}
                title={`${confirmedPct}% Confirmed`}
              />
              <div
                className="h-full bg-gold rounded-full transition-all duration-500"
                style={{ width: `${awaitingPct}%` }}
                title={`${awaitingPct}% Awaiting`}
              />
              <div
                className="h-full bg-mist rounded-full transition-all duration-500"
                style={{ width: `${declinedPct}%` }}
                title={`${declinedPct}% Declined`}
              />
            </div>

            <div className="flex items-center justify-between font-label-sm text-on-surface-variant pt-1 text-[12px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                <strong className="text-on-surface font-semibold">
                  {metrics.acceptedGuests}
                </strong>{" "}
                Confirmed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gold inline-block" />
                <strong className="text-on-surface font-semibold">
                  {metrics.awaitingGuests}
                </strong>{" "}
                Awaiting
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-mist inline-block" />
                <strong className="text-on-surface font-semibold">
                  {metrics.declinedGuests}
                </strong>{" "}
                Declined
              </span>
            </div>
          </div>

          {/* Inline Protocol Stat Triad */}
          <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
            <div className="bg-surface-container-low rounded-2xl p-space-md transition-all hover:bg-surface-container">
              <div className="flex items-center justify-between">
                <span className="font-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                  Seated
                </span>
                <Icon name="chair" className="text-wine text-lg" />
              </div>
              <div className="font-headline-sm text-headline-sm text-primary mt-1">
                {metrics.seatedGuests}
              </div>
              <span className="font-body-sm text-on-surface-variant text-[12px]">
                of {metrics.acceptedGuests} people
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-space-md transition-all hover:bg-surface-container">
              <div className="flex items-center justify-between">
                <span className="font-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                  Unassigned
                </span>
                <Icon name="pending" className="text-secondary text-lg" />
              </div>
              <div className="font-headline-sm text-headline-sm text-secondary mt-1">
                {metrics.unassignedGuests}
              </div>
              <span className="font-body-sm text-on-surface-variant text-[12px]">
                Awaiting placement
              </span>
            </div>

            <div className="bg-surface-container-low rounded-2xl p-space-md transition-all hover:bg-surface-container">
              <div className="flex items-center justify-between">
                <span className="font-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
                  Parties
                </span>
                <Icon name="diversity_3" className="text-primary text-lg" />
              </div>
              <div className="font-headline-sm text-headline-sm text-night mt-1">
                {metrics.acceptedParties}
              </div>
              <span className="font-body-sm text-on-surface-variant text-[12px]">
                Accepted invites
              </span>
            </div>
          </div>
        </div>

        {/* 40% Right Area: Curated Stationery Presentation */}
        <div className="lg:col-span-5 bg-paper rounded-[24px] p-space-lg flex flex-col justify-between shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] relative border border-surface-container-high/40">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] w-full shadow-md bg-night flex flex-col justify-between p-6">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-wine/50 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-gold/20 blur-2xl pointer-events-none" />

            <div className="relative z-10 self-start px-3 py-1 rounded-full bg-night/80 backdrop-blur-md text-gold font-label-sm tracking-wider uppercase flex items-center gap-1.5 font-bold">
              <Icon name="stylus" className="text-sm" />
              <span>YOUR INVITATION</span>
            </div>

            <div className="relative z-10 my-auto flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-wine border-2 border-gold flex items-center justify-center shadow-lg">
                <Icon name="verified" className="text-gold text-2xl" />
              </div>
              <span className="font-headline-sm text-headline-sm text-ivory mt-2 tracking-wide font-serif">
                {event.couple}
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-between text-mist text-[12px]">
              <span>Solemnization &amp; Reception</span>
              <span className="text-gold font-semibold">Wax Seal Verified</span>
            </div>
          </div>

          <div className="pt-space-md flex items-center justify-between">
            <div>
              <div className="font-title-md text-title-md text-paper-ink font-semibold">
                A personal invitation
              </div>
              <p className="font-body-sm text-on-surface-variant">
                Burgundy, ivory and a place for every guest
              </p>
            </div>
            <Link
              href={`/events/${event.id}/guests`}
              className="w-10 h-10 rounded-xl bg-surface-container-highest text-wine hover:bg-gold hover:text-night transition-colors flex items-center justify-center min-h-[44px] min-w-[44px]"
              title="Inspect Proof Details"
            >
              <Icon name="arrow_forward" className="text-lg" />
            </Link>
          </div>
        </div>
      </section>

      {/* Lower Section: RSVP Pace & Curated Priority Deck */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg items-start">
        {/* Left Column (Wide, 7 Cols): Confirmation Momentum & Activity */}
        <div className="lg:col-span-7 space-y-gutter-lg">
          {/* RSVP Trajectory Chart Card */}
          <div className="bg-surface-container-lowest rounded-[24px] p-margin shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] space-y-space-md border border-surface-container-high/40">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-headline-sm text-headline-sm text-primary">
                  RSVP progress
                </h2>
                <p className="font-body-sm text-on-surface-variant">
                  Accepted people over time · {metrics.totalAttendees} invited
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container font-label-sm text-on-surface-variant font-medium">
                  <span className="w-2 h-2 rounded-full bg-wine" />
                  {metrics.acceptedGuests} accepted
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container font-label-sm text-on-surface-variant font-medium">
                  <span className="w-2 h-0.5 bg-mist" />
                  Momentum
                </span>
              </div>
            </div>

            {/* Trajectory SVG Vector Curve */}
            <div className="w-full pt-space-xs">
              <svg
                className="w-full h-44 text-primary overflow-visible"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 540 180"
              >
                <defs>
                  <linearGradient
                    id="curveGradient"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#6e1426" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#6e1426" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line
                  stroke="#dcc0c1"
                  strokeDasharray="3 4"
                  strokeWidth="1"
                  x1="20"
                  x2="520"
                  y1="20"
                  y2="20"
                />
                <text
                  className="select-none"
                  fill="#897172"
                  fontFamily="Plus Jakarta Sans"
                  fontSize="10"
                  x="450"
                  y="16"
                >
                  {metrics.totalAttendees} Invited
                </text>
                <path
                  d="M 25 155 C 80 150, 120 142, 170 125 C 220 108, 270 95, 320 74 C 345 64, 355 60, 370 60 L 370 165 L 25 165 Z"
                  fill="url(#curveGradient)"
                  stroke="none"
                />
                <path
                  d="M 25 155 C 80 150, 120 142, 170 125 C 220 108, 270 95, 320 74 C 345 64, 355 60, 370 60"
                  fill="none"
                  stroke="#6e1426"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
                <circle
                  cx="25"
                  cy="155"
                  fill="#f4efe6"
                  r="3.5"
                  stroke="#6e1426"
                  strokeWidth="2.5"
                />
                <circle
                  cx="170"
                  cy="125"
                  fill="#f4efe6"
                  r="3.5"
                  stroke="#6e1426"
                  strokeWidth="2.5"
                />
                <circle
                  cx="270"
                  cy="95"
                  fill="#f4efe6"
                  r="3.5"
                  stroke="#6e1426"
                  strokeWidth="2.5"
                />
                <circle
                  cx="370"
                  cy="60"
                  fill="#e9c98a"
                  r="5"
                  stroke="#6e1426"
                  strokeWidth="3"
                />
                <text
                  className="select-none font-semibold"
                  fill="#6e1426"
                  fontFamily="Plus Jakarta Sans"
                  fontSize="11"
                  x="380"
                  y="64"
                >
                  {metrics.acceptedGuests} accepted
                </text>
              </svg>

              <div className="flex items-center justify-between text-on-surface-variant font-label-sm border-t-0 px-1 pt-1 text-[11px]">
                <span>
                  01 Oct <br />
                  <strong className="text-on-surface font-semibold">
                    Dispatch
                  </strong>
                </span>
                <span>
                  18 Oct <br />
                  <strong className="text-on-surface font-semibold">
                    88 yes
                  </strong>
                </span>
                <span>
                  05 Nov <br />
                  <strong className="text-on-surface font-semibold">
                    194 yes
                  </strong>
                </span>
                <span>
                  Today <br />
                  <strong className="text-primary font-bold">
                    {metrics.acceptedGuests} yes
                  </strong>
                </span>
                <span>
                  Big Day <br />
                  <strong className="text-on-surface-variant font-medium">
                    Reception
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Recent Responses Activity Feed */}
          <div className="bg-surface-container-lowest rounded-[24px] p-margin shadow-[0_2px_8px_-2px_rgba(28,7,13,0.05),0_1px_3px_0_rgba(28,7,13,0.04)] space-y-space-md border border-surface-container-high/40">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-night">
                Recent Responses
              </h3>
              <Link
                className="font-label-sm text-primary font-semibold hover:underline"
                href={`/events/${event.id}/guests`}
              >
                View Guestbook ({metrics.totalAttendees})
              </Link>
            </div>

            <div className="space-y-space-xs">
              {recentResponses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-space-sm">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-title-md font-bold">
                      {item.initials}
                    </div>
                    <div>
                      <div className="font-title-md text-on-surface flex items-center gap-2">
                        <span>{item.guestName}</span>
                        {item.groupName && (
                          <span className="px-2 py-0.5 rounded-full bg-primary text-ivory font-label-sm text-[10px]">
                            {item.groupName}
                          </span>
                        )}
                      </div>
                      <span className="font-body-sm text-on-surface-variant text-[12px]">
                        {item.side} · Party of {item.attendingCount}
                        {item.tableName
                          ? ` · ${item.tableName}`
                          : " · Unassigned"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-sm">
                    <span
                      className={`px-3 py-1 rounded-full font-label-sm font-semibold flex items-center gap-1 ${
                        item.status === "accepted"
                          ? "bg-success-surface text-success"
                          : "bg-secondary-container text-on-secondary-container"
                      }`}
                    >
                      <Icon
                        name={item.status === "accepted" ? "check" : "schedule"}
                        className="text-sm"
                      />
                      <span>
                        {item.status === "accepted" ? "Confirmed" : "Awaiting"}
                      </span>
                    </span>
                    <span className="font-body-sm text-mist text-[11px]">
                      {item.timeAgo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): "Next to care for" Curated Priority Deck */}
        <div className="lg:col-span-5 bg-wine text-ivory rounded-[24px] p-margin lg:p-margin-lg shadow-[0_12px_32px_-6px_rgba(28,7,13,0.18)] space-y-space-lg relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-gold/15 blur-3xl pointer-events-none" />

          <div className="space-y-space-xs relative">
            <div className="flex items-center justify-between">
              <span className="font-label-sm uppercase tracking-widest text-gold font-bold">
                NEXT STEPS
              </span>
              <span className="px-2 py-0.5 rounded-full bg-night/50 text-gold font-label-sm font-semibold">
                3 Outstanding
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-ivory">
              Next to care for
            </h2>
            <p className="font-body-sm text-mist">
              A few things to take care of this week
            </p>
          </div>

          <div className="space-y-space-md relative">
            {/* Task 1: Follow-ups */}
            <div className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors">
              <div className="flex items-start justify-between gap-space-xs">
                <div className="flex items-start gap-space-sm">
                  <Icon
                    name="outgoing_mail"
                    className="text-gold mt-0.5 text-xl"
                  />
                  <div>
                    <h4 className="font-title-md text-ivory font-semibold">
                      {metrics.awaitingParties} parties awaiting replies
                    </h4>
                    <p className="font-body-sm text-ivory/70">
                      {metrics.awaitingGuests} people total • Send a friendly
                      reminder
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-label-sm text-gold">Cutoff: 30 Nov</span>
                <button
                  type="button"
                  onClick={() => showToast("Reminder queue opened.")}
                  className="px-space-md py-1.5 rounded-xl bg-gold text-night font-label-sm hover:bg-secondary-fixed transition-all font-semibold shadow-sm min-h-[36px]"
                >
                  Review Reminders
                </button>
              </div>
            </div>

            {/* Task 2: Seating Placements */}
            <div className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors">
              <div className="flex items-start justify-between gap-space-xs">
                <div className="flex items-start gap-space-sm">
                  <Icon
                    name="table_chart_view"
                    className="text-gold mt-0.5 text-xl"
                  />
                  <div>
                    <h4 className="font-title-md text-ivory font-semibold">
                      {metrics.unassignedGuests} unassigned guests
                    </h4>
                    <p className="font-body-sm text-ivory/70">
                      Confirmed yes • Tables 1 through 8 have open banquet seats
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-label-sm text-gold">8 tables open</span>
                <button
                  type="button"
                  onClick={() => showToast("Navigating to seating chart...")}
                  className="px-space-md py-1.5 rounded-xl bg-ivory text-wine font-label-sm hover:bg-paper transition-all font-semibold shadow-sm min-h-[36px]"
                >
                  Assign Seats
                </button>
              </div>
            </div>

            {/* Task 3: Vendor Confirmations */}
            <div className="bg-night/40 backdrop-blur-sm rounded-2xl p-space-md space-y-space-sm hover:bg-night/50 transition-colors">
              <div className="flex items-start justify-between gap-space-xs">
                <div className="flex items-start gap-space-sm">
                  <Icon
                    name="restaurant_menu"
                    className="text-gold mt-0.5 text-xl"
                  />
                  <div>
                    <h4 className="font-title-md text-ivory font-semibold">
                      2 vendor sign-offs this week
                    </h4>
                    <p className="font-body-sm text-ivory/70">
                      Catering tasting menu sign-off &amp; Floral arch mockup
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-label-sm text-gold">Due Friday 2pm</span>
                <button
                  type="button"
                  onClick={() => showToast("Opening vendor schedule...")}
                  className="px-space-md py-1.5 rounded-xl bg-night text-gold font-label-sm hover:bg-night/80 transition-all font-semibold min-h-[36px]"
                >
                  Open Schedule
                </button>
              </div>
            </div>
          </div>

          {/* Protocol Note */}
          <div className="p-space-md rounded-2xl bg-tertiary-container/80 text-on-tertiary-container text-body-sm flex items-center gap-space-sm border border-gold/20">
            <Icon name="info" className="text-gold text-lg shrink-0" />
            <span>
              Aṣọ-Ẹbí distribution batches are ready for guest collection.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

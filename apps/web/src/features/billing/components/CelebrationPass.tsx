"use client";

import React, { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { formatKobo } from "@/lib/format";
import { TiltCard } from "@/features/events/components/desk/TiltCard";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";
import { PassStamp } from "./PassStamp";
import { initializePaymentAction } from "../actions";

interface CelebrationPassProps {
  eventId: string;
  eventTitle: string;
  isPaid: boolean;
  paidAt: string | null;
  canManageBilling: boolean;
  passAmountKobo: number;
}

const INCLUDED = [
  {
    full: "Unlimited guest invitations and delivery",
    short: "Unlimited invitations",
  },
  { full: "Automated WhatsApp and email reminders", short: "Auto reminders" },
  {
    full: "Unlimited tables and seating re-allocations",
    short: "Unlimited seating",
  },
  {
    full: "Team collaboration and reception check-in",
    short: "Team & check-in",
  },
];

/**
 * The pass as a piece of ticket stock: the couple's seal, what the pass unlocks, a barcode along the
 * foot, and a tear-off stub carrying the price, the house signature and the stamp pressed over it.
 */
export function CelebrationPass({
  eventId,
  eventTitle,
  isPaid,
  paidAt,
  canManageBilling,
  passAmountKobo,
}: CelebrationPassProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const serial = eventId.replace(/-/g, "").slice(-7).toUpperCase();
  const stampDate = paidAt
    ? new Date(paidAt)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .toUpperCase()
    : "PAID IN FULL";

  const handleCheckout = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await initializePaymentAction(eventId);
      if (res?.error) setErrorMsg(res.error);
    });
  };

  return (
    <TiltCard max={5} className="rounded-3xl">
      <section
        aria-labelledby="pass-title"
        className="desk-paper relative overflow-hidden rounded-3xl text-[var(--paper-ink)]"
      >
        <span className="foil-sheen" aria-hidden="true" />
        <span
          className="ticket-guilloche absolute inset-0"
          aria-hidden="true"
        />

        {isPaid && (
          <PassStamp
            dateLabel={stampDate}
            className="pointer-events-none absolute right-2 top-2 h-[92px] w-[92px] rotate-[14deg] text-burgundy mix-blend-multiply sm:hidden"
          />
        )}

        <div className="relative grid gap-4 p-4 sm:gap-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:gap-10">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex min-w-0 items-center gap-3 ${isPaid ? "pr-24 sm:pr-0" : ""}`}
              >
                <MonogramSeal text={eventTitle} size={40} />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-gold-ink">
                    Celebration pass
                  </div>
                  <div className="font-display text-sm font-semibold">
                    {eventTitle}
                  </div>
                </div>
              </div>

              <div className="hidden text-right sm:block">
                <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold-ink/70">
                  Ticket
                </div>
                <div className="mt-0.5 font-mono text-[11px] tracking-[0.1em] text-[var(--label-2)]">
                  {serial}
                </div>
              </div>
            </div>

            <h2
              id="pass-title"
              className="mt-3 font-display text-2xl font-bold leading-tight sm:mt-5 sm:text-4xl"
            >
              {isPaid ? "Unlocked for the day" : "On a free trial"}
            </h2>
            <p className="mt-1.5 max-w-md text-[13px] leading-snug text-[var(--label-2)] sm:mt-2 sm:text-sm sm:leading-relaxed">
              {isPaid ? (
                <>
                  Paid in full
                  {paidAt
                    ? ` on ${new Date(paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                    : ""}
                  .
                  <span className="hidden sm:inline">
                    {" "}
                    Every invitation, reminder and seat for this celebration is
                    open.
                  </span>
                </>
              ) : (
                <>
                  The trial covers 20 invitations and reminders.
                  <span className="hidden sm:inline">
                    {" "}
                    Unlock the pass once to remove every limit for this
                    celebration.
                  </span>
                  <span className="sm:hidden">
                    {" "}
                    Unlock once to remove the limits.
                  </span>
                </>
              )}
            </p>

            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:mt-5 sm:gap-x-6 sm:gap-y-2">
              {INCLUDED.map((item) => (
                <li
                  key={item.full}
                  className="flex items-start gap-1.5 text-[12px] leading-snug sm:gap-2 sm:text-[13px]"
                >
                  <Icon
                    name={isPaid ? "check_circle" : "check"}
                    size={14}
                    className="mt-0.5 shrink-0 text-rsvp-accepted"
                  />
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.full}</span>
                </li>
              ))}
            </ul>

            <div
              className="mt-6 hidden items-end justify-between gap-4 border-t border-dotted border-[rgba(122,86,18,0.4)] pt-3 sm:flex"
              aria-hidden="true"
            >
              <div className="ticket-barcode h-5 w-full max-w-[220px] opacity-70" />
              <div className="font-mono text-[9px] tracking-[0.3em] text-[var(--label-2)]">
                {serial}
              </div>
            </div>
          </div>

          <div
            className="relative flex shrink-0 flex-row items-center justify-between gap-4 border-t border-dotted border-[rgba(122,86,18,0.45)] pt-3 sm:pt-5 lg:w-72 lg:flex-col lg:items-stretch lg:gap-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
            aria-label="Pass stub"
          >
            <div className="relative">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
                {isPaid ? (
                  <>
                    Admit one
                    <span className="hidden sm:inline"> · Perpetual</span>
                  </>
                ) : (
                  "One-time"
                )}
              </div>
              <div className="mt-0.5 font-display text-2xl font-bold tabular-nums sm:mt-1 sm:text-3xl">
                {formatKobo(passAmountKobo)}
              </div>
              {!isPaid && (
                <div className="mt-0.5 hidden text-xs text-[var(--label-2)] sm:block">
                  Once, for this celebration
                </div>
              )}

              {isPaid && (
                <div className="relative mb-8 mt-9 hidden w-fit sm:block lg:mb-0">
                  <div className="border-b border-dotted border-[rgba(122,86,18,0.5)] pb-1 pr-6">
                    <span className="font-signature text-[50px] leading-none text-[var(--paper-ink)]/85">
                      Itseghosime
                    </span>
                  </div>

                  <PassStamp
                    dateLabel={stampDate}
                    className="pointer-events-none absolute -bottom-4 right-10 h-[136px] w-[136px] -rotate-[35deg] text-burgundy mix-blend-multiply"
                  />
                </div>
              )}
            </div>

            {isPaid ? (
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-ink/70">
                No further charge
              </div>
            ) : canManageBilling ? (
              <button
                type="button"
                disabled={isPending}
                onClick={handleCheckout}
                className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-wine px-5 text-sm font-semibold text-ivory shadow-md transition-colors hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine disabled:opacity-60 sm:flex-none lg:flex-auto"
              >
                {isPending ? (
                  <>
                    <Icon name="refresh" size={16} className="animate-spin" />
                    Opening Paystack…
                  </>
                ) : (
                  <>
                    <Icon name="credit_card" size={16} />
                    Unlock with Paystack
                  </>
                )}
              </button>
            ) : (
              <p className="flex max-w-[55%] items-start gap-1.5 text-xs text-[var(--label-2)] lg:max-w-none">
                <Icon name="lock" size={13} className="mt-0.5 shrink-0" />
                Only owners and planners can pay for this celebration.
              </p>
            )}
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="relative mx-4 mb-4 flex items-center gap-2 rounded-xl border border-error/30 bg-error-container px-3 py-2 text-xs text-error sm:mx-8 sm:mb-8"
          >
            <Icon name="error" size={14} />
            {errorMsg}
          </div>
        )}
      </section>
    </TiltCard>
  );
}

"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, m } from "motion/react";
import { Check, Mail, RefreshCw, TriangleAlert } from "lucide-react";
import { ScreenHeader } from "@/components/layout/screen-header";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import { ReminderFilterSelector } from "@/features/reminders/components/ReminderFilterSelector";
import { ReminderMessagePreview } from "@/features/reminders/components/ReminderMessagePreview";
import { ReminderRecipientsTable } from "@/features/reminders/components/ReminderRecipientsTable";
import { InvitationQuotaBanner } from "@/features/invitations/components/InvitationQuotaBanner";
import { sendBatchReminderAction } from "@/features/reminders/actions";
import type {
  ReminderDeskData,
  ReminderFilter,
} from "@/features/reminders/types";

const eyebrow =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink";
const field =
  "mt-1.5 w-full rounded-xl border border-outline-variant/70 bg-ivory px-3 py-2.5 text-base text-on-surface sm:text-sm transition-colors placeholder:text-on-surface-variant focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30";
const longDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  timeZone: "Africa/Lagos",
});

interface RemindersClientProps {
  eventId: string;
  data: ReminderDeskData;
}

export function RemindersClient({ eventId, data }: RemindersClientProps) {
  const [filter, setFilter] = useState<ReminderFilter>("awaiting");
  const [subject, setSubject] = useState(
    `Gentle Reminder: Celebration of ${data.coupleName}`
  );
  const [customMessage, setCustomMessage] = useState(
    "Please let us know if you will be joining us so we can finalize table seating!"
  );
  const [showPreview, setShowPreview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [resultMsg, setResultMsg] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  const displayedRecipients = data.recipients.filter((r) => {
    if (filter === "awaiting") return r.rsvpStatus === "pending";
    if (filter === "no_email") return !r.email;
    return true;
  });

  const noEmailCount = data.recipients.filter((r) => !r.email).length;

  const handleToggleSelect = (guestId: string) => {
    setSelectedIds((prev) =>
      prev.includes(guestId)
        ? prev.filter((id) => id !== guestId)
        : [...prev, guestId]
    );
  };

  const handleSelectAll = () => {
    const eligibleIds = displayedRecipients
      .filter((r) => r.isEligibleForEmail)
      .map((r) => r.guestId);
    setSelectedIds((prev) =>
      prev.length === eligibleIds.length ? [] : eligibleIds
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResultMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("filter", filter);
      formData.set("subject", subject);
      formData.set("customMessage", customMessage);
      selectedIds.forEach((id) => formData.append("guestIds", id));

      const res = await sendBatchReminderAction(eventId, formData);
      if (res.error) {
        setResultMsg({ text: res.error, error: true });
      } else {
        setResultMsg({
          text: `Batch dispatched: ${res.sentCount} sent, ${res.skippedCount} skipped (daily cap or missing email).`,
        });
      }
    });
  };

  const awaiting = data.recipients.filter((r) => r.rsvpStatus === "pending");
  const awaitingWithEmail = awaiting.filter((r) => r.isEligibleForEmail);
  const replied = data.totalGuests - data.awaitingCount;
  const repliedPct =
    data.totalGuests > 0 ? Math.round((replied / data.totalGuests) * 100) : 0;
  const reminded = data.recipients.filter((r) => r.lastSentAt);
  const lastSent = reminded
    .map((r) => new Date(r.lastSentAt as string).getTime())
    .sort((a, b) => b - a)[0];
  const recipientCount =
    selectedIds.length > 0
      ? selectedIds.length
      : displayedRecipients.filter((r) => r.isEligibleForEmail).length;

  return (
    <div className="sm:pb-16">
      <ScreenHeader
        title="Reminders"
        subtitle={data.eventTitle}
        backHref={`/events/${eventId}`}
      />
      <DeskMotion className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
        <DeskItem className="flex flex-col gap-1 standalone:max-md:hidden sm:gap-2">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            {data.eventTitle}
          </p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-on-surface sm:text-5xl">
            Reminders
          </h1>
          <p className="hidden max-w-xl text-sm text-on-surface-variant sm:block">
            A polite nudge for the guests who have not replied yet. Pick who to
            remind, check the email, and send.
          </p>
        </DeskItem>

        {/* One ledger instead of three tall cards. */}
        <DeskItem>
          <section
            aria-label="Reminder summary"
            className="profile-card relative overflow-hidden rounded-[28px] p-4 text-champagne sm:p-6"
          >
            <span aria-hidden="true" className="profile-card__weave" />
            <div className="relative flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">
                  Awaiting reply
                </p>
                <p className="mt-1 font-display text-xl text-champagne/70">
                  <NumberFlow
                    value={data.awaitingCount}
                    className="mr-1.5 text-4xl font-bold tabular-nums text-[#fff6dc] sm:text-5xl"
                  />
                  of {data.totalGuests}{" "}
                  {data.totalGuests === 1 ? "guest" : "guests"}
                </p>
              </div>
              <p className="pb-1 text-right text-xs text-champagne/65">
                {replied} {replied === 1 ? "has" : "have"} replied
                <span className="block font-semibold text-gold tabular-nums">
                  {repliedPct}%
                </span>
              </p>
            </div>
            <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/12">
              <m.div
                className="h-full rounded-full bg-gradient-to-r from-[#e9c98a] to-[#f6e2ad]"
                initial={{ width: 0 }}
                animate={{ width: `${repliedPct}%` }}
                transition={{
                  type: "spring",
                  visualDuration: 0.7,
                  bounce: 0.1,
                }}
              />
            </div>
            <dl className="relative mt-4 grid grid-cols-2 divide-x divide-gold/15 rounded-2xl bg-black/20 py-2.5 text-center ring-1 ring-inset ring-gold/15">
              <div className="px-2">
                <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-champagne/55">
                  Can be emailed
                </dt>
                <dd className="mt-0.5 font-display text-lg text-[#fff6dc]">
                  {awaitingWithEmail.length}
                  <span className="text-sm text-champagne/60">
                    /{awaiting.length}
                  </span>
                </dd>
              </div>
              <div className="px-2">
                <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-champagne/55">
                  Last reminder
                </dt>
                <dd className="mt-0.5 font-display text-lg text-[#fff6dc]">
                  {lastSent ? longDate.format(new Date(lastSent)) : "Not yet"}
                </dd>
              </div>
            </dl>
            {noEmailCount > 0 && (
              <Link
                href={`/events/${eventId}/guests`}
                className="relative mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-gold"
              >
                {noEmailCount} {noEmailCount === 1 ? "has" : "have"} no email,
                message from the guest list <span aria-hidden="true">→</span>
              </Link>
            )}
          </section>
        </DeskItem>

        <DeskItem>
          <InvitationQuotaBanner
            eventId={eventId}
            isPaid={data.isPaid}
            invitedCount={data.totalGuests - data.awaitingCount}
          />
        </DeskItem>

        <AnimatePresence>
          {resultMsg && (
            <m.div
              key="result"
              role="status"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                resultMsg.error
                  ? "border-error/40 bg-error/10 text-error"
                  : "border-success/40 bg-success/10 text-success"
              }`}
            >
              {resultMsg.error ? (
                <TriangleAlert className="h-4 w-4 shrink-0" />
              ) : (
                <Check className="h-4 w-4 shrink-0" />
              )}
              <span>{resultMsg.text}</span>
            </m.div>
          )}
        </AnimatePresence>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-12 lg:gap-8"
        >
          <DeskItem className="flex flex-col gap-2 rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm px-4 pb-4 pt-3 sm:px-7 lg:col-span-7">
            <ReminderFilterSelector
              currentFilter={filter}
              awaitingCount={data.awaitingCount}
              totalGuests={data.totalGuests}
              noEmailCount={noEmailCount}
              onFilterChange={(f) => {
                setFilter(f);
                setSelectedIds([]);
              }}
            />
            <ReminderRecipientsTable
              recipients={displayedRecipients}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              addGuestsHref={
                data.recipients.length === 0
                  ? `/events/${eventId}/guests`
                  : undefined
              }
            />
          </DeskItem>

          <div className="flex flex-col gap-4 sm:gap-6 lg:col-span-5 lg:sticky lg:top-6 lg:self-start">
            <DeskItem className="flex flex-col gap-3 rounded-3xl border border-hairline bg-white/40 p-4 backdrop-blur-sm sm:gap-4 sm:p-6">
              <p className={eyebrow}>Write the reminder</p>
              <div>
                <label
                  htmlFor="reminder-subject"
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
                >
                  Subject line
                </label>
                <input
                  id="reminder-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  className={field}
                />
              </div>
              <div>
                <label
                  htmlFor="reminder-note"
                  className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold-ink"
                >
                  Personal note
                </label>
                <textarea
                  id="reminder-note"
                  value={customMessage}
                  rows={4}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className={`${field} resize-none`}
                />
              </div>
              <button
                type="submit"
                disabled={isPending || displayedRecipients.length === 0}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-wine px-6 text-sm font-semibold text-ivory shadow-[0_6px_18px_-6px_rgba(74,17,29,0.55)] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Sending reminders...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    <span>
                      Send reminders ({recipientCount}{" "}
                      {recipientCount === 1 ? "recipient" : "recipients"})
                    </span>
                  </>
                )}
              </button>
            </DeskItem>

            <button
              type="button"
              aria-expanded={showPreview}
              onClick={() => setShowPreview((v) => !v)}
              className="desk-chip flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-burgundy lg:hidden"
            >
              <Mail className="h-4 w-4" />
              {showPreview ? "Hide email preview" : "Preview the email"}
            </button>

            <DeskItem className={showPreview ? "" : "hidden lg:block"}>
              <ReminderMessagePreview
                coupleName={data.coupleName}
                venueName={data.venueName}
                subject={subject}
                customMessage={customMessage}
              />
            </DeskItem>
          </div>
        </form>
      </DeskMotion>
    </div>
  );
}

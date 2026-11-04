"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, m } from "motion/react";
import { Check, Mail, RefreshCw, TriangleAlert } from "lucide-react";
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

const card =
  "bento-tile-hover flex flex-col justify-between gap-5 rounded-3xl border border-outline-variant/60 bg-surface-container-low p-5 sm:p-6";
const eyebrow =
  "text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink";
const field =
  "mt-1.5 w-full rounded-xl border border-outline-variant/70 bg-ivory px-3 py-2.5 text-sm text-on-surface transition-colors placeholder:text-on-surface-variant focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30";
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
    <DeskMotion className="flex flex-col gap-6 pb-16 lg:gap-8">
      <DeskItem className="flex flex-col gap-2">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
          {data.eventTitle}
        </p>
        <h1 className="font-serif text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
          Reminders
        </h1>
        <p className="max-w-xl text-sm text-on-surface-variant">
          A polite nudge for the guests who have not replied yet. Pick who to
          remind, check the email, and send.
        </p>
      </DeskItem>

      <section
        aria-label="Reminder summary"
        className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5"
      >
        <DeskItem className={`${card} lg:col-span-5`}>
          <div className="flex flex-col gap-3">
            <p className={eyebrow}>Awaiting reply</p>
            <p className="font-serif text-xl text-on-surface-variant">
              <NumberFlow
                value={data.awaitingCount}
                className="mr-1.5 text-5xl font-bold tabular-nums text-on-surface"
              />
              of {data.totalGuests}{" "}
              {data.totalGuests === 1 ? "guest" : "guests"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-outline-variant/60">
              <m.div
                className="h-full rounded-full bg-success"
                initial={{ width: 0 }}
                animate={{ width: `${repliedPct}%` }}
                transition={{
                  type: "spring",
                  visualDuration: 0.7,
                  bounce: 0.1,
                }}
              />
            </div>
            <p className="text-xs text-on-surface-variant">
              {replied} {replied === 1 ? "guest has" : "guests have"} replied
            </p>
          </div>
        </DeskItem>

        <DeskItem className={`${card} lg:col-span-4`}>
          <div className="flex flex-col gap-3">
            <p className={eyebrow}>Can be emailed</p>
            <p className="font-serif text-xl text-on-surface-variant">
              <NumberFlow
                value={awaitingWithEmail.length}
                className="mr-1.5 text-5xl font-bold tabular-nums text-on-surface"
              />
              of {awaiting.length} waiting
            </p>
          </div>
          {noEmailCount > 0 ? (
            <Link
              href={`/events/${eventId}/guests`}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-wine transition-transform hover:translate-x-0.5"
            >
              {noEmailCount} {noEmailCount === 1 ? "has" : "have"} no email,
              message from the guest list <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Every guest has an email address.
            </p>
          )}
        </DeskItem>

        <DeskItem className={`${card} lg:col-span-3`}>
          <div className="flex flex-col gap-3">
            <p className={eyebrow}>Last reminder</p>
            <p className="font-serif text-3xl font-bold leading-tight text-on-surface">
              {lastSent ? longDate.format(new Date(lastSent)) : "Not sent yet"}
            </p>
          </div>
          <p className="text-xs text-on-surface-variant">
            {reminded.length === 0
              ? "No guest has been reminded."
              : `${reminded.length} ${reminded.length === 1 ? "guest" : "guests"} reminded so far`}
          </p>
        </DeskItem>
      </section>

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
        className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8"
      >
        <DeskItem className="flex flex-col gap-2 rounded-3xl border border-outline-variant/60 bg-surface-container-low px-4 pb-4 pt-3 sm:px-7 lg:col-span-7">
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
          />
        </DeskItem>

        <div className="flex flex-col gap-6 lg:col-span-5 lg:sticky lg:top-6 lg:self-start">
          <DeskItem className="flex flex-col gap-4 rounded-3xl border border-outline-variant/60 bg-surface-container-low p-5 sm:p-6">
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

          <DeskItem>
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
  );
}

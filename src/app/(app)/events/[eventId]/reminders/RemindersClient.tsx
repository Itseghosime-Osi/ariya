"use client";

import React, { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { ReminderFilterSelector } from "@/features/reminders/components/ReminderFilterSelector";
import { ReminderMessagePreview } from "@/features/reminders/components/ReminderMessagePreview";
import { ReminderRecipientsTable } from "@/features/reminders/components/ReminderRecipientsTable";
import { InvitationQuotaBanner } from "@/features/invitations/components/InvitationQuotaBanner";
import { sendBatchReminderAction } from "@/features/reminders/actions";
import type {
  ReminderDeskData,
  ReminderFilter,
} from "@/features/reminders/types";

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

  return (
    <div className="space-y-6">
      <InvitationQuotaBanner
        eventId={eventId}
        isPaid={data.isPaid}
        invitedCount={data.totalGuests - data.awaitingCount}
      />

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

      {resultMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            resultMsg.error
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}
        >
          <Icon
            name={resultMsg.error ? "error" : "check_circle"}
            className="text-base"
          />
          <span>{resultMsg.text}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 space-y-4">
            <h4 className="font-serif text-sm font-bold text-night">
              Compose Reminder Message
            </h4>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
                Subject Line
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-xs focus:ring-2 focus:ring-wine/40"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
                Additional Note
              </label>
              <textarea
                value={customMessage}
                rows={3}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-xs focus:ring-2 focus:ring-wine/40 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || displayedRecipients.length === 0}
              className="w-full py-3 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Icon name="refresh" className="animate-spin text-sm" />
                  <span>Dispatching Reminders...</span>
                </>
              ) : (
                <>
                  <Icon name="outgoing_mail" className="text-sm" />
                  <span>
                    Dispatch Reminders (
                    {selectedIds.length > 0
                      ? selectedIds.length
                      : displayedRecipients.filter((r) => r.isEligibleForEmail)
                          .length}{" "}
                    Recipients)
                  </span>
                </>
              )}
            </button>
          </div>

          <ReminderRecipientsTable
            recipients={displayedRecipients}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
          />
        </div>

        <div className="lg:col-span-5">
          <ReminderMessagePreview
            coupleName={data.coupleName}
            venueName={data.venueName}
            subject={subject}
            customMessage={customMessage}
          />
        </div>
      </form>
    </div>
  );
}

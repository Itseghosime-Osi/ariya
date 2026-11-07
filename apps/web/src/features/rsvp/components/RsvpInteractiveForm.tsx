"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import { Icon } from "@/components/ui/icon";
import { submitRsvpAction } from "../actions";
import type { InvitationData } from "../types";
import { getGuestTheme } from "../themes";
import type {
  RsvpAnswers,
  RsvpQuestion,
} from "@/features/rsvp-questions/model";
import { AcceptedGuestFields } from "./AcceptedGuestFields";
import { RsvpQuestionFields } from "./RsvpQuestionFields";

interface RsvpInteractiveFormProps {
  data: InvitationData;
  token: string;
  isRevise?: boolean;
  questions?: RsvpQuestion[];
  answers?: RsvpAnswers;
}

export function RsvpInteractiveForm({
  data,
  token,
  isRevise = false,
  questions = [],
  answers = {},
}: RsvpInteractiveFormProps) {
  const { guest, rsvp, event } = data;
  const [state, formAction, isPending] = useActionState(submitRsvpAction, null);

  const initialStatus = rsvp?.status === "declined" ? "declined" : "accepted";
  const [status, setStatus] = useState<"accepted" | "declined">(initialStatus);
  const maxParty = guest.party_size + (guest.plus_ones_allowed ? 1 : 0);
  const [attendingCount, setAttendingCount] = useState<number>(
    rsvp?.attending_count && rsvp.attending_count > 0
      ? rsvp.attending_count
      : guest.party_size || 1
  );

  const handleStatusChange = (newStatus: "accepted" | "declined") => {
    setStatus(newStatus);
    if (newStatus === "accepted") {
      setAttendingCount((prev) => (prev > 0 ? prev : guest.party_size || 1));
    } else {
      setAttendingCount(0);
    }
  };

  const theme = getGuestTheme(event.invitation_theme);

  return (
    <article className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8 relative overflow-hidden">
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${theme.topBar}`}
      />

      {/* Invitation Header */}
      <section className="text-center space-y-3 pt-2">
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${theme.badge}`}
        >
          {isRevise ? "Revision Mode" : `Invitation for ${guest.display_name}`}
        </span>
        <h1
          className={`font-serif text-2xl sm:text-3xl font-medium ${theme.headline}`}
        >
          {event.invitation_headline || event.title}
        </h1>
        <p className={`font-serif text-lg italic ${theme.subheadline}`}>
          {event.invitation_subheadline || `The Celebration of ${event.couple}`}
        </p>
        {event.invitation_message && (
          <p className="text-sm sm:text-base text-on-surface-variant max-w-md mx-auto italic">
            &ldquo;{event.invitation_message}&rdquo;
          </p>
        )}
      </section>

      {state?.error && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 text-sm p-3.5 rounded-2xl flex items-center gap-2"
          role="alert"
        >
          <Icon name="error" className="text-base text-red-600 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Main RSVP Form (Functions natively without JS) */}
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="token" value={token} />

        {/* Status Selection */}
        <div className="space-y-2">
          <label
            className={`text-[13px] font-semibold uppercase tracking-wider block ${theme.label}`}
          >
            Attendance Confirmation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              htmlFor="status-accepted"
              className={`flex min-h-14 items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all ${
                status === "accepted"
                  ? theme.activeRadio
                  : "bg-white border-outline-variant/60 text-night hover:border-wine/40"
              }`}
            >
              <input
                id="status-accepted"
                type="radio"
                name="status"
                value="accepted"
                checked={status === "accepted"}
                onChange={() => handleStatusChange("accepted")}
                className={theme.radioAccent}
              />
              <span className="text-base">Joyfully Accept</span>
            </label>

            <label
              htmlFor="status-declined"
              className={`flex min-h-14 items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all ${
                status === "declined"
                  ? theme.activeRadio
                  : "bg-white border-outline-variant/60 text-night hover:border-wine/40"
              }`}
            >
              <input
                id="status-declined"
                type="radio"
                name="status"
                value="declined"
                checked={status === "declined"}
                onChange={() => handleStatusChange("declined")}
                className={theme.radioAccent}
              />
              <span className="text-base">Regretfully Decline</span>
            </label>
          </div>
        </div>

        {/* Accepted Conditional Fields */}
        {status === "accepted" && (
          <AcceptedGuestFields
            guest={guest}
            rsvp={rsvp}
            maxParty={maxParty}
            attendingCount={attendingCount}
            onAttendingCountChange={setAttendingCount}
          />
        )}

        {status === "accepted" && (
          <RsvpQuestionFields
            questions={questions}
            answers={answers}
            labelClass={theme.label}
            focusRing={theme.focusRing}
          />
        )}

        {/* Email Address for Digital Pass Delivery */}
        <div className="space-y-1.5">
          <label
            htmlFor="rsvp-email"
            className={`text-[13px] font-semibold uppercase tracking-wider block ${theme.label}`}
          >
            Email Address (for pass confirmation)
          </label>
          <input
            id="rsvp-email"
            type="email"
            autoComplete="email"
            name="email"
            placeholder="e.g. guest@example.com"
            className={`min-h-12 w-full rounded-2xl border border-outline-variant/60 bg-white px-4 py-3 text-base text-night focus:outline-none focus:ring-2 ${theme.focusRing}`}
          />
        </div>

        {/* Blessings Note */}
        <div className="space-y-1.5">
          <label
            htmlFor="rsvp-note"
            className={`text-[13px] font-semibold uppercase tracking-wider block ${theme.label}`}
          >
            Blessing or Special Note for {event.couple}
          </label>
          <textarea
            id="rsvp-note"
            name="note"
            rows={3}
            defaultValue={rsvp?.note || ""}
            placeholder="Share your prayers and warm wishes..."
            className={`min-h-12 w-full rounded-2xl border border-outline-variant/60 bg-white px-4 py-3 text-base text-night focus:outline-none focus:ring-2 ${theme.focusRing} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className={`w-full min-h-12 py-3 px-6 rounded-full text-base font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 ${theme.primaryButton}`}
        >
          <Icon
            name={isPending ? "refresh" : "outgoing_mail"}
            className={`text-base ${isPending ? "animate-spin" : ""}`}
          />
          <span>
            {isPending
              ? "Submitting Response..."
              : isRevise
                ? "Update RSVP Response"
                : "Submit RSVP Response"}
          </span>
        </button>
      </form>
    </article>
  );
}

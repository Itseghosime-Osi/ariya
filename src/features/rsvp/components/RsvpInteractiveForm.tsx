"use client";

import React, { useState } from "react";
import { useActionState } from "react";
import { Icon } from "@/components/ui/icon";
import { submitRsvpAction } from "../actions";
import type { InvitationData } from "../types";

interface RsvpInteractiveFormProps {
  data: InvitationData;
  token: string;
  isRevise?: boolean;
}

export function RsvpInteractiveForm({
  data,
  token,
  isRevise = false,
}: RsvpInteractiveFormProps) {
  const { guest, rsvp, event } = data;
  const [state, formAction, isPending] = useActionState(submitRsvpAction, null);

  const initialStatus = rsvp?.status === "declined" ? "declined" : "accepted";
  const [status, setStatus] = useState<"accepted" | "declined">(initialStatus);
  const maxParty = guest.party_size + (guest.plus_ones_allowed ? 1 : 0);
  const [attendingCount, setAttendingCount] = useState<number>(
    rsvp?.attending_count && rsvp.attending_count > 0
      ? rsvp.attending_count
      : guest.party_size
  );

  return (
    <article className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-wine via-gold to-wine" />

      {/* Invitation Header */}
      <section className="text-center space-y-3 pt-2">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-wine/10 text-wine">
          {isRevise ? "Revision Mode" : `Invitation for ${guest.display_name}`}
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl text-wine font-medium">
          {event.title}
        </h1>
        <p className="font-serif text-lg italic text-wine/80">
          The Nuptials of {event.couple}
        </p>
      </section>

      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl flex items-center gap-2">
          <Icon name="error" className="text-base text-red-600 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Main RSVP Form (Functions natively without JS) */}
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="token" value={token} />

        {/* Status Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
            Attendance Confirmation
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                status === "accepted"
                  ? "bg-wine/5 border-wine text-wine font-medium shadow-sm"
                  : "bg-white border-outline-variant/60 text-night hover:border-wine/40"
              }`}
            >
              <input
                type="radio"
                name="status"
                value="accepted"
                checked={status === "accepted"}
                onChange={() => setStatus("accepted")}
                className="text-wine focus:ring-wine"
              />
              <span className="text-sm">Joyfully Accept</span>
            </label>

            <label
              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                status === "declined"
                  ? "bg-wine/5 border-wine text-wine font-medium shadow-sm"
                  : "bg-white border-outline-variant/60 text-night hover:border-wine/40"
              }`}
            >
              <input
                type="radio"
                name="status"
                value="declined"
                checked={status === "declined"}
                onChange={() => setStatus("declined")}
                className="text-wine focus:ring-wine"
              />
              <span className="text-sm">Regretfully Decline</span>
            </label>
          </div>
        </div>

        {/* Accepted Conditional Fields */}
        {status === "accepted" && (
          <div className="space-y-4 pt-2 border-t border-outline-variant/30">
            {/* Party Size Stepper/Select */}
            {maxParty > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
                  Number of Attending Guests (Up to {maxParty})
                </label>
                <select
                  name="attendingCount"
                  value={attendingCount}
                  onChange={(e) => setAttendingCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
                >
                  {Array.from({ length: maxParty }, (_, i) => i + 1).map(
                    (n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Guest" : "Guests"}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

            {status === "accepted" && maxParty <= 1 && (
              <input type="hidden" name="attendingCount" value={1} />
            )}

            {/* Plus-One Name if allowed */}
            {guest.plus_ones_allowed && attendingCount > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
                  Accompanied Guest / Escort Name
                </label>
                <input
                  type="text"
                  name="plusOneName"
                  defaultValue={rsvp?.plus_one_name || ""}
                  placeholder="e.g. Mrs. Folashade Adeleke"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
                />
              </div>
            )}

            {/* Dietary */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
                Dietary & Wellness Preferences
              </label>
              <input
                type="text"
                name="dietary"
                defaultValue={rsvp?.dietary || ""}
                placeholder="e.g. Halal, pescatarian, no peanuts"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
              />
            </div>
          </div>
        )}

        {/* Email Address for Digital Pass Delivery */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
            Email Address (for pass confirmation)
          </label>
          <input
            type="email"
            name="email"
            placeholder="e.g. guest@example.com"
            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          />
        </div>

        {/* Blessings Note */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
            Blessing or Special Note for {event.couple}
          </label>
          <textarea
            name="note"
            rows={2}
            defaultValue={rsvp?.note || ""}
            placeholder="Share your prayers and warm wishes..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 px-6 rounded-xl bg-wine hover:bg-wine/90 text-ivory text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Icon
            name={isPending ? "refresh" : "send"}
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

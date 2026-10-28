"use client";

import React, { useState, useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { pluralise } from "@/lib/metrics";
import {
  trackGuestInvitationsAction,
  sendGuestInvitationEmailAction,
} from "../actions";
import type { InvitationGuest } from "../types";

interface InvitationGuestTrackerProps {
  eventId: string;
  guests: InvitationGuest[];
  eventTitle: string;
}

export function InvitationGuestTracker({
  eventId,
  guests,
  eventTitle,
}: InvitationGuestTrackerProps) {
  const [filter, setFilter] = useState<"all" | "uninvited" | "invited">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = guests.filter((g) => {
    if (filter === "uninvited") return !g.invitedAt;
    if (filter === "invited") return !!g.invitedAt;
    return true;
  });

  const handleCopyLink = async (guest: InvitationGuest) => {
    const origin = window.location.origin;
    const url = `${origin}/i/${guest.rsvpToken}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(guest.id);
    setTimeout(() => setCopiedId(null), 2500);

    // Track invitation
    startTransition(async () => {
      const res = await trackGuestInvitationsAction(eventId, [guest.id]);
      if (res.error) setActionError(res.error);
    });
  };

  const handleSendEmail = (guest: InvitationGuest) => {
    setActionError(null);
    startTransition(async () => {
      const res = await sendGuestInvitationEmailAction(eventId, guest.id);
      if (res.error) setActionError(res.error);
    });
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/40">
        <div>
          <h3 className="font-serif text-lg font-bold text-night">
            Invitation Delivery Tracker
          </h3>
          <p className="text-xs text-on-surface-variant">
            Track which guests have received their passes via digital links or
            email.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-xl text-xs font-semibold">
          {(["all", "uninvited", "invited"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-lg capitalize transition-all ${
                filter === tab ? "bg-white text-wine shadow-xs" : "text-mist"
              }`}
            >
              {tab} (
              {tab === "all"
                ? guests.length
                : tab === "uninvited"
                  ? guests.filter((g) => !g.invitedAt).length
                  : guests.filter((g) => !!g.invitedAt).length}
              )
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-center gap-2">
          <Icon name="error" className="text-base text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="divide-y divide-outline-variant/40 max-h-[460px] overflow-y-auto pr-1">
        {filtered.map((guest) => {
          const origin =
            typeof window !== "undefined" ? window.location.origin : "";
          const shareText = encodeURIComponent(
            `Hello ${guest.name}! Please view your pass for ${eventTitle}: ${origin}/i/${guest.rsvpToken}`
          );
          const waUrl = guest.phone
            ? `https://wa.me/${guest.phone.replace(/[^0-9]/g, "")}?text=${shareText}`
            : null;

          return (
            <div
              key={guest.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-night text-sm">
                    {guest.name}
                  </span>
                  {guest.isVip && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      VIP
                    </span>
                  )}
                  {guest.invitedAt ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      Delivered
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700">
                      Awaiting Send
                    </span>
                  )}
                </div>
                <p className="text-on-surface-variant">
                  {guest.email || "No email"} • {guest.phone || "No phone"} •{" "}
                  {pluralise(guest.displaySeats, "seat")}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleCopyLink(guest)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant/60 font-medium hover:border-wine hover:text-wine bg-white transition-all flex items-center gap-1"
                >
                  <Icon
                    name={copiedId === guest.id ? "check" : "content_copy"}
                    className="text-sm"
                  />
                  <span>{copiedId === guest.id ? "Copied!" : "Copy Link"}</span>
                </button>

                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      startTransition(async () => {
                        await trackGuestInvitationsAction(eventId, [guest.id]);
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1"
                  >
                    <Icon name="chat" className="text-sm" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {guest.email && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSendEmail(guest)}
                    className="px-2.5 py-1.5 rounded-lg bg-wine text-ivory font-medium hover:bg-wine/90 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Icon name="mail" className="text-sm" />
                    <span>Email</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

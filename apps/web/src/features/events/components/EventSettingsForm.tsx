"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import type { Event } from "@/features/events/types";
import { updateEventSettingsAction } from "@/features/events/settings-actions";
import { EventDangerZone } from "./EventDangerZone";

interface EventSettingsFormProps {
  event: Event;
  userRole?: string;
}

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const CARD =
  "overflow-hidden rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm";
const FIELD =
  "desk-field min-h-[44px] w-full rounded-2xl px-4 text-base text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none sm:text-sm";
const LABEL =
  "mb-1 block px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-label-2";

export function EventSettingsForm({ event, userRole }: EventSettingsFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [couple, setCouple] = useState(event.couple);
  const [slug, setSlug] = useState(event.slug);
  const [date, setDate] = useState(event.date ? event.date.slice(0, 16) : "");
  const [venue, setVenue] = useState(event.venue);
  const [area, setArea] = useState(event.area || "");
  const [dressCode, setDressCode] = useState(event.dress_code || "");
  const [isPublic, setIsPublic] = useState(Boolean(event.is_public));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isOwner = userRole === "owner";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateEventSettingsAction(event.id, {
      title,
      couple,
      slug,
      date,
      venue,
      area: area || undefined,
      dressCode: dressCode || undefined,
      isPublic,
    });

    setSaving(false);
    if (!res.ok) {
      setMessage({ type: "error", text: res.error || "Save failed" });
    } else {
      setMessage({ type: "success", text: "Settings saved successfully." });
      router.refresh();
    }
  };

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${
            message.type === "success"
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-error-container text-error"
          }`}
        >
          <Icon
            name={message.type === "success" ? "check_circle" : "error"}
            size={16}
          />
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
        <section aria-labelledby="ev-details">
          <h2 id="ev-details" className={`${EYEBROW} mb-2 px-1`}>
            The celebration
          </h2>
          <div className={`${CARD} space-y-3 p-4 sm:space-y-4 sm:p-5`}>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <label htmlFor="setting-title" className={LABEL}>
                  Celebration title
                </label>
                <input
                  id="setting-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="setting-couple" className={LABEL}>
                  Couple names
                </label>
                <input
                  id="setting-couple"
                  required
                  value={couple}
                  onChange={(e) => setCouple(e.target.value)}
                  className={FIELD}
                />
              </div>
            </div>

            <div>
              <label htmlFor="setting-date" className={LABEL}>
                Date &amp; time
              </label>
              <input
                id="setting-date"
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={FIELD}
              />
            </div>

            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 sm:gap-4">
              <div>
                <label htmlFor="setting-venue" className={LABEL}>
                  Venue
                </label>
                <input
                  id="setting-venue"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className={FIELD}
                />
              </div>
              <div>
                <label htmlFor="setting-area" className={LABEL}>
                  City / state
                </label>
                <input
                  id="setting-area"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={FIELD}
                />
              </div>
            </div>

            <div>
              <label htmlFor="setting-dress-code" className={LABEL}>
                Dress code &amp; aṣọ-ẹbí
              </label>
              <textarea
                id="setting-dress-code"
                rows={2}
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                className={`${FIELD} resize-none rounded-2xl py-2.5`}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="ev-link">
          <h2 id="ev-link" className={`${EYEBROW} mb-2 px-1`}>
            Guest link
          </h2>
          <div className={`${CARD} divide-y divide-hairline`}>
            <div className="p-4 sm:p-5">
              <label htmlFor="setting-slug" className={LABEL}>
                Page address
              </label>
              <div className="desk-field flex min-h-[44px] items-center rounded-2xl pl-4 focus-within:ring-2 focus-within:ring-burgundy/30">
                <span className="shrink-0 font-mono text-sm text-label-3">
                  /e/
                </span>
                <input
                  id="setting-slug"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="min-h-[44px] w-full min-w-0 bg-transparent px-1 pr-4 font-mono text-base text-night focus-visible:outline-none sm:text-sm"
                />
              </div>
            </div>
            <div className="flex min-h-[64px] items-center gap-3.5 px-4 py-3 sm:px-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-burgundy/[0.07] text-gold-ink">
                <Icon name="visibility" size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-night">
                  Public event page
                </span>
                <span className="block text-[12.5px] leading-snug text-label-2">
                  Guests can see directions and enter their passcode.
                </span>
              </span>
              <Switch
                on={isPublic}
                onChange={setIsPublic}
                label="Public event page"
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-burgundy px-6 text-sm font-semibold text-ivory shadow-sm transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-50 sm:ml-auto sm:w-auto"
        >
          <Icon name="check" size={18} />
          <span>{saving ? "Saving changes…" : "Save settings"}</span>
        </button>
      </form>

      <EventDangerZone
        event={event}
        isOwner={isOwner}
        onError={(text) => setMessage({ type: "error", text })}
      />
    </div>
  );
}

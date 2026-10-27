"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { Event } from "@/features/events/types";
import { updateEventSettingsAction } from "@/features/events/settings-actions";
import { EventDangerZone } from "./EventDangerZone";

interface EventSettingsFormProps {
  event: Event;
  userRole?: string;
}

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
    <div className="space-y-8 max-w-4xl mx-auto">
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === "success"
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-error-container text-on-error-container"
          }`}
        >
          <Icon
            name={message.type === "success" ? "check_circle" : "error"}
            className="text-base"
          />
          <span>{message.text}</span>
        </div>
      )}

      {/* General Settings */}
      <form
        onSubmit={handleSave}
        className="bg-surface-container-low p-6 sm:p-8 rounded-2xl border border-outline-variant/30 space-y-6 shadow-sm"
      >
        <div className="space-y-1">
          <h2 className="font-serif text-xl text-wine font-medium">
            Event Details &amp; Logistics
          </h2>
          <p className="text-xs text-on-surface-variant">
            Update core metadata, ceremonial naming, and live URL routing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="setting-title"
              className="text-xs font-semibold text-wine"
            >
              Celebration Title
            </label>
            <input
              id="setting-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="setting-couple"
              className="text-xs font-semibold text-wine"
            >
              Couple Names
            </label>
            <input
              id="setting-couple"
              type="text"
              required
              value={couple}
              onChange={(e) => setCouple(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="setting-slug"
              className="text-xs font-semibold text-wine"
            >
              URL Slug (/e/slug)
            </label>
            <input
              id="setting-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm font-mono text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="setting-date"
              className="text-xs font-semibold text-wine"
            >
              Celebration Date &amp; Time
            </label>
            <input
              id="setting-date"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="setting-venue"
              className="text-xs font-semibold text-wine"
            >
              Venue Location
            </label>
            <input
              id="setting-venue"
              type="text"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="setting-area"
              className="text-xs font-semibold text-wine"
            >
              City / State
            </label>
            <input
              id="setting-area"
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="setting-dress-code"
            className="text-xs font-semibold text-wine"
          >
            Dress Code &amp; Aṣọ-Ẹbí Instructions
          </label>
          <textarea
            id="setting-dress-code"
            rows={2}
            value={dressCode}
            onChange={(e) => setDressCode(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          />
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant/40 bg-surface-container-lowest">
          <div className="space-y-0.5">
            <label
              htmlFor="setting-is-public"
              className="text-xs font-semibold text-wine"
            >
              Public Web Portal (/e/{slug})
            </label>
            <p className="text-[11px] text-on-surface-variant">
              Allow unauthenticated guests to discover venue directions and
              enter passcodes.
            </p>
          </div>
          <input
            id="setting-is-public"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded border-outline-variant text-wine focus:ring-wine/40"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-wine hover:bg-wine/90 text-ivory text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Icon name="save" className="text-base" />
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <EventDangerZone
        event={event}
        isOwner={isOwner}
        onError={(text) => setMessage({ type: "error", text })}
      />
    </div>
  );
}

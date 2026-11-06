"use client";

import { DateTimeField } from "@/components/ui/date-time-field";
import { Switch } from "@/components/ui/switch";
import React from "react";
import type { LivePreviewData } from "./LivePagePreview";
import { CoverImageUpload } from "./CoverImageUpload";

interface EditorControlsFormProps {
  eventId: string;
  data: LivePreviewData;
  onChange: (field: keyof LivePreviewData, value: string | boolean) => void;
  watDate: string;
  onChangeWatDate: (val: string) => void;
  watRsvpBy: string;
  onChangeWatRsvpBy: (val: string) => void;
  disabled?: boolean;
}

export function EditorControlsForm({
  eventId,
  data,
  onChange,
  watDate,
  onChangeWatDate,
  watRsvpBy,
  onChangeWatRsvpBy,
  disabled = false,
}: EditorControlsFormProps) {
  return (
    <div className="rounded-3xl border border-hairline bg-white/40 p-4 backdrop-blur-sm sm:p-6 space-y-5">
      <div className="space-y-1">
        <h3 className="font-serif text-lg text-wine font-medium">
          Event details
        </h3>
        <p className="text-xs text-on-surface-variant">
          Edit details shown on public pages and invitations.
        </p>
      </div>

      <div className="space-y-4">
        {/* Public Discovery Toggle */}
        <div className="flex items-center justify-between gap-3 rounded-2xl desk-field p-3.5">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-semibold text-wine">
              Public event page (/e/{data.slug || "..."})
            </p>
            <p className="text-[11px] text-on-surface-variant">
              When off, /e/[slug] returns 404. Direct invitation passes
              (/i/token) stay active.
            </p>
          </div>
          <Switch
            on={data.isPublic}
            onChange={(on) => onChange("isPublic", on)}
            disabled={disabled}
            label="Public event page"
          />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
            Headline
          </label>
          <input
            type="text"
            disabled={disabled}
            value={data.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. Adebayo & Folashade's Wedding"
            className="w-full px-3.5 py-2.5 rounded-2xl desk-field text-base sm:text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          />
        </div>

        {/* Couple */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
            Couple names
          </label>
          <input
            type="text"
            disabled={disabled}
            value={data.couple}
            onChange={(e) => onChange("couple", e.target.value)}
            placeholder="e.g. Folashade & Adebayo"
            className="w-full px-3.5 py-2.5 rounded-2xl desk-field text-base sm:text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          />
        </div>

        {/* Date and RSVP By */}
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="editor-date"
              className="text-xs font-semibold uppercase tracking-wider text-wine/80"
            >
              Ceremony Date & Time
            </label>
            <DateTimeField
              id="editor-date"
              disabled={disabled}
              value={watDate}
              onChange={onChangeWatDate}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="editor-rsvp-by"
              className="text-xs font-semibold uppercase tracking-wider text-wine/80"
            >
              RSVP Deadline
            </label>
            <DateTimeField
              id="editor-rsvp-by"
              clearable
              disabled={disabled}
              value={watRsvpBy}
              onChange={onChangeWatRsvpBy}
              placeholder="No deadline"
            />
          </div>
        </div>

        {/* Venue & Area */}
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
              Venue Location
            </label>
            <input
              type="text"
              disabled={disabled}
              value={data.venue}
              onChange={(e) => onChange("venue", e.target.value)}
              placeholder="e.g. The Grand Ballroom, Eko Hotel"
              className="w-full px-3.5 py-2 rounded-2xl desk-field text-base sm:text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
              City / State
            </label>
            <input
              type="text"
              disabled={disabled}
              value={data.area}
              onChange={(e) => onChange("area", e.target.value)}
              placeholder="e.g. Victoria Island, Lagos"
              className="w-full px-3.5 py-2 rounded-2xl desk-field text-base sm:text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>
        </div>

        {/* Story / Invocation */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
            Your story
          </label>
          <textarea
            rows={2}
            disabled={disabled}
            value={data.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Share your story or a welcome message for your guests..."
            className="w-full px-3.5 py-2 rounded-2xl desk-field text-base sm:text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40 resize-none"
          />
        </div>

        {/* Cover Banner Upload */}
        <CoverImageUpload
          eventId={eventId}
          coverImageUrl={data.coverImageUrl}
          onChange={(url) => onChange("coverImageUrl", url)}
          disabled={disabled}
        />

        {/* Dress Code */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
            Dress Code & Aso-Ebi Palette
          </label>
          <textarea
            rows={2}
            disabled={disabled}
            value={data.dressCode}
            onChange={(e) => onChange("dressCode", e.target.value)}
            placeholder="e.g. Wine Velvet & Champagne Gold."
            className="w-full px-3.5 py-2 rounded-2xl desk-field text-base sm:text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40 resize-none"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <p
            id="editor-status-label"
            className="text-xs font-semibold uppercase tracking-wider text-wine/80"
          >
            Publication Status
          </p>
          <div
            role="radiogroup"
            aria-labelledby="editor-status-label"
            className="grid grid-cols-3 gap-1.5"
          >
            {(
              [
                ["draft", "Draft", "Private"],
                ["active", "Active", "Published"],
                ["archived", "Archived", "Concluded"],
              ] as const
            ).map(([value, label, hint]) => {
              const on = data.status === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={disabled}
                  onClick={() => onChange("status", value)}
                  className={`min-h-[52px] rounded-2xl px-2 py-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-60 ${
                    on
                      ? "bg-burgundy text-ivory shadow-sm"
                      : "desk-chip text-night"
                  }`}
                >
                  <span className="block text-[13px] font-semibold">
                    {label}
                  </span>
                  <span
                    className={`block text-[11px] ${on ? "text-ivory/80" : "text-label-2"}`}
                  >
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

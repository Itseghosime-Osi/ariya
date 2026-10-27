"use client";

import React from "react";
import type { LivePreviewData } from "./LivePagePreview";
import { CoverImageUpload } from "./CoverImageUpload";

interface EditorControlsFormProps {
  eventId: string;
  data: LivePreviewData;
  onChange: (field: keyof LivePreviewData, value: string | boolean) => void;
  disabled?: boolean;
}

export function EditorControlsForm({
  eventId,
  data,
  onChange,
  disabled = false,
}: EditorControlsFormProps) {
  return (
    <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/30 space-y-5">
      <div className="space-y-1">
        <h3 className="font-serif text-lg text-wine font-medium">
          Celebration Parameters
        </h3>
        <p className="text-xs text-on-surface-variant">
          Adjust ceremonial details rendered across public pages and
          invitations.
        </p>
      </div>

      <div className="space-y-4">
        {/* Public Discovery Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-outline-variant/60 bg-white">
          <div className="space-y-0.5">
            <label className="text-xs font-semibold text-wine block">
              Public Event Portal (/e/{data.slug || "..."})
            </label>
            <p className="text-[11px] text-on-surface-variant">
              When disabled, /e/[slug] returns 404. Direct invitation passes
              (/i/token) remain active.
            </p>
          </div>
          <input
            type="checkbox"
            disabled={disabled}
            checked={data.isPublic}
            onChange={(e) => onChange("isPublic", e.target.checked)}
            className="h-4 w-4 rounded border-outline-variant text-wine focus:ring-wine/40"
          />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
            Celebration Headline
          </label>
          <input
            type="text"
            disabled={disabled}
            value={data.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. Adebayo & Folashade's Wedding"
            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          />
        </div>

        {/* Couple */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
            Couple Monogram Names
          </label>
          <input
            type="text"
            disabled={disabled}
            value={data.couple}
            onChange={(e) => onChange("couple", e.target.value)}
            placeholder="e.g. Folashade & Adebayo"
            className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          />
        </div>

        {/* Date and RSVP By */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
              Ceremony Date & Time
            </label>
            <input
              type="datetime-local"
              disabled={disabled}
              value={data.date ? data.date.slice(0, 16) : ""}
              onChange={(e) => onChange("date", e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
              RSVP Deadline
            </label>
            <input
              type="date"
              disabled={disabled}
              value={data.rsvpBy ? data.rsvpBy.slice(0, 10) : ""}
              onChange={(e) => onChange("rsvpBy", e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>
        </div>

        {/* Venue & Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
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
              className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
            />
          </div>
        </div>

        {/* Story / Invocation */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
            Couple Story / Warm Invocation
          </label>
          <textarea
            rows={2}
            disabled={disabled}
            value={data.description || ""}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="We warmly invite our esteemed elders, cherished family, and dear friends..."
            className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40 resize-none"
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
            className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40 resize-none"
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-wine/80">
            Publication Status
          </label>
          <select
            disabled={disabled}
            value={data.status}
            onChange={(e) => onChange("status", e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-white text-sm text-night focus:outline-none focus:ring-2 focus:ring-wine/40"
          >
            <option value="draft">Draft (Private)</option>
            <option value="active">Active (Published to Guests)</option>
            <option value="archived">Archived (Concluded)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

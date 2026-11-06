"use client";

import { DateTimeField } from "@/components/ui/date-time-field";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { MonogramSeal } from "@/features/events/components/desk/MonogramSeal";
import type { Event } from "@/features/events/types";
import { updateEventSettingsAction } from "@/features/events/settings-actions";
import { EventDangerZone } from "./EventDangerZone";

interface EventSettingsFormProps {
  event: Event;
  userRole?: string;
  /** The celebration's day has passed: everything here is read-only. */
  ended?: boolean;
}

type TabId = "details" | "link" | "danger";
const TABS: { id: TabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "link", label: "Guest link" },
  { id: "danger", label: "Danger zone" },
];

const CARD =
  "overflow-hidden rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm";
const FIELD =
  "desk-field min-h-[44px] w-full rounded-2xl px-4 text-base text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none sm:text-sm";
const LABEL =
  "mb-1 block px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-label-2";

export function EventSettingsForm({
  event,
  userRole,
  ended = false,
}: EventSettingsFormProps) {
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

  const [tab, setTab] = useState<TabId>("details");

  const isOwner = userRole === "owner";
  const dirty =
    title !== event.title ||
    couple !== event.couple ||
    slug !== event.slug ||
    date !== (event.date ? event.date.slice(0, 16) : "") ||
    venue !== event.venue ||
    area !== (event.area || "") ||
    dressCode !== (event.dress_code || "") ||
    isPublic !== Boolean(event.is_public);
  const when = date ? new Date(date) : null;
  const whenLabel =
    when && !Number.isNaN(when.getTime())
      ? `${when.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · ${when.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}`
      : "Pick a date";

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

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    opts: { type?: string; required?: boolean } = {}
  ) => (
    <div className="min-w-0">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type={opts.type ?? "text"}
        required={opts.required ?? true}
        disabled={ended}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={FIELD}
      />
    </div>
  );

  const saveButton = ended ? null : (
    <button
      type="submit"
      disabled={saving}
      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-burgundy px-6 text-sm font-semibold text-ivory shadow-sm transition-colors hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:opacity-50"
    >
      <Icon name="check" size={18} />
      <span>{saving ? "Saving changes…" : "Save settings"}</span>
    </button>
  );

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-5">
      {/* Live preview: the invitation's face, rewritten as the fields change. */}
      <section
        aria-label="Preview"
        className="profile-card relative overflow-hidden rounded-[28px] px-4 py-4 text-champagne sm:px-6 sm:py-5"
      >
        <span aria-hidden="true" className="profile-card__weave" />
        <div className="relative flex items-center gap-3.5 sm:gap-5">
          <MonogramSeal
            text={couple || title}
            size={64}
            className="shrink-0 drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl leading-tight text-[#fff6dc] sm:text-2xl">
              {couple || title || "Your celebration"}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-champagne/75">
              {whenLabel}
            </p>
            <p className="truncate text-[12.5px] text-champagne/60">
              {[venue, area].filter(Boolean).join(" · ") || "Add a venue"}
            </p>
          </div>
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-gold/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-night">
            {ended ? "Ended" : isPublic ? "Public" : "Private"}
          </span>
          <span className="truncate rounded-full border border-gold/30 px-2.5 py-0.5 font-mono text-[10px] text-champagne/75">
            /e/{slug}
          </span>
          {dirty && (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#fff6dc]">
              Unsaved
            </span>
          )}
        </div>
      </section>

      {ended && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-night"
        >
          <Icon
            name="lock"
            size={16}
            className="mt-0.5 shrink-0 text-gold-ink"
          />
          <span>
            <b className="font-semibold">This celebration has ended.</b> Its
            details, date and link are locked, and its public page is closed for
            good.
          </span>
        </div>
      )}

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

      <div
        role="tablist"
        aria-label="Event settings sections"
        className="grid grid-cols-3 gap-1 rounded-full border border-hairline bg-white/40 p-1"
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`ev-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`ev-panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`min-h-[40px] truncate rounded-full px-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                on
                  ? t.id === "danger"
                    ? "bg-error text-white shadow-sm"
                    : "bg-burgundy text-ivory shadow-sm"
                  : "text-label-2 hover:text-night"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab !== "danger" && (
        <form
          onSubmit={handleSave}
          id={`ev-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`ev-tab-${tab}`}
          className="space-y-4"
        >
          {tab === "details" ? (
            <div className={`${CARD} space-y-3 p-4 sm:space-y-4 sm:p-5`}>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                {field("setting-title", "Celebration title", title, setTitle)}
                {field("setting-couple", "Couple names", couple, setCouple)}
              </div>
              <div className="min-w-0">
                <label htmlFor="setting-date" className={LABEL}>
                  Date &amp; time
                </label>
                <DateTimeField
                  id="setting-date"
                  disabled={ended}
                  value={date}
                  onChange={setDate}
                />
              </div>
              <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3 sm:gap-4">
                {field("setting-venue", "Venue", venue, setVenue)}
                {field("setting-area", "City / state", area, setArea, {
                  required: false,
                })}
              </div>
              <div>
                <label htmlFor="setting-dress-code" className={LABEL}>
                  Dress code &amp; aṣọ-ẹbí
                </label>
                <textarea
                  id="setting-dress-code"
                  rows={2}
                  disabled={ended}
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  className={`${FIELD} resize-none py-2.5`}
                />
              </div>
            </div>
          ) : (
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
                    disabled={ended}
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
                    {ended
                      ? "Expired. This link cannot be opened or turned on again."
                      : "Guests can see directions and enter their passcode."}
                  </span>
                </span>
                <Switch
                  on={ended ? false : isPublic}
                  onChange={setIsPublic}
                  disabled={ended}
                  label="Public event page"
                />
              </div>
            </div>
          )}
          {saveButton}
        </form>
      )}

      {tab === "danger" && (
        <div
          id="ev-panel-danger"
          role="tabpanel"
          aria-labelledby="ev-tab-danger"
        >
          <EventDangerZone
            event={event}
            isOwner={isOwner}
            onError={(text) => setMessage({ type: "error", text })}
          />
        </div>
      )}
    </div>
  );
}

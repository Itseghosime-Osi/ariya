"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ScreenHeader } from "@/components/layout/screen-header";
import { updateEventAction } from "@/features/events/actions";
import type { Event } from "@/features/events/types";
import { formatWatDatetimeLocal, parseWatDateToUtc } from "@/lib/format";
import { FilmStudio } from "@/features/event-film/FilmStudio";
import { readFilmDesign } from "@/features/event-film/design";
import {
  RsvpStudio,
  type GuestAnswers,
} from "@/features/rsvp-questions/RsvpStudio";
import { readQuestions } from "@/features/rsvp-questions/model";
import { EditorControlsForm } from "./EditorControlsForm";
import { LivePagePreview, type LivePreviewData } from "./LivePagePreview";

interface EventPageEditorProps {
  event: Event;
  replies?: GuestAnswers[];
  sealPlaced?: boolean;
}

export function EventPageEditor({
  event,
  replies = [],
  sealPlaced = false,
}: EventPageEditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"page" | "film" | "rsvp">("page");

  // Local WAT datetime input state. Converted with parseWatDateToUtc only on save and for live preview.
  const [watDateInput, setWatDateInput] = useState<string>(() =>
    event.date ? formatWatDatetimeLocal(event.date) : ""
  );
  const [watRsvpByInput, setWatRsvpByInput] = useState<string>(() =>
    event.rsvp_by ? formatWatDatetimeLocal(event.rsvp_by) : ""
  );

  const [formData, setFormData] = useState<LivePreviewData>({
    title: event.title || "",
    couple: event.couple || "",
    date: event.date || "",
    venue: event.venue || "",
    area: event.area || "",
    dressCode: event.dress_code || "",
    rsvpBy: event.rsvp_by || "",
    status: event.status || "draft",
    isPublic: Boolean(event.is_public),
    slug: event.slug,
    description: event.description || "",
    coverImageUrl: event.cover_image_url || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFieldChange = (
    field: keyof LivePreviewData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setErrorMsg(null);
  };

  const handleWatDateChange = (val: string) => {
    setWatDateInput(val);
    setSaveSuccess(false);
    setErrorMsg(null);
  };

  const handleWatRsvpByChange = (val: string) => {
    setWatRsvpByInput(val);
    setSaveSuccess(false);
    setErrorMsg(null);
  };

  // Preview reflects converted WAT date instant
  const previewDate = watDateInput ? parseWatDateToUtc(watDateInput) : "";
  const previewRsvpBy = watRsvpByInput ? parseWatDateToUtc(watRsvpByInput) : "";

  const previewData: LivePreviewData = {
    ...formData,
    date: previewDate || formData.date,
    rsvpBy: previewRsvpBy || formData.rsvpBy,
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    const convertedDate = watDateInput
      ? parseWatDateToUtc(watDateInput)
      : undefined;
    const convertedRsvpBy = watRsvpByInput
      ? parseWatDateToUtc(watRsvpByInput)
      : undefined;

    const res = await updateEventAction(event.id, {
      title: formData.title,
      couple: formData.couple,
      date: convertedDate,
      venue: formData.venue,
      area: formData.area || undefined,
      dressCode: formData.dressCode || undefined,
      rsvpBy: convertedRsvpBy,
      status: formData.status as "draft" | "active" | "archived",
      isPublic: formData.isPublic,
      description: formData.description || undefined,
      coverImageUrl: formData.coverImageUrl || undefined,
    });

    setIsSaving(false);
    if (!res.ok) {
      setErrorMsg(res.error);
    } else {
      setSaveSuccess(true);
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <ScreenHeader
        title="Page editor"
        subtitle={event.title}
        backHref={`/events/${event.id}`}
        action={{
          icon: "arrow_forward",
          label: "View public page",
          href: `/e/${event.slug}`,
        }}
      />

      <header className="flex flex-wrap items-end justify-between gap-3 standalone:max-md:hidden">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink">
            {event.title}
          </p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-on-surface sm:text-4xl">
            Page editor
          </h1>
          <p className="mt-1 max-w-xl text-sm text-label-2">
            Design what guests see: the page, the film that opens it, and the
            questions they answer.
          </p>
        </div>
        <Link
          href={`/e/${event.slug}`}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-white/45 px-4 text-[13px] font-semibold text-burgundy backdrop-blur-sm transition-colors hover:bg-white/70"
        >
          View public page
          <Icon name="arrow_forward" size={16} />
        </Link>
      </header>

      <div
        role="tablist"
        aria-label="Editor sections"
        className="grid grid-cols-3 gap-1 rounded-full border border-hairline bg-white/40 p-1 backdrop-blur-sm sm:inline-grid sm:w-auto"
      >
        {(
          [
            ["page", "Page", "edit"],
            ["film", "Film", "celebration"],
            ["rsvp", "RSVP & card", "qr_code_scanner"],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors sm:px-5 ${
              tab === id
                ? "bg-burgundy text-ivory shadow-sm"
                : "text-label-2 hover:text-burgundy"
            }`}
          >
            <Icon name={icon} size={15} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {tab === "page" && (
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-5 text-[13px] font-semibold text-ivory shadow-sm transition-opacity disabled:opacity-50"
          >
            <Icon
              name={isSaving ? "refresh" : "check"}
              className={isSaving ? "animate-spin" : ""}
              size={16}
            />
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}

      {tab === "page" && saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <Icon name="check_circle" className="text-sm text-emerald-600" />
          <span>Celebration page updates saved successfully.</span>
        </div>
      )}

      {tab === "page" && errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
          <Icon name="error" className="text-sm text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {tab === "rsvp" && (
        <RsvpStudio
          eventId={event.id}
          initialQuestions={readQuestions(event.rsvp_questions)}
          initialRequireCard={event.require_access_card}
          replies={replies}
          sealPlaced={sealPlaced}
          invitationsHref={`/events/${event.id}/invitations`}
        />
      )}

      {tab === "film" && (
        <FilmStudio
          eventId={event.id}
          initial={readFilmDesign(event.film_design)}
          initialLive={event.invitation_live}
          slug={event.slug}
          event={{
            couple: event.couple,
            title: event.title,
            date: event.date,
            venue: event.venue,
            area: event.area,
            dressCode: event.dress_code,
            rsvpBy: event.rsvp_by,
            theme: event.invitation_theme,
            headline: event.invitation_headline,
            subheadline: event.invitation_subheadline,
            message: event.invitation_message,
          }}
        />
      )}

      {/* Editor Grid: Controls on Left, Live Viewport on Right */}
      {tab === "page" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5">
            <EditorControlsForm
              eventId={event.id}
              data={formData}
              onChange={handleFieldChange}
              watDate={watDateInput}
              onChangeWatDate={handleWatDateChange}
              watRsvpBy={watRsvpByInput}
              onChangeWatRsvpBy={handleWatRsvpByChange}
              disabled={isSaving}
            />
          </div>
          <div className="lg:col-span-7">
            <LivePagePreview data={previewData} />
          </div>
        </div>
      )}
    </div>
  );
}

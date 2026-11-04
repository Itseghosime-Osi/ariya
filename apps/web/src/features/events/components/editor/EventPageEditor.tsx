"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { updateEventAction } from "@/features/events/actions";
import type { Event } from "@/features/events/types";
import { formatWatDatetimeLocal, parseWatDateToUtc } from "@/lib/format";
import { EditorControlsForm } from "./EditorControlsForm";
import { LivePagePreview, type LivePreviewData } from "./LivePagePreview";

interface EventPageEditorProps {
  event: Event;
}

export function EventPageEditor({ event }: EventPageEditorProps) {
  const router = useRouter();

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
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30">
        <div>
          <h1 className="font-serif text-2xl text-wine font-medium">
            Event Page Editor
          </h1>
          <p className="text-xs text-on-surface-variant">
            Live preview and publication controls for the public event page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/e/${event.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-wine/30 text-wine hover:bg-wine/5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>View Public Page</span>
            <Icon name="arrow_forward" className="text-sm" />
          </Link>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-wine hover:bg-wine/90 text-ivory text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Icon
              name={isSaving ? "refresh" : "check"}
              className={`text-sm ${isSaving ? "animate-spin" : ""}`}
            />
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <Icon name="check_circle" className="text-sm text-emerald-600" />
          <span>Celebration page updates saved successfully.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
          <Icon name="error" className="text-sm text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Editor Grid: Controls on Left, Live Viewport on Right */}
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
    </div>
  );
}

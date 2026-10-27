"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { updateEventAction } from "@/features/events/actions";
import type { Event } from "@/features/events/types";
import { EditorControlsForm } from "./EditorControlsForm";
import { LivePagePreview, type LivePreviewData } from "./LivePagePreview";

interface EventPageEditorProps {
  event: Event;
}

export function EventPageEditor({ event }: EventPageEditorProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<LivePreviewData>({
    title: event.title || "",
    couple: event.couple || "",
    date: event.date || "",
    venue: event.venue || "",
    area: event.area || "",
    dressCode: event.dress_code || "",
    rsvpBy: event.rsvp_by || "",
    status: event.status || "draft",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFieldChange = (field: keyof LivePreviewData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setErrorMsg(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    const res = await updateEventAction(event.id, {
      title: formData.title,
      couple: formData.couple,
      date: formData.date,
      venue: formData.venue,
      area: formData.area || undefined,
      dressCode: formData.dressCode || undefined,
      rsvpBy: formData.rsvpBy || undefined,
      status: formData.status as "draft" | "active" | "archived",
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
            Live preview and publication controls for the public celebration
            portal.
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
            <Icon name="open_in_new" className="text-sm" />
          </Link>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-wine hover:bg-wine/90 text-ivory text-xs font-semibold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Icon
              name={isSaving ? "refresh" : "save"}
              className={`text-sm ${isSaving ? "animate-spin" : ""}`}
            />
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <Icon name="check_circle" className="text-base text-emerald-600" />
          <span>
            Celebration page parameters successfully saved and synchronized.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <Icon name="error" className="text-base text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Editor Split Layout: Controls Left, Live Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5">
          <EditorControlsForm
            data={formData}
            onChange={handleFieldChange}
            disabled={isSaving}
          />
        </div>
        <div className="lg:col-span-7">
          <LivePagePreview data={formData} />
        </div>
      </div>
    </div>
  );
}

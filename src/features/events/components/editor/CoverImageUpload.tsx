"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import {
  uploadEventCoverAction,
  removeEventCoverAction,
} from "@/features/events/cover-actions";
import { isValidCoverImageUrl } from "@/features/events/cover-image";

interface CoverImageUploadProps {
  eventId: string;
  coverImageUrl?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function CoverImageUpload({
  eventId,
  coverImageUrl,
  onChange,
  disabled = false,
}: CoverImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasValidCover = isValidCoverImageUrl(coverImageUrl);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("Please select a JPEG, PNG, or WebP image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image exceeds maximum allowed size of 5 MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    const res = await uploadEventCoverAction(eventId, formData);
    setUploading(false);

    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!res.ok) {
      setErrorMsg(res.error);
    } else {
      onChange(res.url);
    }
  };

  const handleRemove = async () => {
    setErrorMsg(null);
    setUploading(true);
    const res = await removeEventCoverAction(eventId);
    setUploading(false);

    if (!res.ok) {
      setErrorMsg(res.error);
    } else {
      onChange("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
        Celebration Cover Banner
      </label>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
          <Icon name="error" className="text-sm" />
          <span>{errorMsg}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="hidden"
      />

      {hasValidCover && coverImageUrl ? (
        <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/30">
              <Image
                src={coverImageUrl}
                alt="Event cover banner preview"
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-night truncate">
                Cover Banner Uploaded
              </p>
              <p className="text-[11px] text-on-surface-variant truncate">
                Stored in project Supabase event-covers bucket
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg border border-outline-variant text-xs font-semibold text-wine hover:bg-wine/5 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Uploading..." : "Replace"}
            </button>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={handleRemove}
              className="px-3 py-1.5 rounded-lg border border-error/30 text-xs font-semibold text-error hover:bg-error/5 disabled:opacity-50 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            if (!disabled && !uploading) fileInputRef.current?.click();
          }}
          className={`p-6 rounded-xl border-2 border-dashed border-outline-variant/60 bg-white hover:bg-surface-container-low transition-colors cursor-pointer text-center space-y-1.5 ${
            uploading ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          <Icon name="upload" className="text-2xl text-wine mx-auto block" />
          <p className="text-xs font-semibold text-wine">
            {uploading
              ? "Uploading Cover..."
              : "Click to upload celebration banner"}
          </p>
          <p className="text-[11px] text-on-surface-variant">
            JPEG, PNG, or WebP • Max file size 5 MB
          </p>
        </div>
      )}
    </div>
  );
}

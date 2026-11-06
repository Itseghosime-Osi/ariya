"use client";

import React, { useState } from "react";
import { formatEventDate, daysUntil } from "@/lib/format";
import { Icon } from "@/components/ui/icon";

export interface LivePreviewData {
  title: string;
  couple: string;
  date: string;
  venue: string;
  area: string;
  dressCode: string;
  rsvpBy: string;
  status: string;
  isPublic: boolean;
  slug?: string;
  description?: string;
  coverImageUrl?: string;
}

interface LivePagePreviewProps {
  data: LivePreviewData;
}

export function LivePagePreview({ data }: LivePagePreviewProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const daysLeft = data.date ? daysUntil(data.date) : 0;
  const formattedEventDate = data.date ? formatEventDate(data.date) : "TBD";

  return (
    <div className="space-y-4">
      {/* Viewport Toolbar */}
      <div className="flex items-center justify-between rounded-2xl border border-hairline bg-white/40 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              data.isPublic ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span className="text-xs font-semibold text-wine tracking-wide uppercase">
            {data.isPublic
              ? "Public Guest Page Active"
              : "Public Page Private (404)"}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-hairline p-1">
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            className={`min-h-9 px-3 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              viewport === "desktop"
                ? "bg-burgundy text-ivory shadow-sm"
                : "text-label-2 hover:text-burgundy"
            }`}
          >
            <Icon name="space_dashboard" className="text-sm" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport("mobile")}
            className={`min-h-9 px-3 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              viewport === "mobile"
                ? "bg-burgundy text-ivory shadow-sm"
                : "text-label-2 hover:text-burgundy"
            }`}
          >
            <Icon name="qr_code_scanner" className="text-sm" />
            <span>Mobile (390px)</span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex min-h-[500px] justify-center rounded-3xl border border-hairline bg-white/30 p-4 backdrop-blur-sm sm:p-6">
        <div
          className={`w-full transition-all duration-300 ${
            viewport === "mobile" ? "max-w-[390px]" : "max-w-2xl"
          }`}
        >
          <div className="relative space-y-6 overflow-hidden rounded-3xl border border-hairline bg-ivory p-6 shadow-[0_24px_48px_-28px_rgba(42,10,20,0.45)] sm:p-8">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-burgundy via-gold to-burgundy" />

            <div className="text-center space-y-3 pt-2">
              <span className="inline-block rounded-full bg-burgundy/10 px-3 py-1 text-xs font-semibold text-burgundy">
                {daysLeft > 0 ? `${daysLeft} Days Away` : "Celebration Day"}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-wine font-medium leading-tight">
                {data.title || "Wedding Celebration"}
              </h2>
              <p className="font-serif text-lg italic text-wine/90">
                The Celebration of {data.couple || "Bride & Groom"}
              </p>
            </div>

            <hr className="border-hairline" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
                  Date &amp; Time
                </span>
                <p className="font-medium text-night text-sm">
                  {formattedEventDate}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
                  Venue
                </span>
                <p className="font-medium text-night text-sm">
                  {data.venue || "TBD"}
                </p>
                {data.area && <p className="text-wine/80">{data.area}</p>}
              </div>
            </div>

            {data.description && (
              <div className="rounded-2xl border border-hairline p-3 text-center text-xs italic text-night/80">
                &ldquo;{data.description}&rdquo;
              </div>
            )}

            {data.dressCode && (
              <div className="space-y-1 rounded-2xl border border-gold/40 bg-gold/10 p-3 text-xs">
                <span className="text-[10px] uppercase tracking-wider text-gold-ink font-bold flex items-center gap-1">
                  <Icon name="styler" className="text-xs" />
                  Attire & Palette
                </span>
                <p className="text-night">{data.dressCode}</p>
              </div>
            )}

            <div className="profile-card space-y-3 rounded-3xl p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f3d98f]">
                Personal invitation access
              </p>
              <div className="flex gap-2">
                <div className="flex-1 rounded-full bg-white/10 px-4 py-2.5 text-left font-mono text-xs text-[#f4e8cc]/80">
                  Enter pass code...
                </div>
                <div className="rounded-full bg-gradient-to-br from-[#f6e2ad] to-[#d4a85a] px-4 py-2.5 text-xs font-semibold text-night">
                  Access pass
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

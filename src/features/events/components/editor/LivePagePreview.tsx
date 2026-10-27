"use client";

import React, { useState } from "react";
import { formatLagosDate, formatLagosTime, daysUntil } from "@/lib/format";
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
}

interface LivePagePreviewProps {
  data: LivePreviewData;
}

export function LivePagePreview({ data }: LivePagePreviewProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const daysLeft = data.date ? daysUntil(data.date) : 0;
  const formattedDate = data.date ? formatLagosDate(data.date) : "TBD";
  const formattedTime = data.date ? formatLagosTime(data.date) : "TBD";

  return (
    <div className="space-y-4">
      {/* Viewport Toolbar */}
      <div className="flex items-center justify-between bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant/30">
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
        <div className="flex items-center bg-surface-container-high p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              viewport === "desktop"
                ? "bg-white text-wine shadow-sm"
                : "text-on-surface-variant hover:text-wine"
            }`}
          >
            <Icon name="desktop_windows" className="text-sm" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport("mobile")}
            className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
              viewport === "mobile"
                ? "bg-white text-wine shadow-sm"
                : "text-on-surface-variant hover:text-wine"
            }`}
          >
            <Icon name="smartphone" className="text-sm" />
            <span>Mobile (390px)</span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center bg-surface-container-lowest/60 border border-outline-variant/40 rounded-2xl p-4 sm:p-6 min-h-[500px]">
        <div
          className={`w-full transition-all duration-300 ${
            viewport === "mobile" ? "max-w-[390px]" : "max-w-2xl"
          }`}
        >
          <div className="bg-[#fcfaf7] border border-[#e8dfcf] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-wine via-gold to-wine" />

            <div className="text-center space-y-3 pt-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-wine/10 text-wine">
                {daysLeft > 0 ? `${daysLeft} Days Away` : "Celebration Day"}
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-wine font-medium leading-tight">
                {data.title || "The Nuptials of the Century"}
              </h2>
              <p className="font-serif text-lg italic text-wine/90">
                The Nuptials of {data.couple || "Bride & Groom"}
              </p>
            </div>

            <hr className="border-[#e8dfcf]" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-wine/70 font-semibold block">
                  Date & Ceremony
                </span>
                <p className="font-medium text-night text-sm">
                  {formattedDate}
                </p>
                <p className="text-wine/80">{formattedTime}</p>
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

            {data.dressCode && (
              <div className="bg-wine/5 rounded-xl p-3 border border-wine/10 space-y-1 text-xs">
                <span className="text-[10px] uppercase tracking-wider text-wine font-bold block flex items-center gap-1">
                  <Icon name="palette" className="text-xs" />
                  Attire & Palette
                </span>
                <p className="text-night">{data.dressCode}</p>
              </div>
            )}

            <div className="bg-[#f5ede0] rounded-xl p-4 border border-[#e0d3be] space-y-2 text-center">
              <p className="text-xs font-medium text-wine">
                Personal Invitation Access
              </p>
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-white border border-wine/20 text-xs text-neutral-400 font-mono text-left">
                  Enter pass code...
                </div>
                <div className="px-3 py-2 rounded-lg bg-wine text-ivory text-xs font-semibold">
                  Access
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

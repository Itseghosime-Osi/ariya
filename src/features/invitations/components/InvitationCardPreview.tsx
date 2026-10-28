import React from "react";
import { Icon } from "@/components/ui/icon";
import { formatEventDate } from "@/lib/format";
import type { InvitationDesign } from "../types";

interface InvitationCardPreviewProps {
  coupleName: string;
  eventDate: string;
  venueName: string;
  design: InvitationDesign;
}

const THEME_STYLES: Record<
  InvitationDesign["theme"],
  {
    bg: string;
    border: string;
    textTitle: string;
    textBody: string;
    accent: string;
  }
> = {
  royal_gold: {
    bg: "bg-linear-to-b from-[#1C070D] via-[#2A0E17] to-[#120307]",
    border: "border-amber-400/40",
    textTitle: "text-amber-200",
    textBody: "text-amber-100",
    accent: "text-amber-300",
  },
  emerald_regal: {
    bg: "bg-linear-to-b from-[#062419] via-[#0B3B2B] to-[#041A12]",
    border: "border-emerald-400/40",
    textTitle: "text-emerald-200",
    textBody: "text-emerald-100",
    accent: "text-emerald-300",
  },
  sunset_asoebi: {
    bg: "bg-linear-to-b from-[#3D1405] via-[#5C230C] to-[#260C03]",
    border: "border-orange-400/40",
    textTitle: "text-orange-200",
    textBody: "text-orange-100",
    accent: "text-orange-300",
  },
  monochrome_velvet: {
    bg: "bg-linear-to-b from-[#18181B] via-[#27272A] to-[#09090B]",
    border: "border-stone-400/40",
    textTitle: "text-stone-100",
    textBody: "text-stone-100",
    accent: "text-stone-300",
  },
};

export function InvitationCardPreview({
  coupleName,
  eventDate,
  venueName,
  design,
}: InvitationCardPreviewProps) {
  const styles = THEME_STYLES[design.theme] || THEME_STYLES.royal_gold;

  return (
    <div className="relative mx-auto max-w-sm rounded-3xl p-1 shadow-2xl transition-all">
      <div
        className={`relative overflow-hidden rounded-[22px] border ${styles.border} ${styles.bg} p-8 text-center space-y-6 shadow-inner`}
      >
        {/* Subtle decorative crest */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full border border-current/20 flex items-center justify-center text-ivory">
            <Icon name="celebration" className={`text-2xl ${styles.accent}`} />
          </div>
        </div>

        <div className="space-y-2">
          <span
            className={`text-[10px] uppercase font-bold tracking-[0.25em] ${styles.accent}`}
          >
            The Celebration
          </span>
          <h2
            className={`font-serif text-3xl font-bold tracking-tight leading-tight ${styles.textTitle}`}
          >
            {design.headline || coupleName}
          </h2>
          <p className={`text-xs italic ${styles.textBody}`}>
            {design.subheadline}
          </p>
        </div>

        <div className="border-y border-white/10 py-4 space-y-2">
          <div className="text-xs uppercase tracking-wider text-ivory font-semibold">
            {formatEventDate(eventDate)}
          </div>
          <div className={`text-sm font-medium ${styles.textTitle}`}>
            {venueName}
          </div>
        </div>

        {design.attireNote && (
          <div className="text-[11px] text-ivory bg-white/10 rounded-xl p-2.5 border border-white/10">
            <span className="font-semibold text-ivory block mb-0.5">
              Dress Code & Aso-Ebi
            </span>
            {design.attireNote}
          </div>
        )}

        {design.customMessage && (
          <p className="text-[11px] italic text-ivory/90">
            &ldquo;{design.customMessage}&rdquo;
          </p>
        )}

        <div className="pt-2">
          <div className="inline-block px-5 py-2 rounded-xl bg-ivory text-night font-bold text-xs uppercase tracking-wider shadow">
            Your guest pass
          </div>
        </div>
      </div>
    </div>
  );
}

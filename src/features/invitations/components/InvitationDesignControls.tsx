"use client";

import React, { useTransition } from "react";
import { Icon } from "@/components/ui/icon";
import { updateInvitationDesignAction } from "../actions";
import type { InvitationDesign, InvitationTheme } from "../types";

interface InvitationDesignControlsProps {
  eventId: string;
  design: InvitationDesign;
  onDesignChange: (updated: InvitationDesign) => void;
}

const THEME_OPTIONS: {
  value: InvitationTheme;
  label: string;
  color: string;
}[] = [
  {
    value: "royal_gold",
    label: "Royal Gold",
    color: "bg-[#2A0E17] border-amber-400",
  },
  {
    value: "emerald_regal",
    label: "Emerald Regal",
    color: "bg-[#0B3B2B] border-emerald-400",
  },
  {
    value: "sunset_asoebi",
    label: "Sunset Aso-Ebi",
    color: "bg-[#5C230C] border-orange-400",
  },
  {
    value: "monochrome_velvet",
    label: "Velvet Onyx",
    color: "bg-[#27272A] border-stone-400",
  },
];

export function InvitationDesignControls({
  eventId,
  design,
  onDesignChange,
}: InvitationDesignControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = React.useState(false);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateInvitationDesignAction(eventId, formData);
      if (res?.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    });
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/40">
        <h3 className="font-serif text-lg font-bold text-night">
          Invitation design
        </h3>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs text-emerald-700 font-semibold">
              Saved successfully!
            </span>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-1.5 rounded-xl bg-wine text-ivory text-xs font-semibold hover:bg-wine/90 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending ? (
              <Icon name="progress_activity" className="animate-spin text-sm" />
            ) : (
              <Icon name="save" className="text-sm" />
            )}
            <span>Save Design</span>
          </button>
        </div>
      </div>

      {/* Theme selection */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-wine/80 block">
          Visual Palette & Theme
        </label>
        <div className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onDesignChange({ ...design, theme: opt.value })}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                design.theme === opt.value
                  ? "border-wine bg-wine/5 text-wine shadow-xs"
                  : "border-outline-variant/60 text-night hover:border-wine/40"
              }`}
            >
              <span className={`w-4 h-4 rounded-full border ${opt.color}`} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
        <input type="hidden" name="theme" value={design.theme} />
      </div>

      {/* Headline */}
      <div className="space-y-1">
        <label
          htmlFor="headline"
          className="text-xs font-semibold uppercase tracking-wider text-wine/80 block"
        >
          Headline
        </label>
        <input
          id="headline"
          name="headline"
          defaultValue={design.headline}
          onChange={(e) =>
            onDesignChange({ ...design, headline: e.target.value })
          }
          className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-xs focus:ring-2 focus:ring-wine/40"
        />
      </div>

      {/* Subheadline */}
      <div className="space-y-1">
        <label
          htmlFor="subheadline"
          className="text-xs font-semibold uppercase tracking-wider text-wine/80 block"
        >
          Invitation Salutation
        </label>
        <input
          id="subheadline"
          name="subheadline"
          defaultValue={design.subheadline}
          onChange={(e) =>
            onDesignChange({ ...design, subheadline: e.target.value })
          }
          className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-xs focus:ring-2 focus:ring-wine/40"
        />
      </div>

      {/* Dress code note */}
      <div className="space-y-1">
        <label
          htmlFor="attireNote"
          className="text-xs font-semibold uppercase tracking-wider text-wine/80 block"
        >
          Dress Code / Aso-Ebi Note
        </label>
        <input
          id="attireNote"
          name="attireNote"
          defaultValue={design.attireNote}
          onChange={(e) =>
            onDesignChange({ ...design, attireNote: e.target.value })
          }
          className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-xs focus:ring-2 focus:ring-wine/40"
        />
      </div>

      {/* Custom Message */}
      <div className="space-y-1">
        <label
          htmlFor="customMessage"
          className="text-xs font-semibold uppercase tracking-wider text-wine/80 block"
        >
          Reception & Banquet Note
        </label>
        <textarea
          id="customMessage"
          name="customMessage"
          rows={2}
          defaultValue={design.customMessage}
          onChange={(e) =>
            onDesignChange({ ...design, customMessage: e.target.value })
          }
          className="w-full px-3 py-2 rounded-xl border border-outline-variant/60 text-xs focus:ring-2 focus:ring-wine/40 resize-none"
        />
      </div>
    </form>
  );
}

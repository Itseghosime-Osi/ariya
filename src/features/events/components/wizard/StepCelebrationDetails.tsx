"use client";

import React from "react";
import { Icon } from "@/components/ui/icon";

interface StepCelebrationDetailsProps {
  couple: string;
  setCouple: (val: string) => void;
  title: string;
  setTitle: (val: string) => void;
  date: string;
  setDate: (val: string) => void;
  area: string;
  setArea: (val: string) => void;
  venue: string;
  setVenue: (val: string) => void;
  dressCode: string;
  setDressCode: (val: string) => void;
  onNext: () => void;
}

export function StepCelebrationDetails({
  couple,
  setCouple,
  title,
  setTitle,
  date,
  setDate,
  area,
  setArea,
  venue,
  setVenue,
  dressCode,
  setDressCode,
  onNext,
}: StepCelebrationDetailsProps) {
  const isComplete = Boolean(couple.trim() && venue.trim());

  return (
    <section className="bg-surface-container-low rounded-xl p-6 sm:p-8 shadow-sm border border-surface-container-high">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-wine/10 text-wine flex items-center justify-center font-headline-sm text-headline-sm font-bold">
          I
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-wine tracking-tight">
            Stage 1: Celebration Details
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Date and time, couple names, and venue.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Couple */}
        <div className="md:col-span-2 bg-surface-container-lowest p-4 rounded-xl shadow-xs">
          <label
            className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
            htmlFor="couple"
          >
            Couple *
          </label>
          <input
            id="couple"
            type="text"
            className="w-full bg-paper px-4 py-3 rounded-xl font-headline-sm text-headline-sm text-paper-ink shadow-inner outline-none focus:bg-white"
            placeholder="e.g. Chidinma & Tunde"
            value={couple}
            onChange={(e) => setCouple(e.target.value)}
            required
          />
        </div>

        {/* Title */}
        <div className="md:col-span-2 bg-surface-container-lowest p-4 rounded-xl shadow-xs">
          <label
            className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
            htmlFor="title"
          >
            Celebration Title
          </label>
          <input
            id="title"
            type="text"
            className="w-full bg-paper px-4 py-3 rounded-xl font-body-lg text-body-lg text-paper-ink shadow-inner outline-none focus:bg-white"
            placeholder={
              couple ? `${couple}'s Wedding` : "e.g. Chidinma & Tunde's Wedding"
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Date & Time */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs">
          <label
            className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
            htmlFor="eventDate"
          >
            Date &amp; Time (WAT) *
          </label>
          <input
            id="eventDate"
            type="datetime-local"
            className="w-full bg-paper px-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner outline-none focus:bg-white"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <span className="font-body-sm text-body-sm text-mist block mt-1">
            Times displayed in Africa/Lagos (West Africa Time)
          </span>
        </div>

        {/* Area / District */}
        <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs">
          <label
            className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
            htmlFor="area"
          >
            District / Zone
          </label>
          <input
            id="area"
            type="text"
            className="w-full bg-paper px-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner outline-none focus:bg-white"
            placeholder="e.g. Victoria Island, Lagos"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>

        {/* Primary Venue */}
        <div className="md:col-span-2 bg-surface-container-lowest p-4 rounded-xl shadow-xs">
          <label
            className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
            htmlFor="venue"
          >
            Venue *
          </label>
          <input
            id="venue"
            type="text"
            className="w-full bg-paper px-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner outline-none focus:bg-white"
            placeholder="e.g. The Grand Pavilion, Plot 14 Water Corporation Dr"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
          />
        </div>

        {/* Dress Code / Aṣọ-Ẹbí */}
        <div className="md:col-span-2 bg-surface-container-lowest p-4 rounded-xl shadow-xs">
          <label
            className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1.5 font-semibold"
            htmlFor="dressCode"
          >
            Aṣọ-Ẹbí &amp; Dress Code
          </label>
          <input
            id="dressCode"
            type="text"
            className="w-full bg-paper px-4 py-3 rounded-xl font-body-md text-body-md text-paper-ink shadow-inner outline-none focus:bg-white"
            placeholder="e.g. Aṣọ-Ẹbí: Burgundy velvet and champagne gold"
            value={dressCode}
            onChange={(e) => setDressCode(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={!isComplete}
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-wine hover:bg-night text-ivory font-label-lg text-label-lg flex items-center gap-2 shadow-md transition-all disabled:opacity-50 min-h-[44px]"
        >
          <span>Continue to Guest Registry Setup</span>
          <Icon name="arrow_forward" className="text-base" />
        </button>
      </div>
    </section>
  );
}

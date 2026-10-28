"use client";

import React from "react";
import { Icon, type IconName } from "@/components/ui/icon";

interface StepGuestIntakeProps {
  intakeMethod: "csv" | "manual" | "skip";
  setIntakeMethod: (method: "csv" | "manual" | "skip") => void;
  targetParties: number;
  setTargetParties: React.Dispatch<React.SetStateAction<number>>;
  venue: string;
  onPrev: () => void;
  onNext: () => void;
}

const INTAKE_OPTIONS: {
  key: "csv" | "manual" | "skip";
  icon: IconName;
  title: string;
  desc: string;
  footer: string;
}[] = [
  {
    key: "csv" as const,
    icon: "table_chart_view",
    title: "Upload CSV Spreadsheet",
    desc: "Upload an existing guest list spreadsheet.",
    footer: "Import via Guestbook next",
  },
  {
    key: "manual" as const,
    icon: "diversity_3",
    title: "Add Guests Manually",
    desc: "Enter guest details individually.",
    footer: "Direct web input",
  },
  {
    key: "skip" as const,
    icon: "arrow_forward",
    title: "Skip for Now",
    desc: "Set target capacity and add guests later.",
    footer: "Start with blank list",
  },
];

export function StepGuestIntake({
  intakeMethod,
  setIntakeMethod,
  targetParties,
  setTargetParties,
  venue,
  onPrev,
  onNext,
}: StepGuestIntakeProps) {
  return (
    <section className="bg-surface-container-low rounded-xl p-6 sm:p-8 shadow-sm border border-surface-container-high">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-wine/10 text-wine flex items-center justify-center font-headline-sm text-headline-sm font-bold">
          II
        </div>
        <div>
          <h2 className="font-headline-sm text-headline-sm text-wine tracking-tight">
            Stage 2: Guest Registry Setup
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            How will you add guests? Choose your preferred method.
          </p>
        </div>
      </div>

      {/* 3 Method Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {INTAKE_OPTIONS.map((opt) => {
          const isActive = intakeMethod === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setIntakeMethod(opt.key)}
              className={`rounded-xl p-5 text-left transition-all flex flex-col justify-between ${
                isActive
                  ? "bg-surface-container-lowest shadow-md ring-2 ring-gold"
                  : "bg-surface-container hover:bg-surface-container-lowest"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-gold/20 text-secondary flex items-center justify-center">
                    <Icon name={opt.icon} className="text-xl text-wine" />
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-wine text-ivory font-label-sm text-label-sm font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <h3 className="font-title-lg text-title-lg text-paper-ink mb-1 font-semibold">
                  {opt.title}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">
                  {opt.desc}
                </p>
              </div>
              <div className="bg-surface-container p-3 rounded-lg flex items-center gap-2 text-wine font-label-sm font-semibold">
                <Icon name="upload" className="text-base" />
                <span>{opt.footer}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Capacity Stepper */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5">
            <label className="block font-label-md text-label-md text-secondary uppercase tracking-wider mb-1 font-semibold">
              Seats per guest • Estimated Parties
            </label>
            <div className="flex items-center gap-4 mt-2">
              <button
                type="button"
                onClick={() =>
                  setTargetParties((prev) => Math.max(10, prev - 10))
                }
                className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-paper-ink hover:bg-surface-container-high transition-colors"
              >
                <Icon name="close" className="text-lg" />
              </button>
              <div className="px-6 py-2 bg-surface rounded-lg text-center shadow-xs">
                <span className="font-headline-md text-headline-md text-wine font-bold">
                  {targetParties}
                </span>
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Invited Parties
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTargetParties((prev) => prev + 10)}
                className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-paper-ink hover:bg-surface-container-high transition-colors"
              >
                <Icon name="add_circle" className="text-lg" />
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              Estimated calculation:{" "}
              <strong>{targetParties * 2} attendees</strong> (avg. 2 pax /
              envelope).
            </p>
          </div>

          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="flex justify-between items-center text-body-sm font-body-sm">
              <span className="text-paper-ink font-semibold">
                {venue || "Reception Pavilion"} Seating Allocation
              </span>
              <span className="text-wine font-bold">
                {targetParties * 2} Capacity
              </span>
            </div>
            <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-wine rounded-full w-4/5" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2.5 rounded-lg bg-surface-container text-paper-ink hover:bg-surface-variant transition-colors font-label-md min-h-[44px]"
        >
          Previous Step
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-wine hover:bg-night text-ivory font-label-lg text-label-lg flex items-center gap-2 shadow-md transition-all min-h-[44px]"
        >
          <span>Continue to Review</span>
          <Icon name="arrow_forward" className="text-base" />
        </button>
      </div>
    </section>
  );
}

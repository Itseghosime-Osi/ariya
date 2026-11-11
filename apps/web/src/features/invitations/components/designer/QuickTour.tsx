"use client";

import React, { useEffect, useState } from "react";

const KEY = "ariya:studio-tour-done";
const STEPS = [
  {
    title: "1. Edit the words",
    body: "Tap any text on the card, or pick it in the panel, and type your own names, date and venue.",
  },
  {
    title: "2. Move and resize",
    body: "In Pro mode, drag a layer to move it. Drag a corner handle to resize. Undo is always one tap away.",
  },
  {
    title: "3. Make it yours",
    body: "Use the Colour tab to change the palette, or add text, shapes and pictures from the tool rail.",
  },
  {
    title: "4. Export and share",
    body: "Press Export for a print PDF, a PNG or JPEG, or a backup. Press ? any time for help.",
  },
];

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

/** A skippable four-step tour, shown once and reopenable from Help (D2). Never a modal. */
export function QuickTour({
  forceOpen,
  onForceClose,
}: {
  forceOpen: boolean;
  onForceClose: () => void;
}) {
  const [auto, setAuto] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Automated browsers start with empty storage; the tour must not cover their clicks.
    if (!navigator.webdriver && !read()) setAuto(true);
  }, []);

  const open = auto || forceOpen;
  useEffect(() => {
    if (forceOpen) setStep(0);
  }, [forceOpen]);
  if (!open) return null;

  const finish = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* storage blocked: the tour simply shows again next time */
    }
    setAuto(false);
    onForceClose();
  };
  const last = step === STEPS.length - 1;

  return (
    <aside
      role="region"
      aria-label="Quick tour"
      data-testid="quick-tour"
      className="fixed bottom-[72px] left-3 z-30 w-[min(20rem,calc(100%-1.5rem))] rounded-2xl border border-hairline bg-ivory p-4 shadow-xl dark:bg-[#1a1118] dark:text-ivory sm:left-16"
    >
      <p className="font-serif text-base font-bold text-night dark:text-ivory">
        {STEPS[step].title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-label-2">
        {STEPS[step].body}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-label-2">
          {step + 1} of {STEPS.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={finish}
            className="min-h-11 rounded-full px-3 text-xs font-semibold text-label-2 hover:text-night"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => (last ? finish() : setStep(step + 1))}
            className="min-h-11 rounded-full bg-burgundy px-4 text-xs font-semibold text-ivory hover:bg-burgundy/90"
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </aside>
  );
}

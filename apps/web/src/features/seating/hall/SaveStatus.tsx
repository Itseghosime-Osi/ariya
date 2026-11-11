"use client";

import { Check, CloudOff, Loader2, RotateCw, Smartphone } from "lucide-react";
import type { SaveState } from "./useHallLayout";

/**
 * One line that always says whether the hall is safe. It sits in the workspace bar, is read out
 * politely when it changes, and turns into an alert with a Retry button when a save fails.
 */
export function SaveStatus({
  state,
  onRetry,
}: {
  state: SaveState;
  onRetry: () => void;
}) {
  if (state === "failed") {
    return (
      <span
        role="alert"
        data-testid="hall-save-status"
        data-state={state}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9e2a2b]"
      >
        <CloudOff size={12} aria-hidden="true" />
        Not saved
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-6 items-center gap-1 rounded-full bg-[#9e2a2b] px-2 text-[11px] font-semibold text-white hover:bg-[#7f2122] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9e2a2b]"
        >
          <RotateCw size={11} aria-hidden="true" />
          Retry
        </button>
      </span>
    );
  }
  const view = {
    saved: { icon: Check, text: "Saved", tone: "text-[#1f6b4a]" },
    saving: { icon: Loader2, text: "Saving…", tone: "text-label-2" },
    local: {
      icon: Smartphone,
      text: "Saved on this device only",
      tone: "text-gold-ink",
    },
    conflict: {
      icon: CloudOff,
      text: "Not saved: someone else changed this hall",
      tone: "text-[#9e2a2b]",
    },
  }[state];
  const Icon = view.icon;
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="hall-save-status"
      data-state={state}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${view.tone}`}
    >
      <Icon
        size={12}
        aria-hidden="true"
        className={
          state === "saving"
            ? "animate-spin motion-reduce:animate-none"
            : undefined
        }
      />
      {view.text}
    </span>
  );
}

/** Shown over the hall when a save was refused because someone else saved a newer one. */
export function ConflictBanner({
  onTakeTheirs,
  onKeepMine,
}: {
  onTakeTheirs: () => void;
  onKeepMine: () => void;
}) {
  return (
    <div
      role="alert"
      data-testid="hall-conflict"
      className="pointer-events-auto flex max-w-md flex-wrap items-center gap-2 rounded-2xl border border-[#9e2a2b]/30 bg-white px-4 py-3 text-sm text-night shadow-lg"
    >
      <p className="min-w-0 flex-1">
        <strong className="font-semibold">
          Someone else changed this hall.
        </strong>{" "}
        Your latest edits are not saved yet.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onTakeTheirs}
          className="min-h-11 rounded-full border border-hairline px-4 text-xs font-semibold hover:bg-ivory focus-visible:outline-2 focus-visible:outline-burgundy"
        >
          Load their version
        </button>
        <button
          type="button"
          onClick={onKeepMine}
          className="min-h-11 rounded-full bg-burgundy px-4 text-xs font-semibold text-white hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          Keep mine
        </button>
      </div>
    </div>
  );
}

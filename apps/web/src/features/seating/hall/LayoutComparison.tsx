"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Compared = "current" | "new";

const SIDES: { key: Compared; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "new", label: "New" },
];

/**
 * The rollout comparison: once a suggested layout is applied, the host can flip between the
 * layout they had and the new one before settling. Flipping is a view change, not an edit, so it
 * leaves the undo history alone; "Keep this" settles on whichever is showing.
 */
export function LayoutComparison({
  showing,
  onShow,
  onKeep,
}: {
  showing: Compared;
  onShow: (which: Compared) => void;
  onKeep: (which: Compared) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Compare the current and new layouts"
      className="pointer-events-auto flex items-center gap-1 rounded-full border border-black/[0.06] bg-white/95 p-1 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_10px_30px_-12px_rgba(28,7,13,0.35)] backdrop-blur"
    >
      <span className="pl-2 pr-1 text-[11px] font-semibold text-label-2">
        Compare
      </span>
      {SIDES.map((side) => (
        <button
          key={side.key}
          type="button"
          aria-pressed={showing === side.key}
          onClick={() => onShow(side.key)}
          className={cn(
            "min-h-8 rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy",
            showing === side.key
              ? "bg-night text-white"
              : "text-night hover:bg-black/[0.04]"
          )}
        >
          {side.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onKeep(showing)}
        className="ml-1 inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#9e2a2b] px-3 text-xs font-semibold text-white hover:bg-[#82211f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      >
        <Check size={14} /> Keep this
      </button>
    </div>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import type { InvitationDesign } from "../../types";

interface HistoryPanelProps {
  dark?: boolean;
  past: InvitationDesign[];
  present: InvitationDesign;
  future: InvitationDesign[];
  onUndo: () => void;
  onRedo: () => void;
  onRestoreState: (target: InvitationDesign) => void;
}

export function HistoryPanel({
  dark,
  past,
  present,
  future,
  onUndo,
  onRedo,
  onRestoreState,
}: HistoryPanelProps) {
  // Combine all steps into a unified timeline:
  // past entries + current present entry + future entries
  const allEntries: {
    design: InvitationDesign;
    status: "past" | "current" | "future";
    index: number;
  }[] = [];

  past.forEach((p, i) => {
    allEntries.push({ design: p, status: "past", index: i });
  });

  allEntries.push({ design: present, status: "current", index: past.length });

  future.forEach((f, i) => {
    allEntries.push({
      design: f,
      status: "future",
      index: past.length + 1 + i,
    });
  });

  const getStepLabel = (
    d: InvitationDesign,
    idx: number,
    isInitial: boolean
  ) => {
    if (isInitial) return "Original Invitation";
    const layers = d.layers.length;
    return `State ${idx + 1} (${layers} layers)`;
  };

  return (
    <div className="flex h-full flex-col justify-between p-3 text-xs select-none">
      <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
        <div className="mb-2 flex items-center justify-between">
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              dark ? "text-zinc-400" : "text-[#7a5b67]"
            )}
          >
            Action History ({allEntries.length} steps)
          </span>
          <span
            className={cn(
              "text-[10px] font-mono",
              dark ? "text-zinc-500" : "text-zinc-400"
            )}
          >
            Max 50
          </span>
        </div>

        {allEntries.map((entry, idx) => {
          const isCurrent = entry.status === "current";
          const isPast = entry.status === "past";

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onRestoreState(entry.design)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left font-medium transition",
                isCurrent
                  ? dark
                    ? "bg-[#dfba73]/15 text-[#dfba73] ring-1 ring-[#dfba73]/40 font-bold"
                    : "bg-[#4a0e17]/10 text-[#4a0e17] ring-1 ring-[#4a0e17]/30 font-bold"
                  : isPast
                    ? dark
                      ? "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                      : "text-[#3b2b31] hover:bg-black/5"
                    : dark
                      ? "text-zinc-600 opacity-60 hover:opacity-100 hover:bg-white/[0.03]"
                      : "text-zinc-400 opacity-60 hover:opacity-100 hover:bg-black/5"
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-md text-[11px]",
                  isCurrent
                    ? dark
                      ? "bg-[#dfba73] text-[#20161b]"
                      : "bg-[#4a0e17] text-white"
                    : dark
                      ? "bg-white/[0.06] text-zinc-400"
                      : "bg-black/5 text-zinc-500"
                )}
              >
                {idx === 0 ? (
                  <Icon name="image" size={12} />
                ) : (
                  <Icon name="edit" size={12} />
                )}
              </span>

              <span className="truncate flex-1">
                {getStepLabel(entry.design, idx, idx === 0)}
              </span>

              {isCurrent && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#dfba73] shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Undo / Redo Footer Buttons */}
      <div className="flex items-center gap-2 border-t border-hairline pt-3 mt-2">
        <button
          type="button"
          disabled={past.length === 0}
          onClick={onUndo}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold disabled:opacity-30 transition",
            dark
              ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
              : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
          )}
        >
          <Icon name="undo" size={14} />
          Undo (⌘Z)
        </button>

        <button
          type="button"
          disabled={future.length === 0}
          onClick={onRedo}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold disabled:opacity-30 transition",
            dark
              ? "border-white/12 bg-white/[0.06] text-[#fff6dc] hover:bg-white/[0.12]"
              : "border-[#e8e2d6] bg-white text-[#4a0e17] hover:bg-[#f6f2ec] shadow-xs"
          )}
        >
          <Icon name="redo" size={14} />
          Redo (⇧⌘Z)
        </button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import type { InvitationDesign } from "../../types";
import { describeStep } from "./history-labels";
import { VersionsSection } from "./VersionsSection";

interface HistoryPanelProps {
  dark?: boolean;
  /** With an event, named versions can be saved and restored (F3). */
  eventId?: string;
  past: InvitationDesign[];
  present: InvitationDesign;
  future: InvitationDesign[];
  onUndo: () => void;
  onRedo: () => void;
  onRestoreState: (target: InvitationDesign) => void;
}

export function HistoryPanel({
  dark,
  eventId,
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

  return (
    <div
      data-testid="history-panel"
      className="flex h-full flex-col justify-between p-3 text-xs select-none"
    >
      <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
        {eventId && (
          <VersionsSection
            eventId={eventId}
            design={present}
            dark={dark}
            onRestore={onRestoreState}
          />
        )}
        <div className="mb-2 flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
            )}
          >
            Action History ({allEntries.length} steps)
          </span>
          <span
            className={cn(
              "text-xs font-mono",
              dark ? "text-zinc-400" : "text-[var(--studio-mauve)]"
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
                    ? "bg-[var(--studio-gold)]/15 text-[var(--studio-gold)] ring-1 ring-[var(--studio-gold)]/40 font-bold"
                    : "bg-[var(--studio-wine)]/10 text-[var(--studio-wine)] ring-1 ring-[var(--studio-wine)]/30 font-bold"
                  : isPast
                    ? dark
                      ? "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                      : "text-[var(--studio-ink-2)] hover:bg-black/5"
                    : dark
                      ? "text-zinc-400 italic hover:bg-white/[0.03]"
                      : "text-[var(--studio-mauve)] italic hover:bg-black/5"
              )}
            >
              <span
                className={cn(
                  "grid h-5 w-5 place-items-center rounded-md text-xs",
                  isCurrent
                    ? dark
                      ? "bg-[var(--studio-gold)] text-[var(--studio-night)]"
                      : "bg-[var(--studio-wine)] text-white"
                    : dark
                      ? "bg-white/[0.06] text-zinc-400"
                      : "bg-black/5 text-[var(--studio-mauve)]"
                )}
              >
                {idx === 0 ? (
                  <Icon name="image" size={12} />
                ) : (
                  <Icon name="edit" size={12} />
                )}
              </span>

              <span className="truncate flex-1">
                {describeStep(
                  idx > 0 ? allEntries[idx - 1].design : null,
                  entry.design
                )}
              </span>

              {isCurrent && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--studio-gold)] shrink-0" />
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
              ? "border-white/12 bg-white/[0.06] text-[var(--studio-cream)] hover:bg-white/[0.12]"
              : "border-[var(--studio-line)] bg-white text-[var(--studio-wine)] hover:bg-[var(--studio-sand)] shadow-xs"
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
              ? "border-white/12 bg-white/[0.06] text-[var(--studio-cream)] hover:bg-white/[0.12]"
              : "border-[var(--studio-line)] bg-white text-[var(--studio-wine)] hover:bg-[var(--studio-sand)] shadow-xs"
          )}
        >
          <Icon name="redo" size={14} />
          Redo (⇧⌘Z)
        </button>
      </div>
    </div>
  );
}

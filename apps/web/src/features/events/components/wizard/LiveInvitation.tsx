"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { MonogramSeal } from "../desk/MonogramSeal";
import { TiltCard } from "../desk/TiltCard";
import { monogramOf } from "../desk/MonogramSeal";
import type { Occasion, Palette } from "./wizard-data";

export type WizardStage = "who" | "when" | "where" | "guests";

interface LiveInvitationProps {
  occasion: Occasion;
  names: string;
  /** The names as typed, so a long pair can be set on two lines. */
  parts: string[];
  dateLabel: string;
  timeLabel: string;
  venue: string;
  area: string;
  dressCode: string;
  palette: Palette;
  stage: WizardStage;
  parties: number;
  className?: string;
}

/** The line being edited glows gold, so every tap has an answer on the card. */
function Hot({
  on,
  children,
  className,
}: {
  on: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-hot={on}
      className={cn(
        "box-decoration-clone rounded-md px-1.5 transition-[background-color,box-shadow] duration-300 data-[hot=true]:bg-[#e9c98a]/35 data-[hot=true]:shadow-[0_0_0_1px_rgba(184,134,75,0.45)]",
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * The invitation as guests will hold it, built live from the choices so far: the wax seal is pressed
 * with the monogram, the aso-ebi colours dress the ribbon, and what you are editing glows.
 */
export function LiveInvitation({
  occasion,
  names,
  parts,
  dateLabel,
  timeLabel,
  venue,
  area,
  dressCode,
  palette,
  stage,
  parties,
  className,
}: LiveInvitationProps) {
  const placeholder = occasion.names === 2 ? "Your names" : "Their name";
  const shown = names.trim() || placeholder;
  const seal = names.trim() ? monogramOf(names.replace(/^the\s+/i, "")) : "À";
  // A long pair of names is set on two lines around a gold ampersand; the type shrinks to fit what is written.
  const stacked = parts.length === 2 && `${parts[0]} & ${parts[1]}`.length > 17;
  const longest = stacked
    ? Math.max(parts[0].length, parts[1].length)
    : shown.length;
  const nameSize =
    longest <= 10
      ? 1.9
      : longest <= 16
        ? 1.65
        : longest <= 24
          ? 1.4
          : longest <= 34
            ? 1.2
            : 1.05;
  const place = [venue.trim(), area.trim()].filter(Boolean).join(", ");
  const [c1, c2] = palette.colors;

  return (
    <TiltCard max={8} className={cn("w-full max-w-[340px]", className)}>
      <div
        data-testid="wizard-invitation"
        className="desk-paper relative aspect-[5/7] w-full overflow-hidden rounded-[20px] px-7 pb-6 pt-9 text-center"
      >
        <span className="foil-sheen" aria-hidden="true" />
        <div
          key={palette.key}
          aria-hidden="true"
          className="wiz-sweep absolute inset-x-0 top-0 h-3"
          style={{
            background: `linear-gradient(90deg, ${c1} 0 70%, ${c2} 70% 100%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="weave absolute inset-x-0 top-0 h-3 opacity-30 mix-blend-overlay"
        />
        <div className="relative flex h-full min-h-0 flex-col items-center">
          <div key={seal} className="wiz-stamp">
            <MonogramSeal text={seal} size={58} className="drop-shadow-md" />
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7a5612]">
            {occasion.kicker}
          </p>
          <p
            data-testid="wizard-invitation-names"
            className={cn(
              "mt-3 w-full text-balance font-display font-bold leading-[1.15] transition-[color,font-size] duration-300 [overflow-wrap:anywhere] [hyphens:auto]",
              names.trim() ? "" : "opacity-45"
            )}
            style={{ color: palette.ink, fontSize: `${nameSize}rem` }}
          >
            {stacked ? (
              <span
                key={parts.join("|")}
                className="wiz-in flex flex-col items-center"
              >
                <span className="line-clamp-2">
                  <Hot on={stage === "who"}>{parts[0]}</Hot>
                </span>
                <span
                  aria-label="and"
                  className="font-display text-[0.8em] font-normal italic text-[#8f6420]"
                >
                  &amp;
                </span>
                <span className="line-clamp-2">
                  <Hot on={stage === "who"}>{parts[1]}</Hot>
                </span>
              </span>
            ) : (
              <span className="line-clamp-4">
                <Hot on={stage === "who"}>{shown}</Hot>
              </span>
            )}
          </p>
          <p className="mt-3 max-w-[15rem] text-balance text-xs leading-relaxed text-[#4a3a30]">
            {occasion.message}
          </p>
          <div
            className="my-4 flex w-full items-center gap-3"
            aria-hidden="true"
          >
            <span className="h-px flex-1 bg-[#b8864b]/50" />
            <span className="text-[#b8864b]">✦</span>
            <span className="h-px flex-1 bg-[#b8864b]/50" />
          </div>
          <p className="text-balance text-sm font-semibold text-[#2a2118]">
            <Hot on={stage === "when"}>
              {dateLabel || "Date to be chosen"}
              {dateLabel && timeLabel ? ` · ${timeLabel}` : ""}
            </Hot>
          </p>
          <p className="mt-1.5 line-clamp-3 text-balance text-xs text-[#4a3a30] [overflow-wrap:anywhere]">
            <Hot on={stage === "where"}>{place || "Venue to be chosen"}</Hot>
          </p>
          <p className="mt-2 line-clamp-3 text-balance text-[11px] italic text-[#5a474e] [overflow-wrap:anywhere]">
            <Hot on={stage === "where"}>{dressCode}</Hot>
          </p>
          <p className="mt-auto pt-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a5612]">
            <Hot on={stage === "guests"}>
              {`Kindly reply · ${parties} invitations`}
            </Hot>
          </p>
        </div>
      </div>
    </TiltCard>
  );
}

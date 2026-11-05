"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import type { LayoutOption, ScoreTerm } from "@ariya/studio";
import { cn } from "@/lib/utils";
import { Section } from "./studio-ui";
import { optionSeats, type SuggestTable } from "./suggested-layouts";

/** A term's bar: the raw measure, coloured by whether it adds or takes away. */
function TermRow({ term }: { term: ScoreTerm }) {
  const penalty = term.weight < 0;
  const pct = Math.round(Math.max(0, Math.min(1, term.value)) * 100);
  return (
    <li className="py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold text-night">
          {term.label}
        </span>
        <span
          className={cn(
            "text-[11px] tabular-nums",
            penalty ? "text-[#7a1f20]" : "text-label-2"
          )}
        >
          {penalty ? "−" : "+"}
          {Math.abs(term.contribution).toFixed(2)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#efe7d8]">
        <div
          className={cn(
            "h-full rounded-full",
            penalty ? "bg-[#9e2a2b]" : "bg-[#b08d3f]"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] leading-snug text-label-2">
        {term.detail}
      </p>
    </li>
  );
}

function OptionCard({
  option,
  rank,
  tables,
  onChoose,
}: {
  option: LayoutOption;
  rank: number;
  tables: SuggestTable[];
  onChoose: (option: LayoutOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const seats = optionSeats(option, tables);
  const count = option.placements.length;
  const unplaced = option.unplaced.length;

  return (
    <li className="rounded-2xl border border-hairline bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-label-2">
            Option {rank}
          </p>
          <p className="font-display text-base font-bold leading-tight text-night">
            {option.archetype_label}
          </p>
          <p className="text-[11px] text-label-2">{option.strategy_label}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-bold leading-none tabular-nums text-night">
            {seats}
          </p>
          <p className="text-[11px] text-label-2">seats</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-label-2">
        {count} {count === 1 ? "table" : "tables"}
        {unplaced > 0 && (
          <span className="text-[#7a1f20]"> · {unplaced} did not fit</span>
        )}
      </p>
      <p className="mt-1 text-xs leading-snug text-night">{option.tradeoff}</p>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChoose(option)}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#9e2a2b] px-3 text-xs font-semibold text-white hover:bg-[#82211f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Check size={14} /> Use this layout
        </button>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-hairline px-3 text-xs font-semibold text-night hover:border-night/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          Why?
          <ChevronDown
            size={14}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-xl bg-[#faf6ee] p-2">
          <p className="text-[11px] font-semibold text-night">
            Score {option.score.total.toFixed(2)}
          </p>
          <ul className="mt-1 divide-y divide-hairline">
            {option.score.terms.map((term) => (
              <TermRow key={term.id} term={term} />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/**
 * The three ranked options the Rust engine returns, as cards. Each shows its seats, table count
 * and one-line trade-off; "Why?" opens the full score breakdown, and "Use this layout" applies it.
 */
export function SuggestedLayouts({
  options,
  tables,
  onChoose,
  onClose,
}: {
  options: LayoutOption[];
  tables: SuggestTable[];
  onChoose: (option: LayoutOption) => void;
  onClose: () => void;
}) {
  return (
    <Section
      title="Three ways to lay out the hall"
      aside={
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] font-semibold text-label-2 hover:text-night"
        >
          Close
        </button>
      }
    >
      <p className="mb-2 flex items-center gap-1.5 text-[11px] text-label-2">
        <Sparkles size={13} /> Ranked by seats, sightlines, circulation and
        service.
      </p>
      <ul className="flex flex-col gap-2">
        {options.map((option, i) => (
          <OptionCard
            key={`${option.archetype}-${option.strategy}`}
            option={option}
            rank={i + 1}
            tables={tables}
            onChoose={onChoose}
          />
        ))}
      </ul>
    </Section>
  );
}

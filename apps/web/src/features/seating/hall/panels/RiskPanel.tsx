"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Level, RiskItem, RiskReport } from "@ariya/studio";
import { addRiskToChecklistAction } from "@/features/checklist/actions";
import { dueWords, groupRisks } from "../risk";
import { Section } from "../studio-ui";

// ---------------------------------------------------------------- risk

/** How a likelihood or impact reads, from calm to alarming. */
const LEVEL_TONE: Record<Level, string> = {
  low: "border-hairline text-label-2",
  "low-medium": "border-[#b8860b]/40 text-[#8a6608]",
  medium: "border-[#b8860b] text-[#8a6608]",
  high: "border-[#b4483a] text-[#b4483a]",
};

/**
 * The risk register, grouped the way the research groups it. Safety-critical rows carry a badge
 * and their groups put them first, so a blocked exit never hides below a late cake. Every row opens
 * to the mitigation, where the advice comes from, and why the rule fired for this plan.
 */
export function RiskPanel({
  report,
  status,
  eventDate,
  eventId,
  addedRiskIds,
}: {
  report: RiskReport | null;
  status: "loading" | "ready" | "unavailable";
  eventDate: string | null;
  eventId: string;
  addedRiskIds: string[];
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, "adding" | "added">>(() =>
    Object.fromEntries(addedRiskIds.map((id) => [id, "added" as const]))
  );
  const [addError, setAddError] = useState<string | null>(null);

  const addToChecklist = useCallback(
    async (item: RiskItem) => {
      if (added[item.id]) return;
      setAddError(null);
      setAdded((a) => ({ ...a, [item.id]: "adding" }));
      const result = await addRiskToChecklistAction(eventId, {
        id: item.id,
        title: item.title,
        mitigation: item.mitigation,
        derivation: item.derivation,
        source: item.source,
        due: item.due,
      });
      if (result.error) {
        setAdded((a) => {
          const next = { ...a };
          delete next[item.id];
          return next;
        });
        setAddError(result.error);
        return;
      }
      setAdded((a) => ({ ...a, [item.id]: "added" }));
    },
    [added, eventId]
  );

  if (status !== "ready") {
    return (
      <Section title="What could go wrong">
        <p className="text-[11px] leading-snug text-label-2">
          {status === "loading"
            ? "Reading the plan for risks…"
            : "The risk register needs the layout engine, which did not load on this device. The rest of the studio still works."}
        </p>
      </Section>
    );
  }

  if (!report) {
    return (
      <Section title="What could go wrong">
        <p className="text-[11px] leading-snug text-label-2">
          Nothing to report yet — change the plan and the register follows it.
        </p>
      </Section>
    );
  }

  const groups = groupRisks(report.items);
  const safety = report.items.filter((i) => i.safetyCritical).length;

  return (
    <div>
      <Section
        title="What could go wrong"
        aside={
          <span className="text-[11px] font-semibold tabular-nums text-label-2">
            {report.items.length} to watch
          </span>
        }
      >
        <p className="text-[11px] leading-relaxed text-label-2">
          {safety > 0 ? (
            <>
              <span className="font-semibold text-night">{safety}</span> of
              these can hurt someone. The rest cost you money or the mood.
            </>
          ) : (
            "None of these can hurt someone — they are the experiential risks."
          )}{" "}
          {eventDate
            ? "Each one is dated from your event."
            : "Add the event date and each one gets a deadline."}
        </p>
        {addError && (
          <p
            role="status"
            className="mt-2 text-[11px] leading-snug text-[#b4483a]"
          >
            {addError}
          </p>
        )}
      </Section>

      {groups.map((g) => (
        <Section key={g.key} title={g.label}>
          <ul className="space-y-2">
            {g.items.map((item) => {
              const expanded = open === item.id;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-lg border",
                    item.safetyCritical
                      ? "border-[#b4483a]/50 bg-[#fdf4f2]"
                      : "border-hairline bg-white"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : item.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 w-full items-start gap-2 px-2.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {item.safetyCritical && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#b4483a] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            <AlertTriangle size={9} aria-hidden="true" /> Safety
                          </span>
                        )}
                        <span className="text-sm leading-snug text-night">
                          {item.title}
                        </span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={cn(
                            "rounded border px-1 py-px font-semibold",
                            LEVEL_TONE[item.likelihood]
                          )}
                        >
                          Likely: {levelWords(item.likelihood)}
                        </span>
                        <span
                          className={cn(
                            "rounded border px-1 py-px font-semibold",
                            LEVEL_TONE[item.impact]
                          )}
                        >
                          Impact: {levelWords(item.impact)}
                        </span>
                        <span className="font-semibold tabular-nums text-label-2">
                          {item.due ? dueWords(item.due) : item.when}
                        </span>
                      </span>
                    </span>
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={cn(
                        "mt-1 shrink-0 text-label-2 transition-transform motion-reduce:transition-none",
                        expanded && "rotate-180"
                      )}
                    />
                  </button>

                  {expanded && (
                    <div className="space-y-2 border-t border-hairline/70 px-2.5 py-2">
                      <p className="text-[11px] leading-relaxed text-night">
                        <span className="font-semibold text-label-2">
                          Do this:{" "}
                        </span>
                        {item.mitigation}
                      </p>
                      <p className="text-[11px] leading-relaxed text-label-2">
                        <span className="font-semibold">Because: </span>
                        {item.derivation}.
                      </p>
                      <p className="text-[10px] leading-snug text-label-2">
                        {item.due
                          ? `Due ${dueWords(item.due)} — ${item.when}.`
                          : `${item.when}.`}{" "}
                        Source: {item.source}.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void addToChecklist(item)}
                          disabled={Boolean(added[item.id])}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-hairline bg-ivory px-3 text-[11px] font-semibold text-night transition-colors hover:bg-white disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                        >
                          {added[item.id] === "added" ? (
                            <>
                              <Check size={12} aria-hidden="true" /> On the
                              checklist
                            </>
                          ) : added[item.id] === "adding" ? (
                            <>
                              <Loader2
                                size={12}
                                aria-hidden="true"
                                className="animate-spin motion-reduce:animate-none"
                              />
                              Adding…
                            </>
                          ) : (
                            <>
                              <Plus size={12} aria-hidden="true" /> Add to
                              checklist
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      ))}

      <Section title="How to read this">
        <div className="space-y-2.5">
          {report.notes.map((n, i) => (
            <p key={i} className="text-[11px] leading-relaxed text-label-2">
              {n}
            </p>
          ))}
        </div>
      </Section>
    </div>
  );
}

function levelWords(level: Level): string {
  return {
    low: "Low",
    "low-medium": "Low–Med",
    medium: "Med",
    high: "High",
  }[level];
}

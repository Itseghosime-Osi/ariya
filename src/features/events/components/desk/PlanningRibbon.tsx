import React from "react";
import { Icon } from "@/components/ui/icon";
import type { PlanningPhase } from "../../lib/overview-insights";

const month = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});
const span = (p: PlanningPhase, i: number) => {
  const end = new Date(`${p.end}T00:00:00Z`);
  if (i === 0) return `Until ${month.format(end)}`;
  const start = new Date(`${p.start}T00:00:00Z`);
  const a = month.format(start);
  const b = month.format(end);
  return a === b ? a : `${a} – ${b}`;
};

/**
 * The road to the day in five phases, counted back from the wedding: gold checks behind you, a pulsing
 * marker where you are, and each phase's vendor tasks done out of total. Across on wide screens, down on
 * phones.
 */
export function PlanningRibbon({ phases }: { phases: PlanningPhase[] }) {
  if (phases.length === 0) return null;
  return (
    <section
      aria-labelledby="ribbon-title"
      className="bento-card relative overflow-hidden p-6 sm:p-7"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            The road to the day
          </div>
          <h2
            id="ribbon-title"
            className="mt-1 font-display text-2xl font-bold text-night"
          >
            Planning season
          </h2>
        </div>
        <p className="text-xs text-label-2">
          Tasks come from your vendors&apos; checklists, filed by due date.
        </p>
      </div>

      <ol className="relative mt-6 grid gap-4 md:grid-cols-5 md:gap-3">
        <span
          className="absolute left-[21px] top-2 bottom-2 w-px bg-gradient-to-b from-[#c9a465] via-[#c9a465]/60 to-hairline md:left-6 md:right-6 md:top-[21px] md:bottom-auto md:h-px md:w-auto md:bg-gradient-to-r"
          aria-hidden="true"
        />
        {phases.map((p, i) => {
          const pct =
            p.tasksTotal > 0
              ? Math.round((p.tasksDone / p.tasksTotal) * 100)
              : 0;
          return (
            <li
              key={p.key}
              aria-current={p.state === "current" ? "step" : undefined}
              className="relative flex gap-4 md:flex-col md:gap-3"
            >
              <span
                className={`relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full ring-4 ring-surface ${
                  p.state === "done"
                    ? "bg-[#1c070d] text-[#e9c98a]"
                    : p.state === "current"
                      ? "desk-here bg-[#e9c98a] text-[#1c070d]"
                      : "bg-surface-container text-label-2"
                }`}
              >
                {p.state === "done" ? (
                  <Icon name="check" size={18} />
                ) : (
                  <span className="font-display text-base font-bold">
                    {i + 1}
                  </span>
                )}
              </span>
              <div
                className={`min-w-0 flex-1 rounded-2xl p-3.5 ${
                  p.state === "current"
                    ? "bg-[#1c070d] text-ivory shadow-[0_16px_30px_-18px_rgba(28,7,13,0.8)]"
                    : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-semibold ${p.state === "current" ? "text-ivory" : "text-night"}`}
                  >
                    {p.title}
                  </h3>
                  {p.state === "current" && (
                    <span className="rounded-full bg-[#e9c98a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#1c070d]">
                      You are here
                    </span>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-xs ${p.state === "current" ? "text-ivory/75" : "text-label-2"}`}
                >
                  {p.hint}
                </p>
                <div
                  className={`mt-2 flex items-center gap-2 text-xs ${p.state === "current" ? "text-ivory/85" : "text-label-2"}`}
                >
                  <Icon name="calendar" size={12} />
                  <span>{span(p, i)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {p.tasksDone}/{p.tasksTotal} tasks
                  </span>
                </div>
                {p.tasksTotal > 0 && (
                  <div
                    className={`mt-2 h-1.5 overflow-hidden rounded-full ${p.state === "current" ? "bg-ivory/15" : "bg-surface-container"}`}
                    aria-hidden="true"
                  >
                    <div
                      className="weave-fill h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

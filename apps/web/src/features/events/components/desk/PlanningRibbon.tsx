"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { Icon } from "@/components/ui/icon";
import { updateVendorTaskAction } from "@/features/vendors/actions";
import type { PlanningPhase, PlanningTask } from "../../lib/overview-insights";
import { celebrate } from "./celebrate";

const month = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  timeZone: "UTC",
});
const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const range = (p: PlanningPhase, i: number) => {
  const end = new Date(`${p.end}T00:00:00Z`);
  if (i === 0) return `Until ${month.format(end)}`;
  const a = month.format(new Date(`${p.start}T00:00:00Z`));
  const b = month.format(end);
  return a === b ? a : `${a} – ${b}`;
};

/**
 * The road to the day: five phases counted back from the wedding, a gold line drawn up to where you
 * are, and each phase opening to show its vendor tasks. Tick a task off right here; finishing a
 * phase's last task earns a little celebration.
 */
export function PlanningRibbon({
  eventId,
  phases,
}: {
  eventId: string;
  phases: PlanningPhase[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const currentIndex = Math.max(
    0,
    phases.findIndex((p) => p.state === "current")
  );
  const [selected, setSelected] = useState(currentIndex);
  // Optimistic ticks: task id -> done, until the server confirms.
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const view = useMemo(
    () =>
      phases.map((p) => {
        const tasks = p.tasks.map((t) => ({
          ...t,
          isDone: ticks[t.id] ?? t.isDone,
        }));
        return { ...p, tasks, tasksDone: tasks.filter((t) => t.isDone).length };
      }),
    [phases, ticks]
  );
  if (phases.length === 0) return null;

  const allDone = phases.every((p) => p.state === "done");
  const reach = allDone ? 1 : (currentIndex + 0.5) / phases.length;
  const phase = view[selected];

  const toggle = (task: PlanningTask) => {
    const next = !task.isDone;
    setError(null);
    setTicks((t) => ({ ...t, [task.id]: next }));
    if (next && phase.tasks.every((t) => t.id === task.id || t.isDone)) {
      void celebrate({ x: 0.5, y: 0.6 });
    }
    startTransition(async () => {
      const res = await updateVendorTaskAction(eventId, task.id, {
        is_done: next,
      });
      if (!res.ok) {
        setTicks((t) => ({ ...t, [task.id]: !next }));
        setError(res.error || "Couldn't save that. Try again.");
        return;
      }
      router.refresh();
    });
  };

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
          Choose a phase to see its tasks. Tick them off as you go.
        </p>
      </div>

      {/* The track */}
      <div className="relative mt-7">
        <div
          className="absolute left-6 right-6 top-[22px] hidden h-1 rounded-full bg-surface-container md:block"
          aria-hidden="true"
        >
          <div
            className="weave-fill h-full rounded-full transition-[width] duration-1000"
            style={{ width: `${reach * 100}%` }}
          />
        </div>
        <div
          role="tablist"
          aria-label="Planning phases"
          className="relative grid grid-cols-5 gap-1 md:gap-3"
        >
          {view.map((p, i) => {
            const on = i === selected;
            const pct =
              p.tasksTotal > 0
                ? Math.round((p.tasksDone / p.tasksTotal) * 100)
                : 0;
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                id={`phase-tab-${p.key}`}
                aria-selected={on}
                aria-controls="phase-panel"
                onClick={() => setSelected(i)}
                className="group flex flex-col items-center gap-2 rounded-2xl px-1 pb-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-burgundy"
              >
                <span
                  className={`relative z-10 grid h-11 w-11 place-items-center rounded-full ring-4 ring-surface transition-transform duration-300 group-hover:scale-110 ${
                    p.state === "done"
                      ? "bg-[#1c070d] text-[#e9c98a]"
                      : p.state === "current"
                        ? "desk-here bg-[#e9c98a] text-[#1c070d]"
                        : "bg-surface-container text-label-2"
                  } ${on ? "scale-110 shadow-[0_10px_24px_-10px_rgba(28,7,13,0.6)]" : ""}`}
                >
                  {p.state === "done" || (p.tasksTotal > 0 && pct === 100) ? (
                    <Icon name="check" size={18} />
                  ) : (
                    <span className="font-display text-base font-bold">
                      {i + 1}
                    </span>
                  )}
                </span>
                <span
                  className={`sr-only text-sm font-semibold md:not-sr-only md:block ${on ? "text-burgundy" : "text-night"}`}
                >
                  {p.title}
                </span>
                <span className="sr-only text-[11px] text-label-2 md:not-sr-only md:block">
                  {range(p, i)} · {p.tasksDone}/{p.tasksTotal}
                </span>
                <span
                  className={`h-1 w-8 rounded-full transition-colors ${on ? "bg-burgundy" : "bg-transparent"}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* The open phase */}
      <div
        id="phase-panel"
        role="tabpanel"
        aria-labelledby={`phase-tab-${phase.key}`}
        className="mt-3"
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={phase.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className={`rounded-3xl p-5 sm:p-6 ${phase.state === "current" ? "bg-[#1c070d] text-ivory" : "bg-surface-container"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-bold">{phase.title}</h3>
              {phase.state === "current" && (
                <span className="rounded-full bg-[#e9c98a] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#1c070d]">
                  You are here
                </span>
              )}
              {phase.state === "done" && (
                <span className="rounded-full bg-[#dcebe2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#1f4d36]">
                  Behind you
                </span>
              )}
              <span
                className={`ml-auto text-xs ${phase.state === "current" ? "text-ivory/75" : "text-label-2"}`}
              >
                {range(phase, selected)} · {phase.tasksDone} of{" "}
                {phase.tasksTotal} done
              </span>
            </div>
            <p
              className={`mt-1 text-sm ${phase.state === "current" ? "text-ivory/80" : "text-label-2"}`}
            >
              {phase.hint}
            </p>

            {phase.tasks.length === 0 ? (
              <div
                className={`mt-4 flex flex-wrap items-center gap-3 text-sm ${phase.state === "current" ? "text-ivory/80" : "text-label-2"}`}
              >
                <span>No vendor tasks in this phase yet.</span>
                <Link
                  href={`/events/${eventId}/vendors`}
                  className={`inline-flex items-center gap-1 font-semibold hover:underline ${phase.state === "current" ? "text-[#e9c98a]" : "text-burgundy"}`}
                >
                  Add one in Vendors <Icon name="arrow_forward" size={14} />
                </Link>
              </div>
            ) : (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {phase.tasks.map((t) => {
                  const dark = phase.state === "current";
                  return (
                    <li key={t.id}>
                      <label
                        className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5 transition-colors ${
                          dark
                            ? "bg-ivory/[0.07] hover:bg-ivory/[0.12]"
                            : "bg-ivory ring-1 ring-hairline hover:bg-surface-container-high"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={t.isDone}
                          onChange={() => toggle(t)}
                          className="peer sr-only"
                        />
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-[#e9c98a] ${
                            t.isDone
                              ? "border-[#e9c98a] bg-[#e9c98a] text-[#1c070d]"
                              : dark
                                ? "border-ivory/40"
                                : "border-[#8a6620]/50"
                          }`}
                          aria-hidden="true"
                        >
                          {t.isDone && <Icon name="check" size={14} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-sm font-semibold ${t.isDone ? "line-through opacity-60" : ""}`}
                          >
                            {t.task}
                          </span>
                          <span
                            className={`block truncate text-xs ${dark ? "text-ivory/70" : "text-label-2"}`}
                          >
                            {[
                              t.vendorName,
                              t.dueDate
                                ? `due ${dayMonth.format(new Date(`${t.dueDate}T00:00:00Z`))}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "No due date"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {error && (
              <p
                role="alert"
                className={`mt-3 text-sm font-semibold ${phase.state === "current" ? "text-[#ffb4ab]" : "text-error"}`}
              >
                {error}
              </p>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

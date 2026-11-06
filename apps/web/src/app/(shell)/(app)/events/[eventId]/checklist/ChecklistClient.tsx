"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ScreenHeader } from "@/components/layout/screen-header";
import {
  DeskItem,
  DeskMotion,
} from "@/features/events/components/desk/DeskMotion";
import { AnimatePresence, m } from "motion/react";
import {
  CalendarPlus,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { ChecklistPlan, Phase, Reconciliation } from "@ariya/studio";
import type { StudioEngine } from "@ariya/studio";
import { useStudioEngine } from "@/features/seating/hall/useStudioEngine";
import {
  deleteTaskAction,
  moveOpenToThisWeekAction,
  restoreTaskAction,
  seedChecklistAction,
  setTaskStatusAction,
} from "@/features/checklist/actions";
import {
  PHASE_LABELS,
  PHASE_ORDER,
  type ChecklistData,
  type ChecklistFilter,
  type ChecklistTask,
  type TaskStatus,
} from "@/features/checklist/types";

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const CARD = "rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm";

const FILTERS: { key: ChecklistFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "Mine" },
  { key: "waiting", label: "Waiting on" },
  { key: "week", label: "This week" },
];

const STATUS_WORDS: Record<TaskStatus, string> = {
  todo: "Not started",
  waiting: "Waiting on someone",
  done: "Done",
  skipped: "Set aside",
};

function toggle(status: TaskStatus): TaskStatus {
  return status === "done" ? "todo" : "done";
}

export function ChecklistClient({
  eventId,
  data,
  userId,
}: {
  eventId: string;
  data: ChecklistData;
  /** The signed-in viewer, so "Mine" means them and not whoever happens to be first in the member list. */
  userId: string | null;
}) {
  const { engine, status } = useStudioEngine();
  const [tasks, setTasks] = useState(data.tasks);
  const [filter, setFilter] = useState<ChecklistFilter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [showAnother, setShowAnother] = useState(0);
  const seededOnce = useRef(false);
  // Stay on the first-run panel until the post-seed reload lands, so it never flashes "nothing to do".
  const [seedAttempted, setSeedAttempted] = useState(false);

  /**
   * Generate and write the list. The first run has no rows to compare against, so every row the
   * template produces is an insert; regeneration later is the engine's `reconcile`'s job.
   */
  const seed = useCallback(
    async (studioEngine: StudioEngine | null) => {
      if (!data.input) {
        setSeedError(
          "There is no hall plan yet. Open Seating and draw the room, and the checklist can be built from it."
        );
        return;
      }
      if (!studioEngine) {
        setSeedError(
          "The plan engine is still loading. Try again in a moment."
        );
        return;
      }
      setSeeding(true);
      setSeedAttempted(true);
      setSeedError(null);
      try {
        const plan: ChecklistPlan = studioEngine.checklist(data.input);
        const reconciliation: Reconciliation = {
          templateVersion: plan.templateVersion,
          insert: plan.tasks,
          update: [],
          retire: [],
          skipped: [],
        };
        const result = await seedChecklistAction(eventId, plan, reconciliation);
        if (result.error) {
          setSeedError(result.error);
          return;
        }
        window.location.reload();
      } catch (error) {
        console.error("[ChecklistClient] seed failed:", error);
        setSeedError("Something went wrong building the checklist. Try again.");
      } finally {
        setSeeding(false);
      }
    },
    [data.input, eventId]
  );

  useEffect(() => {
    if (!engine || status !== "ready" || data.seeded || seededOnce.current)
      return;
    seededOnce.current = true;
    void seed(engine);
  }, [engine, status, data.seeded, seed]);

  const now = useMemo(() => new Date(), []);
  // "This week" is the seven days ahead, in UTC days to match the stored `date` column. An
  // unbounded upper compare would quietly pull every overdue row in, which is the opposite of
  // what a host opening "This week" wants.
  const today = useMemo(() => now.toISOString().slice(0, 10), [now]);
  const weekEnd = useMemo(() => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return d.toISOString().slice(0, 10);
  }, [today]);

  const visible = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status === "skipped") return false;
        if (filter === "mine")
          return t.ownerId !== null && t.ownerId === userId;
        if (filter === "waiting") return t.status === "waiting";
        if (filter === "week") {
          if (!t.dueDate) return false;
          return t.dueDate >= today && t.dueDate <= weekEnd;
        }
        return true;
      }),
    [tasks, filter, userId, today, weekEnd]
  );

  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;

  // Rows the one-tap move would actually touch: open, and dated past the window or not at all.
  const openBeyondWeek = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.status === "todo" || t.status === "waiting") &&
          (!t.dueDate || t.dueDate > weekEnd)
      ).length,
    [tasks, weekEnd]
  );

  const currentPhase = useMemo<Phase>(() => {
    const phase = PHASE_ORDER.find((p) =>
      visible.some((t) => t.phase === p && t.status !== "done")
    );
    return phase ?? PHASE_ORDER[PHASE_ORDER.length - 1];
  }, [visible]);

  const [expanded, setExpanded] = useState<Phase | null>(currentPhase);
  useEffect(() => setExpanded(currentPhase), [currentPhase]);

  const nextBest = useMemo(() => {
    const ranked = visible
      .filter((t) => t.status !== "done" && t.status !== "skipped")
      .filter((t) => t.phase === currentPhase)
      .sort((a, b) => {
        const aDue = a.dueDate
          ? Date.parse(`${a.dueDate}T00:00:00Z`)
          : Infinity;
        const bDue = b.dueDate
          ? Date.parse(`${b.dueDate}T00:00:00Z`)
          : Infinity;
        return aDue - bDue || a.sort - b.sort;
      });
    if (ranked.length === 0) return null;
    return ranked[showAnother % ranked.length];
  }, [visible, currentPhase, showAnother]);

  const changeStatus = useCallback(
    async (task: ChecklistTask, next: TaskStatus) => {
      const previous = task.status;
      setTasks((list) =>
        list.map((t) => (t.id === task.id ? { ...t, status: next } : t))
      );
      const result = await setTaskStatusAction(eventId, task.id, next);
      if (result.error) {
        setTasks((list) =>
          list.map((t) => (t.id === task.id ? { ...t, status: previous } : t))
        );
        setToast({ kind: "error", message: result.error });
        return;
      }
      setToast({
        kind: "undo",
        message:
          next === "done"
            ? "Marked done"
            : `Moved to ${STATUS_WORDS[next].toLowerCase()}`,
        undo: async () => {
          const back = await setTaskStatusAction(eventId, task.id, previous);
          if (back.error) throw new Error(back.error);
          setTasks((list) =>
            list.map((t) => (t.id === task.id ? { ...t, status: previous } : t))
          );
        },
      });
    },
    [eventId]
  );

  const remove = useCallback(
    async (task: ChecklistTask) => {
      setTasks((list) => list.filter((t) => t.id !== task.id));
      const result = await deleteTaskAction(eventId, task.id);
      if (result.error) {
        setTasks((list) =>
          list.some((t) => t.id === task.id) ? list : [...list, task]
        );
        setToast({ kind: "error", message: result.error });
        return;
      }
      setToast({
        kind: "undo",
        message: "Deleted",
        undo: async () => {
          const back = await restoreTaskAction(eventId, task.id);
          if (back.error) throw new Error(back.error);
          setTasks((list) =>
            list.some((t) => t.id === task.id) ? list : [...list, task]
          );
        },
      });
    },
    [eventId]
  );

  const moveToThisWeek = useCallback(async () => {
    const result = await moveOpenToThisWeekAction(eventId, weekEnd);
    if (result.error) {
      setToast({ kind: "error", message: result.error });
      return;
    }
    if (result.moved === 0) {
      setToast({
        kind: "info",
        message: "Everything open is already this week.",
      });
      return;
    }
    // The new dates come back with the revalidated page; a refetch here would race the reload.
    window.location.reload();
  }, [eventId, weekEnd]);

  if (!data.seeded && (seeding || seedAttempted || tasks.length === 0)) {
    return (
      <FirstRun
        eventId={eventId}
        title={data.event.title}
        seeding={seeding}
        error={seedError}
        canSeed={Boolean(data.input)}
        engineReady={status === "ready"}
        onSeed={() => void seed(engine)}
      />
    );
  }

  const header = (
    <ScreenHeader
      title="Checklist"
      subtitle={data.event.title}
      backHref={`/events/${eventId}`}
    />
  );
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="sm:pb-16">
      {header}
      <DeskMotion className="mx-auto flex max-w-6xl flex-col gap-5 pb-24 sm:gap-6 sm:pb-8">
        <DeskItem className="flex flex-col gap-1 standalone:max-md:hidden sm:gap-2">
          <p className={EYEBROW}>Checklist</p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-on-surface sm:text-5xl">
            {data.event.title}
          </h1>
          <p className="text-sm text-label-2">
            Everything between now and the day, in the order it needs doing.
          </p>
        </DeskItem>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="flex flex-col gap-5 lg:sticky lg:top-6">
            <DeskItem>
              <section
                aria-label="Where the checklist stands"
                className="profile-card relative overflow-hidden rounded-[28px] p-5 sm:p-6"
              >
                <span aria-hidden="true" className="profile-card__weave" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#f3d98f]">
                      {total > 0 && done === total ? "All done" : "So far"}
                    </p>
                    {total > 0 ? (
                      <p className="mt-1 flex items-baseline gap-2 font-display text-[#fff6dc]">
                        <span className="text-5xl font-semibold leading-none">
                          {done}
                        </span>
                        <span className="text-xl text-[#f4e8cc]">
                          of {total} done
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-lg text-[#f4e8cc]">
                        Nothing to do yet.
                      </p>
                    )}
                    {data.event.date && (
                      <p className="mt-2 text-[13px] text-[#f4e8cc]">
                        {countdown(data.event.date, now)}
                      </p>
                    )}
                  </div>
                  <ProgressRing done={done} total={total} />
                </div>
                {total > 0 && (
                  <div
                    aria-hidden="true"
                    className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/15"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#f6e2ad] to-[#d4a85a] transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {total > 0 && (
                  // A plain link, not a server action: the file is a download, and a browser can
                  // save it without any JavaScript running.
                  <a
                    href={`/api/events/${eventId}/checklist.ics`}
                    className="relative mt-4 inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-[#f3d98f] underline decoration-[#f3d98f]/50 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d98f]"
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden />
                    Add the dates to your calendar
                  </a>
                )}
              </section>
            </DeskItem>

            {seedError && <ErrorNote message={seedError} />}

            {nextBest && (
              <DeskItem>
                <NextAction
                  task={nextBest}
                  phase={currentPhase}
                  onDone={() => void changeStatus(nextBest, "done")}
                  onAnother={() => setShowAnother((n) => n + 1)}
                />
              </DeskItem>
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <DeskItem>
              <div
                className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
                role="toolbar"
                aria-label="Filter the checklist"
              >
                <div className="flex gap-2">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      aria-pressed={filter === f.key}
                      className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                        filter === f.key
                          ? "bg-burgundy text-ivory shadow-sm"
                          : "desk-chip text-burgundy"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  {openBeyondWeek > 0 && (
                    <button
                      type="button"
                      onClick={() => void moveToThisWeek()}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-gold/60 bg-gold/10 px-4 text-[13px] font-semibold text-night hover:bg-gold/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
                    >
                      Move {openBeyondWeek} open to this week
                    </button>
                  )}
                </div>
              </div>
            </DeskItem>

            <DeskItem className="space-y-3">
              {PHASE_ORDER.map((phase) => {
                const rows = visible.filter((t) => t.phase === phase);
                if (rows.length === 0) return null;
                const phaseDone = rows.filter(
                  (t) => t.status === "done"
                ).length;
                const isOpen = expanded === phase;
                const finished = phaseDone === rows.length;
                if (!isOpen) {
                  return (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => setExpanded(phase)}
                      className={`${CARD} flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-white/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy`}
                    >
                      <span className="flex items-center gap-2 font-serif text-lg font-bold text-on-surface">
                        {PHASE_LABELS[phase]}
                        {finished && (
                          <Check
                            className="h-4 w-4 text-gold-ink"
                            aria-label="Phase complete"
                          />
                        )}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-label-2">
                        {phaseDone} of {rows.length}
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </span>
                    </button>
                  );
                }
                return (
                  <section
                    key={phase}
                    className={`${CARD} overflow-hidden`}
                    aria-label={PHASE_LABELS[phase]}
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(null)}
                      aria-expanded={true}
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-5 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burgundy"
                    >
                      <span className="font-serif text-lg font-bold text-on-surface">
                        {PHASE_LABELS[phase]}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-label-2">
                        {phaseDone} of {rows.length}
                        <ChevronDown
                          className="h-4 w-4 rotate-180"
                          aria-hidden
                        />
                      </span>
                    </button>
                    <PhaseBar done={phaseDone} total={rows.length} />
                    <ul className="divide-y divide-hairline">
                      {rows.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          open={open === task.id}
                          onOpen={() =>
                            setOpen((id) => (id === task.id ? null : task.id))
                          }
                          onToggle={() =>
                            void changeStatus(task, toggle(task.status))
                          }
                          onWait={() =>
                            void changeStatus(
                              task,
                              task.status === "waiting" ? "todo" : "waiting"
                            )
                          }
                          onDelete={() => void remove(task)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
              {visible.length === 0 && (
                <p
                  className={`${CARD} px-5 py-8 text-center text-sm text-label-2`}
                >
                  Nothing matches this filter. Try All.
                </p>
              )}
            </DeskItem>
          </div>
        </div>
      </DeskMotion>

      <AnimatePresence>
        {toast && (
          <UndoToast
            toast={toast}
            onClose={() => setToast(null)}
            onError={(message) => setToast({ kind: "error", message })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface Toast {
  kind: "undo" | "info" | "error";
  message: string;
  undo?: () => Promise<void>;
}

function UndoToast({
  toast,
  onClose,
  onError,
}: {
  toast: Toast;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!toast.undo) return;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="fixed inset-x-4 bottom-24 z-50 md:bottom-6 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-night px-4 py-2 text-sm text-ivory shadow-lg"
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <span>{toast.message}</span>
      {toast.undo ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await toast.undo?.();
            } catch (error) {
              // Closing on a failed undo told the host it worked. Say so instead.
              console.error("[UndoToast] undo failed:", error);
              onError(
                "That could not be undone. Reload to see the current list."
              );
              return;
            }
            onClose();
          }}
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-bold uppercase tracking-wide text-gold hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Undo
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 px-3 text-xs font-bold uppercase tracking-wide"
        >
          Close
        </button>
      )}
    </m.div>
  );
}

function ErrorNote({
  message,
  className = "",
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      className={`flex items-start gap-2 rounded-xl border border-[#b4483a]/40 bg-[#fdf4f2] px-3 py-2 text-left text-xs text-[#7a2b22] ${className}`}
      role="alert"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

function FirstRun({
  eventId,
  title,
  seeding,
  error,
  canSeed,
  engineReady,
  onSeed,
}: {
  eventId: string;
  title: string;
  seeding: boolean;
  error: string | null;
  canSeed: boolean;
  engineReady: boolean;
  onSeed: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center text-center">
      <ScreenHeader
        title="Checklist"
        subtitle={title}
        backHref={`/events/${eventId}`}
      />
      <div className={`${CARD} w-full px-6 py-10`}>
        <Sparkles className="mx-auto h-8 w-8 text-gold-ink" aria-hidden />
        <h1 className="mt-3 font-serif text-3xl font-bold text-on-surface">
          Build {title}&apos;s checklist
        </h1>
        <p className="mt-2 text-sm text-label-2">
          We will read your hall plan and add the tasks it needs, each one
          saying why it is there and when it is due.
        </p>
        {error && <ErrorNote message={error} className="mt-4" />}
        <button
          type="button"
          onClick={onSeed}
          disabled={seeding || !canSeed || !engineReady}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-burgundy px-6 text-sm font-semibold text-ivory shadow-[0_8px_20px_-8px_rgba(110,20,38,0.6)] transition-opacity hover:bg-wine disabled:opacity-50"
        >
          {seeding || !engineReady ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Building…
            </>
          ) : (
            "Build the checklist"
          )}
        </button>
        {canSeed && !engineReady && (
          // The button is inert until the hall plan loads; without this the click just does nothing.
          <p role="status" className="mt-3 text-xs text-label-2">
            Reading your hall plan…
          </p>
        )}
        {!canSeed && (
          <p className="mt-3 text-xs text-label-2">
            No hall plan yet.{" "}
            <Link
              href="../seating"
              className="font-semibold text-burgundy underline"
            >
              Open Seating
            </Link>{" "}
            and draw the room first.
          </p>
        )}
      </div>
    </div>
  );
}

function NextAction({
  task,
  phase,
  onDone,
  onAnother,
}: {
  task: ChecklistTask;
  phase: Phase;
  onDone: () => void;
  onAnother: () => void;
}) {
  return (
    <section
      className="overflow-hidden rounded-3xl border border-gold/50 bg-gradient-to-br from-white/60 to-gold/15 p-5 backdrop-blur-sm"
      aria-label="Next action"
    >
      <p className={EYEBROW}>Next in {PHASE_LABELS[phase]}</p>
      <h2 className="mt-1 font-serif text-xl font-bold leading-snug text-on-surface">
        {task.title}
      </h2>
      <p className="mt-1 text-sm text-label-2">{whyNow(task)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory shadow-[0_8px_20px_-8px_rgba(110,20,38,0.6)] hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <Check className="h-4 w-4" /> Done
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-burgundy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          Show me something else
        </button>
      </div>
    </section>
  );
}

function whyNow(task: ChecklistTask): string {
  const why =
    typeof task.derivation?.why === "string" ? task.derivation.why : null;
  if (task.dueDate) {
    const words = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${task.dueDate}T12:00:00Z`));
    return why ? `Due ${words} — ${why}.` : `Due ${words}.`;
  }
  return why
    ? `${why.charAt(0).toUpperCase()}${why.slice(1)}.`
    : "No date set.";
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? done / total : 0;
  const circumference = 2 * Math.PI * 26;
  return (
    <div
      className="relative grid h-16 w-16 shrink-0 place-items-center sm:h-20 sm:w-20"
      role="img"
      aria-label={`${done} of ${total} done`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="currentColor"
          className="text-white/20"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="currentColor"
          className="text-[#f3d98f]"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <span className="absolute text-xs font-bold text-[#fff6dc]">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

function PhaseBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="px-5 pb-3">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-hairline"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} done in this phase`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#d4a85a] to-gold-ink"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TaskRow({
  task,
  open,
  onOpen,
  onToggle,
  onWait,
  onDelete,
}: {
  task: ChecklistTask;
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onWait: () => void;
  onDelete: () => void;
}) {
  const isDone = task.status === "done";
  const overdue =
    task.dueDate !== null &&
    !isDone &&
    Date.parse(`${task.dueDate}T23:59:59Z`) < Date.now();

  return (
    <li>
      <div className="flex min-h-[56px] items-center gap-2 px-3 py-1 sm:px-4">
        <button
          type="button"
          onClick={onToggle}
          role="checkbox"
          aria-checked={isDone}
          aria-label={isDone ? `Un-tick ${task.title}` : `Tick ${task.title}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <span
            className={`grid h-7 w-7 place-items-center rounded-md border transition-colors ${
              isDone
                ? "border-burgundy bg-burgundy text-ivory"
                : "border-gold-ink/50 bg-white/60 hover:border-burgundy"
            }`}
          >
            {isDone && <Check className="h-4 w-4" aria-hidden />}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-3 rounded-lg py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <span
            className={`text-sm font-medium leading-snug sm:truncate ${isDone ? "text-label-2 line-through" : "text-on-surface"}`}
          >
            {task.title}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[11px] text-label-2">
            {task.status === "waiting" && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold-ink">
                Waiting
              </span>
            )}
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 ${overdue ? "font-semibold text-burgundy" : ""}`}
              >
                <Clock className="h-3 w-3" aria-hidden />
                {shortDate(task.dueDate)}
              </span>
            )}
          </span>
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t border-hairline bg-white/30 px-5 py-4 text-xs text-label-2">
          {task.detail && (
            <p className="text-sm text-night/80">{task.detail}</p>
          )}
          {task.mitigation && (
            <p className="text-sm text-night/80">
              <span className="font-semibold text-night">Do this: </span>
              {task.mitigation}
            </p>
          )}
          {typeof task.derivation?.why === "string" && (
            <p>
              <span className="font-semibold text-night">Because: </span>
              {task.derivation.why}
            </p>
          )}
          {task.adviceSource && (
            <p className="text-[11px] leading-snug text-label-2">
              Source: {task.adviceSource}.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onWait}
              className="desk-chip inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              {task.status === "waiting"
                ? "No longer waiting"
                : "Waiting on someone"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-semibold text-label-2 hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

function countdown(date: string, now: Date): string {
  const days = Math.round(
    (Date.parse(`${date.slice(0, 10)}T00:00:00Z`) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      86_400_000
  );
  if (Number.isNaN(days)) return "";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 0) return `${days} days to go`;
  return `${Math.abs(days)} days ago`;
}

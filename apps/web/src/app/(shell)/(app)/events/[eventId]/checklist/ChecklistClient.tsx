"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
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
  "text-[11px] font-bold uppercase tracking-[0.14em] text-gold-ink";
const CARD = "rounded-2xl border border-hairline bg-white/45 backdrop-blur-sm";

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
        title={data.event.title}
        seeding={seeding}
        error={seedError}
        canSeed={Boolean(data.input)}
        engineReady={status === "ready"}
        onSeed={() => void seed(engine)}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={EYEBROW}>Checklist</p>
          <h1 className="mt-1 font-display text-3xl text-night">
            {data.event.title}
          </h1>
          <p className="mt-1 text-sm text-label-2">
            {total > 0
              ? `${done} of ${total} done` +
                (data.event.date ? ` · ${countdown(data.event.date, now)}` : "")
              : "Nothing to do yet."}
          </p>
          {total > 0 && (
            // A plain link, not a server action: the file is a download, and a browser can save it
            // without any JavaScript running.
            <a
              href={`/api/events/${eventId}/checklist.ics`}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-burgundy underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
              Add the dates to your calendar
            </a>
          )}
        </div>
        <ProgressRing done={done} total={total} />
      </header>

      {seedError && <ErrorNote message={seedError} className="mt-4" />}

      {nextBest && (
        <NextAction
          task={nextBest}
          phase={currentPhase}
          onDone={() => void changeStatus(nextBest, "done")}
          onAnother={() => setShowAnother((n) => n + 1)}
        />
      )}

      <div
        className="sticky top-0 z-10 -mx-4 mt-6 bg-ivory/85 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6"
        role="toolbar"
        aria-label="Filter the checklist"
      >
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                filter === f.key
                  ? "border-burgundy bg-burgundy text-ivory"
                  : "border-hairline bg-white/45 text-night hover:bg-white/70"
              }`}
            >
              {f.label}
            </button>
          ))}
          {openBeyondWeek > 0 && (
            <button
              type="button"
              onClick={() => void moveToThisWeek()}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-gold/60 bg-gold/10 px-3.5 text-xs font-semibold text-night hover:bg-gold/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-ink"
            >
              Move {openBeyondWeek} open to this week
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {PHASE_ORDER.map((phase) => {
          const rows = visible.filter((t) => t.phase === phase);
          if (rows.length === 0) return null;
          const phaseDone = rows.filter((t) => t.status === "done").length;
          const isOpen = expanded === phase;
          const finished = phaseDone === rows.length;
          if (!isOpen) {
            return (
              <button
                key={phase}
                type="button"
                onClick={() => setExpanded(phase)}
                className={`${CARD} flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/65`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-night">
                  {PHASE_LABELS[phase]}
                  {finished && (
                    <Check
                      className="h-4 w-4 text-gold-ink"
                      aria-label="Phase complete"
                    />
                  )}
                </span>
                <span className="text-xs text-label-2">
                  {phaseDone} of {rows.length}
                </span>
              </button>
            );
          }
          return (
            <section
              key={phase}
              className={CARD}
              aria-label={PHASE_LABELS[phase]}
            >
              <button
                type="button"
                onClick={() => setExpanded(null)}
                aria-expanded={true}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-night">
                  {PHASE_LABELS[phase]}
                </span>
                <span className="flex items-center gap-2 text-xs text-label-2">
                  {phaseDone} of {rows.length}
                  <ChevronDown className="h-4 w-4 rotate-180" />
                </span>
              </button>
              <PhaseBar done={phaseDone} total={rows.length} />
              <ul className="divide-y divide-hairline/60">
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
          <p className={`${CARD} px-4 py-6 text-center text-sm text-label-2`}>
            Nothing matches this filter. Try All.
          </p>
        )}
      </div>

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
      className="fixed inset-x-4 bottom-6 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-night px-4 py-3 text-sm text-ivory shadow-lg"
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
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-gold hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Undo
        </button>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold uppercase tracking-wide"
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
  title,
  seeding,
  error,
  canSeed,
  engineReady,
  onSeed,
}: {
  title: string;
  seeding: boolean;
  error: string | null;
  canSeed: boolean;
  engineReady: boolean;
  onSeed: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
      <div className={`${CARD} w-full px-6 py-8`}>
        <Sparkles className="mx-auto h-8 w-8 text-gold-ink" aria-hidden />
        <h1 className="mt-3 font-display text-2xl text-night">
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
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-burgundy px-4 py-3 text-sm font-semibold text-ivory transition-opacity hover:opacity-90 disabled:opacity-50"
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
      className="mt-5 overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-white/70 to-gold/10 p-4 backdrop-blur-sm"
      aria-label="Next action"
    >
      <p className={EYEBROW}>Next in {PHASE_LABELS[phase]}</p>
      <h2 className="mt-1 text-lg font-semibold text-night">{task.title}</h2>
      <p className="mt-1 text-sm text-label-2">{whyNow(task)}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onDone}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-burgundy px-4 text-sm font-semibold text-ivory hover:opacity-90"
        >
          <Check className="h-4 w-4" /> Done
        </button>
        <button
          type="button"
          onClick={onAnother}
          className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-night/80 hover:text-night"
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
      className="relative grid h-16 w-16 place-items-center"
      role="img"
      aria-label={`${done} of ${total} done`}
    >
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="currentColor"
          className="text-hairline"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="currentColor"
          className="text-gold-ink"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <span className="absolute text-xs font-bold text-night">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

function PhaseBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="px-4 pb-3">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-hairline"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${done} of ${total} done in this phase`}
      >
        <div
          className="h-full rounded-full bg-gold-ink"
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
      <div className="flex min-h-[44px] items-center gap-3 px-4 py-2">
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
                : "border-night/30 bg-white/50 hover:border-night/60"
            }`}
          >
            {isDone && <Check className="h-4 w-4" aria-hidden />}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-3 text-left"
        >
          <span
            className={`truncate text-sm ${isDone ? "text-label-2 line-through" : "text-night"}`}
          >
            {task.title}
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[11px] text-label-2">
            {task.status === "waiting" && (
              <span className="rounded-full bg-white/60 px-2 py-0.5">
                Waiting
              </span>
            )}
            {task.dueDate && (
              <span
                className={`flex items-center gap-1 ${overdue ? "text-night" : ""}`}
              >
                <Clock className="h-3 w-3" aria-hidden />
                {shortDate(task.dueDate)}
              </span>
            )}
          </span>
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t border-hairline/50 bg-white/35 px-4 py-3 text-xs text-label-2">
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
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={onWait}
              className="font-semibold text-burgundy underline"
            >
              {task.status === "waiting"
                ? "No longer waiting"
                : "Waiting on someone"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="font-semibold text-night/70 underline"
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

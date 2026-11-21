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
  Plus,
  RotateCcw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { ChecklistPlan, Phase, Reconciliation } from "@ariya/studio";
import type { StudioEngine } from "@ariya/studio";
import { useStudioEngine } from "@/features/seating/hall/useStudioEngine";
import { wasPastWhenAdded } from "@/features/checklist/late-start";
import {
  BUCKETS,
  dueWords,
  groupTasks,
  whenDue,
} from "@/features/checklist/buckets";
import { getLagosDateKey } from "@/lib/format";
import { missingPlanTasks } from "@/features/checklist/plan-sync";
import { TaskForm } from "@/features/checklist/components/TaskForm";
import {
  describeRelative,
  dueOf,
  resolveDue,
  type TaskInput,
} from "@/features/checklist/task-input";
import {
  addMissingPlanRowsAction,
  addTaskAction,
  updateTaskAction,
  deleteTaskAction,
  restoreTaskAction,
  seedChecklistAction,
  setTaskStatusAction,
} from "@/features/checklist/actions";
import {
  PHASE_LABELS,
  type ChecklistData,
  type ChecklistTask,
  type TaskStatus,
} from "@/features/checklist/types";

const EYEBROW =
  "text-[11px] font-bold uppercase tracking-[0.16em] text-gold-ink";
const CARD = "rounded-3xl border border-hairline bg-white/40 backdrop-blur-sm";

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
}: {
  eventId: string;
  data: ChecklistData;
  /** The signed-in viewer. Kept for "Mine" (tasks assigned to me), which returns with team roles. */
  userId: string | null;
}) {
  const { engine, status } = useStudioEngine();
  const [tasks, setTasks] = useState(data.tasks);
  const [onlyWaiting, setOnlyWaiting] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [showEarlier, setShowEarlier] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
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
          "The checklist could not read this event. Reload and try again."
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

  // A list built before the hall was drawn lacks the venue's rows (power, tents, weather). Once a
  // hall plan exists, add just those: nothing the host has, edited or deleted is touched.
  const syncedOnce = useRef(false);
  useEffect(() => {
    if (!engine || status !== "ready" || !data.seeded || !data.fromHallPlan)
      return;
    if (!data.input || syncedOnce.current) return;
    syncedOnce.current = true;
    let plan: ChecklistPlan;
    try {
      plan = engine.checklist(data.input);
    } catch (error) {
      console.error("[ChecklistClient] plan for sync failed:", error);
      return;
    }
    if (missingPlanTasks(plan.tasks, data.knownKeys).length === 0) return;
    void addMissingPlanRowsAction(eventId, plan).then((result) => {
      if (result.error) {
        setToast({ kind: "error", message: result.error });
        return;
      }
      if (result.added) window.location.reload();
    });
  }, [
    engine,
    status,
    data.seeded,
    data.fromHallPlan,
    data.input,
    data.knownKeys,
    eventId,
  ]);

  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => getLagosDateKey(now) ?? "", [now]);
  const eventKey = getLagosDateKey(data.event.date);

  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.filter((t) => t.status !== "skipped").length;
  const waitingCount = tasks.filter((t) => t.status === "waiting").length;

  // The list is read as time: what is late, this week, this month, later. The top of it is what to
  // do next, so there is no separate "next" card to keep in step with it.
  const grouped = useMemo(
    () =>
      groupTasks(
        onlyWaiting ? tasks.filter((t) => t.status === "waiting") : tasks,
        todayKey,
        eventKey
      ),
    [tasks, onlyWaiting, todayKey, eventKey]
  );
  const openCount = BUCKETS.filter((b) => b.key !== "done").reduce(
    (n, b) => n + grouped.buckets[b.key].length,
    0
  );
  // A new task starts in the stage of whatever is next, so it lands near the work in hand.
  const defaultPhase: Phase =
    BUCKETS.filter((b) => b.key !== "done")
      .map((b) => grouped.buckets[b.key][0])
      .find(Boolean)?.phase ?? "detail";

  const changeStatus = useCallback(
    async (task: ChecklistTask, next: TaskStatus) => {
      const previous = task.status;
      setTasks((list) =>
        list.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: next,
                completedAt:
                  next === "done" ? new Date().toISOString() : t.completedAt,
              }
            : t
        )
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

  // A host's own task goes straight into the list; its due date is worked out the same way the
  // server does, so nothing needs reloading.
  const addTask = useCallback(
    async (input: TaskInput) => {
      const res = await addTaskAction(eventId, input);
      if (res.error || !res.id)
        return { error: res.error ?? "Could not add the task." };
      const { due_date, days_before } = resolveDue(input.due, data.event.date);
      const task: ChecklistTask = {
        id: res.id,
        title: input.title.trim(),
        detail: input.detail?.trim() || null,
        phase: input.phase as Phase,
        dueDate: due_date,
        status: "todo",
        ownerId: null,
        source: "manual",
        sourceKey: null,
        derivation: null,
        mitigation: null,
        adviceSource: null,
        timeSlot: null,
        sort: 0,
        completedAt: null,
        createdAt: new Date().toISOString(),
        daysBefore: days_before,
        editedAt: null,
      };
      setTasks((list) => [...list, task]);
      setAdding(false);
      setToast({ kind: "info", message: `Added "${task.title}".` });
      return {};
    },
    [eventId, data.event.date]
  );

  const saveTask = useCallback(
    async (task: ChecklistTask, input: TaskInput) => {
      const res = await updateTaskAction(eventId, task.id, input);
      if (res.error) return { error: res.error };
      const { due_date, days_before } = resolveDue(input.due, data.event.date);
      setTasks((list) =>
        list.map((t) =>
          t.id === task.id
            ? {
                ...t,
                title: input.title.trim(),
                detail: input.detail?.trim() || null,
                phase: input.phase as Phase,
                dueDate: due_date,
                daysBefore: days_before,
                editedAt: new Date().toISOString(),
              }
            : t
        )
      );
      setToast({ kind: "info", message: "Saved." });
      return {};
    },
    [eventId, data.event.date]
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

  const [settingAside, setSettingAside] = useState(false);
  const setAsidePastWhenAdded = useCallback(async () => {
    const rows = tasks.filter((t) => wasPastWhenAdded(t));
    if (rows.length === 0) return;
    setSettingAside(true);
    const failed: string[] = [];
    for (const t of rows) {
      try {
        const result = await setTaskStatusAction(eventId, t.id, "skipped");
        if (result.error) failed.push(t.id);
      } catch {
        // Offline: count it as not done rather than let the page fall over.
        failed.push(t.id);
      }
    }
    setSettingAside(false);
    const ids = new Set(
      rows.map((t) => t.id).filter((id) => !failed.includes(id))
    );
    setTasks((list) =>
      list.map((t) => (ids.has(t.id) ? { ...t, status: "skipped" } : t))
    );
    setToast(
      failed.length > 0
        ? {
            kind: "error",
            message: `${failed.length} could not be set aside. Try again.`,
          }
        : {
            kind: "info",
            message: `Set aside ${ids.size} earlier ${ids.size === 1 ? "task" : "tasks"}.`,
          }
    );
  }, [tasks, eventId]);

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
      action={{
        icon: "add_circle",
        label: "Add a task",
        onClick: () => setAdding(true),
      }}
    />
  );
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const rowProps = (task: ChecklistTask) => ({
    task,
    todayKey,
    eventKey,
    open: open === task.id,
    onOpen: () => setOpen((id) => (id === task.id ? null : task.id)),
    onToggle: () => void changeStatus(task, toggle(task.status)),
    onWait: () =>
      void changeStatus(task, task.status === "waiting" ? "todo" : "waiting"),
    onDelete: () => void remove(task),
    onSave: (input: TaskInput) => saveTask(task, input),
  });

  return (
    <div className="sm:pb-16">
      {header}
      <DeskMotion className="mx-auto flex w-full max-w-6xl flex-col gap-4 pb-28 sm:gap-5 sm:pb-10">
        {/* In the installed app on a phone, the bar above carries the title, Back and Add. */}
        <DeskItem className="flex flex-col gap-1 standalone:max-md:hidden">
          <p className={EYEBROW}>Checklist</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="min-w-0 font-serif text-3xl font-bold leading-tight text-on-surface sm:text-4xl">
              {data.event.title}
            </h1>
            {!adding && (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory shadow-[0_8px_20px_-10px_rgba(110,20,38,0.7)] hover:bg-wine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add a task
              </button>
            )}
          </div>
        </DeskItem>

        {/* Wide screens: what stands where on the left (it stays in view), the work on the right.
            Phones: one column, in the same order. */}
        <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:sticky lg:top-24">
            <DeskItem>
              <section
                aria-label="Where the checklist stands"
                className="profile-card relative overflow-hidden rounded-[24px] px-5 py-4 sm:px-6"
              >
                <span aria-hidden="true" className="profile-card__weave" />
                <div className="relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-display text-[#fff6dc]">
                    <span className="text-3xl font-semibold">{done}</span>
                    <span className="text-lg text-[#f4e8cc]">
                      {" "}
                      of {total} done
                    </span>
                  </p>
                  {data.event.date && (
                    <p className="text-[13px] text-[#f3d98f]">
                      {countdown(data.event.date, now)}
                    </p>
                  )}
                </div>
                <div
                  role="progressbar"
                  aria-label="Checklist progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#f6e2ad] to-[#d4a85a] transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <ul
                  aria-label="Open tasks by when they are due"
                  className="relative mt-4 grid grid-cols-4 gap-2"
                >
                  {(["overdue", "week", "month", "later"] as const).map(
                    (key) => {
                      const n = grouped.buckets[key].length;
                      const label = BUCKETS.find((b) => b.key === key)!.label;
                      const tile = `flex flex-col items-center rounded-2xl bg-black/20 px-2 py-2 text-center ring-1 ring-inset ring-[#f3d98f]/15 ${n > 0 ? "transition-colors hover:bg-black/30" : "opacity-60"}`;
                      const body = (
                        <>
                          <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.08em] text-[#f3d98f]">
                            {label}
                          </span>
                          <span
                            className={`font-display text-xl font-semibold tabular-nums ${key === "overdue" && n > 0 ? "text-[#ffb4bf]" : "text-[#fff6dc]"}`}
                          >
                            {n}
                            <span className="sr-only">
                              {n === 1 ? " task" : " tasks"}
                            </span>
                          </span>
                        </>
                      );
                      return (
                        <li key={key}>
                          {n > 0 ? (
                            <a
                              href={`#bucket-${key}`}
                              className={`${tile} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d98f]`}
                            >
                              {body}
                            </a>
                          ) : (
                            <span className={tile}>{body}</span>
                          )}
                        </li>
                      );
                    }
                  )}
                </ul>
                {total > 0 && (
                  // A plain link: the file is a download, and a browser can save it without JavaScript.
                  <a
                    href={`/api/events/${eventId}/checklist.ics`}
                    className="relative mt-3 inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[#f3d98f] underline decoration-[#f3d98f]/50 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d98f]"
                  >
                    <CalendarPlus className="h-4 w-4" aria-hidden />
                    Add the dates to your calendar
                  </a>
                )}
              </section>
            </DeskItem>

            {(waitingCount > 0 || onlyWaiting) && (
              <DeskItem>
                <div
                  role="group"
                  aria-label="Show"
                  className="flex flex-wrap gap-2"
                >
                  {[
                    { on: !onlyWaiting, label: "All tasks", set: false },
                    {
                      on: onlyWaiting,
                      label: `Waiting on someone (${waitingCount})`,
                      set: true,
                    },
                  ].map((f) => (
                    <button
                      key={f.label}
                      type="button"
                      aria-pressed={f.on}
                      onClick={() => setOnlyWaiting(f.set)}
                      className={`inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy ${
                        f.on
                          ? "bg-burgundy text-ivory shadow-sm"
                          : "desk-chip text-burgundy"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </DeskItem>
            )}

            {grouped.earlier.length > 0 && !onlyWaiting && (
              <DeskItem>
                <section
                  aria-label="Tasks from before you started"
                  className={`${CARD} px-4 py-4 sm:px-6`}
                >
                  <p className="text-sm font-semibold text-on-surface">
                    {grouped.earlier.length}{" "}
                    {grouped.earlier.length === 1 ? "task was" : "tasks were"}{" "}
                    due before this checklist began
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-label-2">
                    They are usually handled already. Tick any you still need,
                    and set the rest aside.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void setAsidePastWhenAdded()}
                      disabled={settingAside}
                      className="desk-chip inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-semibold text-burgundy disabled:opacity-50"
                    >
                      {settingAside
                        ? "Setting aside…"
                        : `Set aside all ${grouped.earlier.length}`}
                    </button>
                    <button
                      type="button"
                      aria-expanded={showEarlier}
                      onClick={() => setShowEarlier((v) => !v)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-label-2 hover:text-burgundy"
                    >
                      {showEarlier ? "Hide them" : "Show them"}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${showEarlier ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                  </div>
                  {showEarlier && (
                    <ul className="-mx-4 mt-3 divide-y divide-hairline border-t border-hairline sm:-mx-6">
                      {grouped.earlier.map((task) => (
                        <TaskRow key={task.id} {...rowProps(task)} />
                      ))}
                    </ul>
                  )}
                </section>
              </DeskItem>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
            {seedError && <ErrorNote message={seedError} />}
            {adding && (
              <DeskItem>
                <section
                  aria-label="Add a task"
                  className={`${CARD} px-4 py-5 sm:px-6`}
                >
                  <h2 className="mb-4 font-serif text-xl font-bold text-on-surface">
                    Add a task
                  </h2>
                  <TaskForm
                    initial={{
                      title: "",
                      detail: "",
                      phase: defaultPhase,
                      due: { kind: "none" },
                    }}
                    submitLabel="Add the task"
                    onSubmit={addTask}
                    onCancel={() => setAdding(false)}
                  />
                </section>
              </DeskItem>
            )}

            {BUCKETS.filter((b) => b.key !== "done").map((b) => {
              const rows = grouped.buckets[b.key];
              if (rows.length === 0) return null;
              return (
                <DeskItem key={b.key}>
                  <section
                    id={`bucket-${b.key}`}
                    aria-label={b.label}
                    className={`${CARD} scroll-mt-24 overflow-hidden`}
                  >
                    <h2 className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-4 sm:px-6">
                      <span
                        className={`font-serif text-xl font-bold ${b.key === "overdue" ? "text-burgundy" : "text-on-surface"}`}
                      >
                        {b.label}
                      </span>
                      <span className="text-xs text-label-2">
                        {rows.length}
                      </span>
                    </h2>
                    <ul className="divide-y divide-hairline">
                      {rows.map((task) => (
                        <TaskRow key={task.id} {...rowProps(task)} />
                      ))}
                    </ul>
                  </section>
                </DeskItem>
              );
            })}

            {openCount === 0 && !onlyWaiting && (
              <DeskItem>
                <p
                  className={`${CARD} px-5 py-8 text-center text-sm text-label-2`}
                >
                  {total > 0
                    ? "Everything on the list is done. Enjoy the celebration."
                    : "Nothing on the list yet. Add your first task."}
                </p>
              </DeskItem>
            )}
            {onlyWaiting && openCount === 0 && (
              <DeskItem>
                <p
                  className={`${CARD} px-5 py-8 text-center text-sm text-label-2`}
                >
                  Nothing is waiting on anyone.
                </p>
              </DeskItem>
            )}

            {grouped.buckets.done.length > 0 && (
              <DeskItem>
                <section
                  aria-label="Done"
                  className={`${CARD} overflow-hidden`}
                >
                  <button
                    type="button"
                    aria-expanded={showDone}
                    onClick={() => setShowDone((v) => !v)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-burgundy sm:px-6"
                  >
                    <span className="flex items-center gap-2 font-serif text-xl font-bold text-on-surface">
                      <Check className="h-5 w-5 text-gold-ink" aria-hidden />
                      Done
                    </span>
                    <span className="flex items-center gap-2 text-xs text-label-2">
                      {grouped.buckets.done.length}
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${showDone ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </span>
                  </button>
                  {showDone && (
                    <ul className="divide-y divide-hairline border-t border-hairline">
                      {grouped.buckets.done.map((task) => (
                        <TaskRow key={task.id} {...rowProps(task)} />
                      ))}
                    </ul>
                  )}
                </section>
              </DeskItem>
            )}
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
          We will build it from your date, guests and tables, each task saying
          why it is there and when it is due. A hall plan from Seating adds
          venue tasks such as power and weather.
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
          // The button is inert until the engine loads; without this the click just does nothing.
          <p role="status" className="mt-3 text-xs text-label-2">
            Getting the planner ready…
          </p>
        )}
        {!canSeed && (
          <p className="mt-3 text-xs text-label-2">
            This event could not be read.{" "}
            <Link
              href="../seating"
              className="font-semibold text-burgundy underline"
            >
              Open Seating
            </Link>{" "}
            or reload the page.
          </p>
        )}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  todayKey,
  eventKey,
  open,
  onOpen,
  onToggle,
  onWait,
  onDelete,
  onSave,
}: {
  task: ChecklistTask;
  todayKey: string;
  eventKey: string | null;
  open: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onWait: () => void;
  onDelete: () => void;
  onSave: (input: TaskInput) => Promise<{ error?: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const isDone = task.status === "done";
  const beforeStart = wasPastWhenAdded(task);
  const due = whenDue(task, eventKey);
  const overdue = !isDone && !beforeStart && due !== null && due < todayKey;
  const when = isDone
    ? null
    : beforeStart
      ? "Before you started"
      : due
        ? dueWords(due, todayKey)
        : null;

  return (
    <li>
      <div className="flex items-start gap-1 px-2 sm:px-4">
        <button
          type="button"
          onClick={onToggle}
          role="checkbox"
          aria-checked={isDone}
          aria-label={isDone ? `Un-tick ${task.title}` : `Tick ${task.title}`}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <span
            className={`grid h-7 w-7 place-items-center rounded-lg border-2 transition-colors ${
              isDone
                ? "border-burgundy bg-burgundy text-ivory"
                : overdue
                  ? "border-burgundy/60 bg-white/70 hover:border-burgundy"
                  : "border-gold-ink/45 bg-white/70 hover:border-burgundy"
            }`}
          >
            {isDone && <Check className="h-4 w-4" aria-hidden />}
          </span>
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex min-h-12 min-w-0 flex-1 items-start justify-between gap-2 rounded-xl py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          <span className="min-w-0">
            <span
              className={`block break-words text-[15px] font-medium leading-snug ${isDone ? "text-label-2 line-through" : "text-on-surface"}`}
            >
              {task.title}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-label-2">
              {when && (
                <span
                  className={`inline-flex items-center gap-1 ${overdue ? "font-semibold text-burgundy" : ""}`}
                >
                  <Clock className="h-3 w-3" aria-hidden />
                  {when}
                </span>
              )}
              <span>{PHASE_LABELS[task.phase]}</span>
              {task.status === "waiting" && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 font-semibold text-gold-ink">
                  Waiting
                </span>
              )}
              {task.source === "manual" ? (
                <span className="rounded-full bg-burgundy/10 px-2 py-0.5 font-semibold text-burgundy">
                  Your task
                </span>
              ) : task.editedAt ? (
                <span className="rounded-full bg-night/[0.06] px-2 py-0.5 font-semibold text-label-2">
                  Edited
                </span>
              ) : null}
            </span>
          </span>
          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 text-label-2 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>

      {open && editing && (
        <div className="border-t border-hairline bg-white/30 px-4 py-4 sm:px-6">
          <TaskForm
            initial={{
              title: task.title,
              detail: task.detail ?? "",
              phase: task.phase,
              due: dueOf(task),
            }}
            submitLabel="Save the task"
            onSubmit={async (input) => {
              const res = await onSave(input);
              if (!res.error) setEditing(false);
              return res;
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
      {open && !editing && (
        <div className="space-y-2 border-t border-hairline bg-white/30 px-4 py-4 text-[13px] leading-relaxed text-label-2 sm:px-6">
          {task.dueDate && (
            <p>
              <span className="font-semibold text-night">Due: </span>
              {shortDate(task.dueDate)}
              {task.daysBefore !== null
                ? `, ${describeRelative(task.daysBefore).toLowerCase()} the day. Moves if the event date changes.`
                : "."}
            </p>
          )}
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
              <span className="font-semibold text-night">Why it's here: </span>
              {task.derivation.why}
            </p>
          )}
          {task.adviceSource && (
            <p className="text-[12px]">Source: {task.adviceSource}.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="desk-chip inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
            >
              Edit
            </button>
            {!isDone && (
              <button
                type="button"
                onClick={onWait}
                className="desk-chip inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-semibold text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
              >
                {task.status === "waiting"
                  ? "No longer waiting"
                  : "Waiting on someone"}
              </button>
            )}
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

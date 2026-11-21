"use client";

import { useId, useState } from "react";
import { DateTimeField } from "@/components/ui/date-time-field";
import type { Phase } from "@ariya/studio";
import { PHASE_LABELS, PHASE_ORDER } from "../types";
import type { TaskDue, TaskInput } from "../task-input";

const CHIP =
  "inline-flex min-h-10 items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";
const ON = "bg-burgundy text-ivory shadow-sm";
const OFF = "desk-chip text-night hover:text-burgundy";
const LABEL =
  "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-label-2";
const FIELD_BASE =
  "desk-field rounded-2xl px-3.5 text-sm text-night focus-visible:outline-2 focus-visible:outline-burgundy";
const FIELD = `${FIELD_BASE} w-full`;

type WhenKind = TaskDue["kind"];
const WHEN: { key: WhenKind; label: string }[] = [
  { key: "none", label: "No date" },
  { key: "before", label: "Before the day" },
  { key: "after", label: "After the day" },
  { key: "date", label: "On a date" },
];

export interface TaskFormValues {
  title: string;
  detail: string;
  phase: Phase;
  due: TaskDue;
}

/**
 * Add or edit a checklist task: its name, where it sits in the plan, when it is due and any notes.
 * "Before the day" and "After the day" follow the event: move the date and the task moves too.
 */
export function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: TaskFormValues;
  submitLabel: string;
  onSubmit: (input: TaskInput) => Promise<{ error?: string }>;
  onCancel: () => void;
}) {
  const uid = useId();
  const [title, setTitle] = useState(initial.title);
  const [detail, setDetail] = useState(initial.detail);
  const [phase, setPhase] = useState<Phase>(initial.phase);
  const [when, setWhen] = useState<WhenKind>(initial.due.kind);
  const startDays =
    initial.due.kind === "before" || initial.due.kind === "after"
      ? initial.due.days
      : 14;
  const startWeeks = startDays > 0 && startDays % 7 === 0;
  const [amount, setAmount] = useState(
    String(startWeeks ? startDays / 7 : startDays)
  );
  const [unit, setUnit] = useState<"days" | "weeks">(
    startWeeks ? "weeks" : "days"
  );
  const [date, setDate] = useState(
    initial.due.kind === "date" ? initial.due.date : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days =
    Math.max(0, Math.round(Number(amount) || 0)) * (unit === "weeks" ? 7 : 1);

  const due = (): TaskDue => {
    if (when === "before") return { kind: "before", days };
    if (when === "after") return { kind: "after", days: Math.max(1, days) };
    if (when === "date") return { kind: "date", date };
    return { kind: "none" };
  };

  const ready =
    title.trim().length >= 2 &&
    (when !== "date" || /^\d{4}-\d{2}-\d{2}$/.test(date));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await onSubmit({ title, detail, phase, due: due() });
      if (res.error) setError(res.error);
    } catch {
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={submitLabel}>
      <div>
        <label htmlFor={`${uid}-title`} className={LABEL}>
          Task
        </label>
        <input
          id={`${uid}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Book the talking drummer"
          autoFocus
          className={`${FIELD} min-h-11`}
        />
      </div>

      <fieldset>
        <legend className={LABEL}>Where it sits in the plan</legend>
        <div className="flex flex-wrap gap-1.5">
          {PHASE_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={phase === p}
              onClick={() => setPhase(p)}
              className={`${CHIP} ${phase === p ? ON : OFF}`}
            >
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={LABEL}>When it's due</legend>
        <div className="flex flex-wrap gap-1.5">
          {WHEN.map((w) => (
            <button
              key={w.key}
              type="button"
              aria-pressed={when === w.key}
              onClick={() => setWhen(w.key)}
              className={`${CHIP} ${when === w.key ? ON : OFF}`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {(when === "before" || when === "after") && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor={`${uid}-amount`} className="sr-only">
              How many
            </label>
            <input
              id={`${uid}-amount`}
              type="number"
              inputMode="numeric"
              min={when === "after" ? 1 : 0}
              max={unit === "weeks" ? 104 : 730}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${FIELD_BASE} min-h-11 w-24 tabular-nums`}
            />
            <div role="group" aria-label="Days or weeks" className="flex gap-1">
              {(["days", "weeks"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={unit === u}
                  onClick={() => setUnit(u)}
                  className={`${CHIP} ${unit === u ? ON : OFF}`}
                >
                  {u}
                </button>
              ))}
            </div>
            <span className="text-[13px] text-label-2">
              {when === "before" ? "before the day" : "after the day"}
            </span>
          </div>
        )}
        {(when === "before" || when === "after") && (
          <p className="mt-1.5 text-[12px] text-label-2">
            Moves with the event: change the date and this task follows.
          </p>
        )}
        {when === "date" && (
          <div className="mt-3 max-w-xs">
            <DateTimeField
              id={`${uid}-date`}
              time={false}
              value={date}
              onChange={setDate}
              placeholder="Choose a date"
            />
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor={`${uid}-detail`} className={LABEL}>
          Notes (optional)
        </label>
        <textarea
          id={`${uid}-detail`}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Who to call, what was agreed, what it costs"
          className={`${FIELD} py-2.5`}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-burgundy">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={!ready || saving}
          className="inline-flex min-h-11 items-center rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory shadow-sm hover:bg-wine disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-label-2 hover:text-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

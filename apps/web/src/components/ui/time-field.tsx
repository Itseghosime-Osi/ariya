"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "@/components/ui/icon";

interface TimeFieldProps {
  id?: string;
  /** "14:30", or "" when no time is set. */
  value: string;
  /**
   * Called once, when the sheet closes with a different time, so a caller that saves on change
   * saves one value rather than one per tap.
   */
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Read by screen readers; the field itself shows the time. */
  label?: string;
  className?: string;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const CHIP =
  "grid min-h-10 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

function parse(value: string): { hour: number; minute: number } | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

function format(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "2:30 PM" for "14:30". */
export function formatClock(value: string): string {
  const p = parse(value);
  if (!p) return "";
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${h12}:${String(p.minute).padStart(2, "0")} ${p.hour >= 12 ? "PM" : "AM"}`;
}

/**
 * Our time picker: the same desk field and cream sheet as the date picker, with burgundy chips for
 * the hour, the minute and AM or PM, in place of the browser's own blue clock.
 */
export function TimeField({
  id,
  value,
  onChange,
  disabled = false,
  placeholder = "Set a time",
  label,
  className = "",
}: TimeFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  const onOpenChange = (next: boolean) => {
    if (next) setDraft(value);
    else if (draft !== value) onChange(draft);
    setOpen(next);
  };

  const current = parse(draft) ?? { hour: 12, minute: 0 };
  const pm = current.hour >= 12;
  const hour12 = current.hour % 12 === 0 ? 12 : current.hour % 12;
  const set = (hour: number, minute: number) => setDraft(format(hour, minute));
  const to24 = (h: number, isPm: boolean) => (h % 12) + (isPm ? 12 : 0);
  const hasDraft = parse(draft) !== null;

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-label={
            label
              ? `${label}: ${value ? formatClock(value) : "no time set"}`
              : undefined
          }
          className={`desk-field flex min-h-11 items-center justify-between gap-2 rounded-2xl px-3.5 text-left text-sm text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none disabled:opacity-60 ${className}`}
        >
          <span
            className={
              value ? "tabular-nums" : "whitespace-nowrap text-label-2"
            }
          >
            {value ? formatClock(value) : placeholder}
          </span>
          <Icon name="schedule" size={16} className="shrink-0 text-burgundy" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={16}
          aria-label={label ? `Choose a time for ${label}` : "Choose a time"}
          className="z-[80] max-h-[var(--radix-popover-content-available-height)] w-[min(19rem,calc(100vw-2rem))] space-y-3 overflow-y-auto rounded-3xl border border-hairline bg-ivory p-4 shadow-[0_24px_48px_-20px_rgba(42,10,20,0.45)] focus:outline-none"
        >
          <p className="text-center font-serif text-[22px] font-semibold tabular-nums text-night">
            {hasDraft ? formatClock(draft) : "—:—"}
          </p>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-ink">
              Hour
            </p>
            <div className="grid grid-cols-6 gap-1">
              {HOURS.map((h) => {
                const on = hasDraft && h === hour12;
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${h} o'clock`}
                    onClick={() => set(to24(h, pm), current.minute)}
                    className={`${CHIP} ${on ? "bg-burgundy text-ivory" : "desk-chip text-night"}`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-ink">
              Minute
            </p>
            <div className="grid grid-cols-6 gap-1">
              {MINUTES.map((m) => {
                const on = hasDraft && m === current.minute;
                return (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${m} minutes`}
                    onClick={() => set(current.hour, m)}
                    className={`${CHIP} ${on ? "bg-burgundy text-ivory" : "desk-chip text-night"}`}
                  >
                    {String(m).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            role="group"
            aria-label="Morning or afternoon"
            className="grid grid-cols-2 gap-1"
          >
            {(["AM", "PM"] as const).map((half) => {
              const on = hasDraft && (half === "PM") === pm;
              return (
                <button
                  key={half}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set(to24(hour12, half === "PM"), current.minute)
                  }
                  className={`${CHIP} ${on ? "bg-burgundy text-ivory" : "desk-chip text-night"}`}
                >
                  {half}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-hairline pt-3">
            <button
              type="button"
              onClick={() => setDraft("")}
              disabled={!hasDraft}
              className="min-h-10 rounded-full px-3 text-[13px] font-semibold text-label-2 hover:text-burgundy disabled:opacity-40"
            >
              Clear
            </button>
            <Popover.Close asChild>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-burgundy px-5 text-[13px] font-semibold text-ivory shadow-sm"
              >
                <Icon name="check" size={14} />
                Done
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

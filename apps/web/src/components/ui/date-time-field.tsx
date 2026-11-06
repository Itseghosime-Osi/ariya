"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "@/components/ui/icon";
import {
  MONTH_NAMES,
  WEEKDAYS,
  formatDisplay,
  formatLocal,
  monthGrid,
  parseLocal,
  shiftMonth,
  to24,
  type LocalParts,
} from "@/lib/calendar";

interface DateTimeFieldProps {
  id?: string;
  /** "2026-12-12T14:00" (or "2026-12-12" when `time` is false); "" when empty. */
  value: string;
  onChange: (value: string) => void;
  /** Ask for a time of day as well as the date. */
  time?: boolean;
  /** Offer Clear, for dates a host may leave empty. */
  clearable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const CHIP =
  "grid min-h-10 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";
const NAV =
  "grid h-10 w-10 place-items-center rounded-full text-night transition-colors hover:bg-burgundy/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

function todayParts(): Pick<LocalParts, "year" | "month" | "day"> {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/**
 * Our date and time picker: the field is a desk field, the calendar opens in a cream sheet with
 * burgundy for the chosen day and a gold ring for today. It holds the same strings a native date
 * input does, so the WAT conversions around it stay as they were.
 */
export function DateTimeField({
  id,
  value,
  onChange,
  time = true,
  clearable = false,
  disabled = false,
  placeholder = "Choose a date",
  className = "",
}: DateTimeFieldProps) {
  const parsed = parseLocal(value);
  const [open, setOpen] = React.useState(false);
  const today = todayParts();
  const [view, setView] = React.useState(() => ({
    year: parsed?.year ?? today.year,
    month: parsed?.month ?? today.month,
  }));

  // Opening the sheet lands on the month of the chosen day.
  const onOpenChange = (next: boolean) => {
    if (next) {
      const p = parseLocal(value);
      setView({
        year: p?.year ?? today.year,
        month: p?.month ?? today.month,
      });
    }
    setOpen(next);
  };

  const current: LocalParts = parsed ?? {
    ...today,
    hour: 12,
    minute: 0,
  };
  const commit = (next: LocalParts) => onChange(formatLocal(next, time));
  const pm = current.hour >= 12;
  const hour12 = current.hour % 12 === 0 ? 12 : current.hour % 12;
  const grid = monthGrid(view.year, view.month);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          className={`desk-field flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-base text-night focus-visible:ring-2 focus-visible:ring-burgundy/30 focus-visible:outline-none disabled:opacity-60 sm:text-sm ${className}`}
        >
          <span className={parsed ? "truncate" : "truncate text-label-2"}>
            {parsed ? formatDisplay(parsed, time) : placeholder}
          </span>
          <Icon name="calendar" size={16} className="shrink-0 text-burgundy" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={16}
          aria-label={time ? "Choose date and time" : "Choose a date"}
          className="z-[80] max-h-[var(--radix-popover-content-available-height)] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-hairline bg-ivory p-4 shadow-[0_24px_48px_-20px_rgba(42,10,20,0.45)] focus:outline-none"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              className={NAV}
              aria-label="Previous month"
              onClick={() => setView((v) => shiftMonth(v.year, v.month, -1))}
            >
              <Icon name="chevron_left" size={18} />
            </button>
            <p
              aria-live="polite"
              className="font-serif text-[17px] font-semibold text-night"
            >
              {MONTH_NAMES[view.month - 1]} {view.year}
            </p>
            <button
              type="button"
              className={NAV}
              aria-label="Next month"
              onClick={() => setView((v) => shiftMonth(v.year, v.month, 1))}
            >
              <Icon name="chevron_right" size={18} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 text-center">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="py-1 text-[10px] font-bold uppercase tracking-wider text-gold-ink"
              >
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center">
            {grid.map((cell) => {
              const selected =
                parsed !== null &&
                parsed.year === cell.year &&
                parsed.month === cell.month &&
                parsed.day === cell.day;
              const isToday =
                cell.year === today.year &&
                cell.month === today.month &&
                cell.day === today.day;
              return (
                <button
                  key={`${cell.year}-${cell.month}-${cell.day}`}
                  type="button"
                  aria-label={formatDisplay(
                    { ...current, ...cell, hour: 0, minute: 0 },
                    false
                  )}
                  aria-pressed={selected}
                  onClick={() => {
                    commit({
                      ...current,
                      year: cell.year,
                      month: cell.month,
                      day: cell.day,
                    });
                    if (!time) setOpen(false);
                  }}
                  className={`mx-auto grid h-10 w-10 place-items-center rounded-full text-[14px] tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy ${
                    selected
                      ? "bg-burgundy font-semibold text-ivory shadow-sm"
                      : isToday
                        ? "font-semibold text-night ring-1 ring-gold hover:bg-burgundy/10"
                        : cell.inMonth
                          ? "text-night hover:bg-burgundy/10"
                          : "text-label-2/60 hover:bg-burgundy/10"
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {time && (
            <div className="mt-3 space-y-3 border-t border-hairline pt-3">
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-ink">
                  Hour
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-pressed={h === hour12}
                      aria-label={`${h} o'clock`}
                      onClick={() => commit({ ...current, hour: to24(h, pm) })}
                      className={`${CHIP} ${
                        h === hour12
                          ? "bg-burgundy text-ivory"
                          : "desk-chip text-night"
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gold-ink">
                  Minute
                </p>
                <div className="grid grid-cols-6 gap-1">
                  {MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={m === current.minute}
                      aria-label={`${m} minutes`}
                      onClick={() => commit({ ...current, minute: m })}
                      className={`${CHIP} ${
                        m === current.minute
                          ? "bg-burgundy text-ivory"
                          : "desk-chip text-night"
                      }`}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>
              <div
                role="group"
                aria-label="Morning or afternoon"
                className="grid grid-cols-2 gap-1"
              >
                {(["AM", "PM"] as const).map((half) => {
                  const active = (half === "PM") === pm;
                  return (
                    <button
                      key={half}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        commit({
                          ...current,
                          hour: to24(hour12, half === "PM"),
                        })
                      }
                      className={`${CHIP} ${
                        active
                          ? "bg-burgundy text-ivory"
                          : "desk-chip text-night"
                      }`}
                    >
                      {half}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-3">
            {clearable && parsed ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="min-h-10 rounded-full px-3 text-[13px] font-semibold text-label-2 hover:text-burgundy"
              >
                Clear
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setView({ year: today.year, month: today.month });
                  commit({ ...current, ...today });
                }}
                className="min-h-10 rounded-full px-3 text-[13px] font-semibold text-burgundy hover:underline"
              >
                Today
              </button>
            )}
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

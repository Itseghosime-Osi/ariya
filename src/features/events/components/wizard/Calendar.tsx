"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { parseYmd, toYmd } from "./wizard-data";

const WEEKDAYS = [
  { short: "Mo", full: "Monday" },
  { short: "Tu", full: "Tuesday" },
  { short: "We", full: "Wednesday" },
  { short: "Th", full: "Thursday" },
  { short: "Fr", full: "Friday" },
  { short: "Sa", full: "Saturday" },
  { short: "Su", full: "Sunday" },
];

const longDay = (d: Date) =>
  d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const monthKey = (y: number, m: number) => y * 12 + m;

interface CalendarProps {
  value: string;
  onChange: (ymd: string) => void;
  /** Today, known only in the browser. */
  now: Date;
  /** How many years ahead you can plan. */
  years?: number;
}

/**
 * The Àríyá date picker: an ivory month page with the weekday row in Bodoni, Saturdays marked with a
 * gold dot (owambe day), and your pick pressed like a wax seal. Months slide past; arrow keys, Page Up
 * and Page Down move around like any calendar.
 */
export function Calendar({ value, onChange, now, years = 3 }: CalendarProps) {
  const today = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12),
    [now]
  );
  const last = useMemo(
    () =>
      new Date(
        today.getFullYear() + years,
        today.getMonth(),
        today.getDate(),
        12
      ),
    [today, years]
  );
  const picked = parseYmd(value);
  const start = picked ?? today;
  const [view, setView] = useState({
    y: start.getFullYear(),
    m: start.getMonth(),
  });
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [cursor, setCursor] = useState(
    toYmd(picked && picked >= today ? picked : today)
  );
  const wantFocus = useRef(false);
  const gridRef = useRef<HTMLTableElement>(null);

  // A pick made elsewhere (a quick pick) brings its month into view.
  useEffect(() => {
    if (!picked) return;
    setView((v) => {
      if (v.y === picked.getFullYear() && v.m === picked.getMonth()) return v;
      setDir(
        monthKey(picked.getFullYear(), picked.getMonth()) > monthKey(v.y, v.m)
          ? "forward"
          : "back"
      );
      return { y: picked.getFullYear(), m: picked.getMonth() };
    });
    setCursor(value);
  }, [value]);

  useEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-ymd="${cursor}"]`)
      ?.focus();
  }, [cursor, view]);

  const canPrev =
    monthKey(view.y, view.m) > monthKey(today.getFullYear(), today.getMonth());
  const canNext =
    monthKey(view.y, view.m) < monthKey(last.getFullYear(), last.getMonth());

  const goMonth = (by: number) => {
    const target = monthKey(view.y, view.m) + by;
    if (
      target < monthKey(today.getFullYear(), today.getMonth()) ||
      target > monthKey(last.getFullYear(), last.getMonth())
    )
      return;
    setDir(by > 0 ? "forward" : "back");
    setView({ y: Math.floor(target / 12), m: target % 12 });
  };

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  // Weeks start on Monday.
  const first = new Date(view.y, view.m, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from(
      { length: count },
      (_, i) => new Date(view.y, view.m, i + 1, 12)
    ),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) =>
    cells.slice(w * 7, w * 7 + 7)
  );
  const inRange = (d: Date) => d >= today && d <= last;
  const cursorDate = parseYmd(cursor) ?? today;
  const cursorInView =
    cursorDate.getFullYear() === view.y && cursorDate.getMonth() === view.m;

  const onKeyDown = (e: React.KeyboardEvent) => {
    let next: Date | null = null;
    const c = new Date(cursorDate);
    switch (e.key) {
      case "ArrowLeft":
        c.setDate(c.getDate() - 1);
        next = c;
        break;
      case "ArrowRight":
        c.setDate(c.getDate() + 1);
        next = c;
        break;
      case "ArrowUp":
        c.setDate(c.getDate() - 7);
        next = c;
        break;
      case "ArrowDown":
        c.setDate(c.getDate() + 7);
        next = c;
        break;
      case "PageUp":
        c.setMonth(c.getMonth() - 1);
        next = c;
        break;
      case "PageDown":
        c.setMonth(c.getMonth() + 1);
        next = c;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (next < today) next = today;
    if (next > last) next = last;
    wantFocus.current = true;
    setDir(
      monthKey(next.getFullYear(), next.getMonth()) > monthKey(view.y, view.m)
        ? "forward"
        : "back"
    );
    setView({ y: next.getFullYear(), m: next.getMonth() });
    setCursor(toYmd(next));
  };

  const navBtn =
    "grid h-11 w-11 place-items-center rounded-full border border-gold-ink/25 bg-white/70 text-burgundy transition-[transform,border-color,opacity] hover:border-gold-ink/60 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy";

  return (
    <div
      data-testid="wizard-calendar"
      className="self-start rounded-3xl border border-gold-ink/20 bg-[linear-gradient(160deg,#fffdf8,#f7efe0)] p-4 shadow-[0_18px_40px_-28px_rgba(110,20,38,0.55)] sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className={navBtn}
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <div
          key={`${view.y}-${view.m}`}
          aria-live="polite"
          data-dir={dir}
          className="wiz-in text-center font-display text-xl font-bold text-night"
        >
          {monthLabel}
        </div>
        <button
          type="button"
          onClick={() => goMonth(1)}
          disabled={!canNext}
          aria-label="Next month"
          className={navBtn}
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>

      <table
        ref={gridRef}
        role="grid"
        aria-label={monthLabel}
        onKeyDown={onKeyDown}
        className="w-full table-fixed border-separate border-spacing-y-1"
      >
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th
                key={d.full}
                scope="col"
                abbr={d.full}
                className={cn(
                  "pb-1 text-center font-display text-sm font-semibold italic",
                  d.short === "Sa" ? "text-gold-ink" : "text-label-2"
                )}
              >
                {d.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody key={`${view.y}-${view.m}`} data-dir={dir} className="wiz-in">
          {weeks.map((week, w) => (
            <tr key={w}>
              {week.map((d, i) => {
                if (!d) return <td key={i} />;
                const ymd = toYmd(d);
                const on = ymd === value;
                const ok = inRange(d);
                const sat = d.getDay() === 6;
                const isToday = ymd === toYmd(today);
                const roving =
                  ymd === cursor || (!cursorInView && d.getDate() === 1 && ok);
                return (
                  <td key={i} role="gridcell" className="p-0 text-center">
                    <button
                      type="button"
                      data-ymd={ymd}
                      disabled={!ok}
                      tabIndex={roving ? 0 : -1}
                      aria-pressed={on}
                      aria-label={`${longDay(d)}${sat ? ", a Saturday" : ""}${isToday ? ", today" : ""}`}
                      onClick={() => {
                        setCursor(ymd);
                        onChange(ymd);
                      }}
                      className={cn(
                        "relative mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-full text-sm font-semibold tabular-nums transition-[transform,background-color,color,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy",
                        on
                          ? "wiz-pop scale-105 bg-burgundy text-champagne shadow-[0_8px_18px_-8px_rgba(110,20,38,0.9),0_0_0_3px_rgba(233,201,138,0.55)]"
                          : ok
                            ? "text-night hover:scale-110 hover:bg-gold/25 active:scale-95"
                            : "cursor-not-allowed text-label-3/45",
                        isToday && !on && "ring-1 ring-gold-ink/60",
                        sat &&
                          "after:absolute after:bottom-[5px] after:h-1 after:w-1 after:rounded-full after:transition-colors",
                        sat &&
                          (on ? "after:bg-champagne" : "after:bg-[#b8864b]")
                      )}
                    >
                      {d.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 flex items-center gap-2 text-xs text-label-2">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-[#b8864b]"
        />
        Saturday, owambe day
      </p>
    </div>
  );
}

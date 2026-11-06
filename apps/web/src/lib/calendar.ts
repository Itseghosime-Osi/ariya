/**
 * Calendar maths for the date and time picker. Values are the same strings a native
 * datetime-local / date input holds ("2026-12-12T14:00", "2026-12-12"), so callers keep their
 * existing WAT conversion untouched.
 */

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
}

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

export function parseLocal(
  value: string | null | undefined
): LocalParts | null {
  const m = DATE_TIME.exec((value ?? "").trim());
  if (!m) return null;
  const parts: LocalParts = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: m[4] ? Number(m[4]) : 0,
    minute: m[5] ? Number(m[5]) : 0,
  };
  if (parts.month < 1 || parts.month > 12) return null;
  if (parts.day < 1 || parts.day > daysInMonth(parts.year, parts.month)) {
    return null;
  }
  if (parts.hour > 23 || parts.minute > 59) return null;
  return parts;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatLocal(parts: LocalParts, withTime: boolean): string {
  const date = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
  return withTime ? `${date}T${pad(parts.hour)}:${pad(parts.minute)}` : date;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export interface DayCell {
  year: number;
  month: number;
  day: number;
  inMonth: boolean;
}

/** Six Monday-first weeks that cover the month, so the grid never changes height. */
export function monthGrid(year: number, month: number): DayCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(Date.UTC(year, month - 1, 1 - lead + i));
    cells.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month - 1,
    });
  }
  return cells;
}

export function shiftMonth(
  year: number,
  month: number,
  by: number
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + by, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

/** "Sat 12 Dec 2026, 2:00 PM" (or without the time). */
export function formatDisplay(
  parts: LocalParts | null,
  withTime: boolean
): string {
  if (!parts) return "";
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(",", "");
  if (!withTime) return date;
  const h12 = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
  return `${date}, ${h12}:${pad(parts.minute)} ${parts.hour < 12 ? "AM" : "PM"}`;
}

export function to24(hour12: number, pm: boolean): number {
  return (hour12 % 12) + (pm ? 12 : 0);
}

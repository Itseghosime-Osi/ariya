/**
 * Formatting utilities for Àríyá (Currency in NGN, Africa/Lagos dates, phone normalization).
 */

const ngnFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatKobo(kobo: number): string {
  return ngnFormatter.format(kobo / 100);
}

export function formatLagosDate(
  dateInput: string | Date | number,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }
): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    ...options,
  }).format(new Date(dateInput));
}

export function formatLagosTime(
  dateInput: string | Date | number,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }
): string {
  return formatLagosDate(dateInput, options);
}

export function formatEventDate(
  dateInput: string | Date | number | null | undefined
): string {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const datePart = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    return `${datePart}, ${timePart} WAT`;
  } catch {
    return String(dateInput);
  }
}

export function formatWatDatetimeLocal(
  dateInput: string | Date | number | null | undefined
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

export function parseWatDateToUtc(input: string | null | undefined): string {
  if (!input) return "";
  const str = input.trim();
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const d = new Date(str + "T00:00:00+01:00");
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    if (/[zZ]$|[+-]\d{2}(:?\d{2})?$/.test(str)) {
      const d = new Date(str);
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(str)) {
      const suffix = str.length === 16 ? ":00+01:00" : "+01:00";
      const d = new Date(str.replace(" ", "T") + suffix);
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  } catch {
    return "";
  }
}

export function getLagosDateKey(
  dateInput: string | Date | number | null | undefined
): string | null {
  if (dateInput === null || dateInput === undefined || dateInput === "")
    return null;
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function daysBetweenLagos(
  targetInput: string | Date | number,
  fromInput: string | Date | number = new Date()
): number {
  const targetKey = getLagosDateKey(targetInput);
  const fromKey = getLagosDateKey(fromInput);
  if (!targetKey || !fromKey) return NaN;
  const targetUtc = Date.parse(`${targetKey}T00:00:00Z`);
  const fromUtc = Date.parse(`${fromKey}T00:00:00Z`);
  return Math.round((targetUtc - fromUtc) / 86_400_000);
}

export function daysUntil(
  dateInput: string | Date | number,
  fromInput: string | Date | number = new Date()
): number {
  const diff = daysBetweenLagos(dateInput, fromInput);
  return Number.isNaN(diff) ? 0 : Math.max(0, diff);
}

export function formatRelativeTimeWAT(
  dateInput: string | Date | number | null | undefined,
  nowInput: string | Date | number = new Date()
): string {
  if (!dateInput) return "";
  const d = new Date(dateInput).getTime();
  const now = new Date(nowInput).getTime();
  if (Number.isNaN(d) || Number.isNaN(now)) return "";
  const diffSec = Math.max(0, Math.floor((now - d) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const diffDay = Math.max(1, daysBetweenLagos(nowInput, dateInput));
  if (!Number.isNaN(diffDay) && diffDay <= 14) return `${diffDay}d ago`;
  return formatLagosDate(dateInput, { day: "numeric", month: "short" });
}

export function normalizePhone(rawPhone: string): string | null {
  const cleaned = String(rawPhone || "").replace(/[^\d+]/g, "");
  if (/^\+234\d{10}$/.test(cleaned)) return cleaned;
  if (/^234\d{10}$/.test(cleaned)) return "+" + cleaned;
  if (/^0\d{10}$/.test(cleaned)) return "+234" + cleaned.slice(1);
  return null;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const match = phone.match(/^\+234(\d{3})(\d{3})(\d{4})$/);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : phone;
}

export function getLagosGreeting(now: Date = new Date()): string {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const hour = Number.parseInt(hourStr, 10) % 24;
  return hour < 12
    ? "Good morning"
    : hour < 17
      ? "Good afternoon"
      : "Good evening";
}

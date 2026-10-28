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
  const date =
    typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    ...options,
  }).format(date);
}

export function formatLagosTime(
  dateInput: string | Date | number,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }
): string {
  const date =
    typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    ...options,
  }).format(date);
}

/**
 * Format user-facing event date as "12 Dec 2026, 2:00 PM WAT" in Africa/Lagos timezone.
 */
export function formatEventDate(
  dateInput: string | Date | number | null | undefined
): string {
  if (!dateInput) return "";
  try {
    const d =
      typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
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
  const d =
    typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput);
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
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(str)) {
      const d = new Date(str.replace(" ", "T") + ":00+01:00");
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(str)) {
      const d = new Date(str.replace(" ", "T") + "+01:00");
      return isNaN(d.getTime()) ? "" : d.toISOString();
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  } catch {
    return "";
  }
}

export function daysUntil(dateInput: string | Date | number): number {
  const target = new Date(dateInput).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
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
  if (match) {
    return `0${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
}

export function getLagosDateKey(
  dateInput: string | Date | null | undefined
): string | null {
  if (!dateInput) return null;
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function daysBetweenLagos(
  targetInput: string | Date,
  fromInput: string | Date = new Date()
): number {
  const targetKey = getLagosDateKey(targetInput);
  const fromKey = getLagosDateKey(fromInput);
  if (!targetKey || !fromKey) return NaN;
  const targetUtc = Date.parse(`${targetKey}T00:00:00Z`);
  const fromUtc = Date.parse(`${fromKey}T00:00:00Z`);
  return Math.round((targetUtc - fromUtc) / 86_400_000);
}

export function getLagosGreeting(now: Date = new Date()): string {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const hour = Number.parseInt(hourStr, 10) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

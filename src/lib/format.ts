/**
 * Formatting utilities for Àríyá (Currency in NGN, Africa/Lagos dates, phone normalization).
 */

const ngnFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Format money in integer kobo to NGN currency string.
 * e.g., 2500000 kobo -> ₦25,000
 */
export function formatKobo(kobo: number): string {
  return ngnFormatter.format(kobo / 100);
}

/**
 * Format date in Africa/Lagos timezone.
 */
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

/**
 * Format time in Africa/Lagos timezone.
 */
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

/**
 * Converts a datetime input from the wizard (WAT, Africa/Lagos, UTC+1) into an ISO UTC string.
 * e.g. "2026-12-12T14:00" in WAT -> "2026-12-12T13:00:00.000Z"
 */
export function parseWatDateToUtc(input: string | null | undefined): string {
  if (!input) return "";
  const str = input.trim();
  if (/[zZ]$|[+-]\d{2}(:?\d{2})?$/.test(str)) {
    return new Date(str).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(str)) {
    return new Date(str.replace(" ", "T") + ":00+01:00").toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$/.test(str)) {
    return new Date(str.replace(" ", "T") + "+01:00").toISOString();
  }
  return new Date(str).toISOString();
}

/**
 * Calculate days remaining until target date (0 if today or in the past).
 */
export function daysUntil(dateInput: string | Date | number): number {
  const target = new Date(dateInput).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Normalize Nigerian phone numbers to E.164 (+234...)
 */
export function normalizePhone(rawPhone: string): string | null {
  const cleaned = String(rawPhone || "").replace(/[^\d+]/g, "");
  if (/^\+234\d{10}$/.test(cleaned)) return cleaned;
  if (/^234\d{10}$/.test(cleaned)) return "+" + cleaned;
  if (/^0\d{10}$/.test(cleaned)) return "+234" + cleaned.slice(1);
  return null;
}

/**
 * Format Nigerian phone number for human-friendly display: e.g. 0803 123 4567
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const match = phone.match(/^\+234(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `0${match[1]} ${match[2]} ${match[3]}`;
  }
  return phone;
}

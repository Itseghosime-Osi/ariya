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

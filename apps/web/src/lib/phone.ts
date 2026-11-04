/**
 * Utilities for normalizing and formatting telephone numbers.
 * Defaults to Nigerian standard (+234) for local formats while
 * preserving international dialing codes in valid E.164 format.
 */

/**
 * Normalizes an arbitrary phone string into canonical E.164 format.
 * Defaults to Nigeria (+234) if no international country code is present.
 * Returns null if the input is empty or invalid.
 */
export function normalizePhoneNumber(
  input: string | null | undefined
): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Strip all non-digit characters except leading '+'
  const hasPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (!digitsOnly) {
    return null;
  }

  // Case 1: Already has leading '+'
  if (hasPlus) {
    // Valid E.164 length is between 8 and 15 digits
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
    return null;
  }

  // Case 2: Starts with country code 234 without '+'
  if (digitsOnly.startsWith("234") && digitsOnly.length === 13) {
    return `+${digitsOnly}`;
  }

  // Case 3: Local Nigerian format with leading 0 (e.g. 08031234567, 11 digits)
  if (digitsOnly.startsWith("0") && digitsOnly.length === 11) {
    return `+234${digitsOnly.slice(1)}`;
  }

  // Case 4: Local Nigerian format without leading 0 (e.g. 8031234567, 10 digits)
  if (digitsOnly.length === 10) {
    return `+234${digitsOnly}`;
  }

  // Case 5: Other international without plus (e.g. 15551234567)
  if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }

  return null;
}

/**
 * Formats an E.164 phone number for readable display in UI.
 * e.g. +2348031234567 -> +234 803 123 4567
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) {
    return "—";
  }

  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return phone;
  }

  if (normalized.startsWith("+234") && normalized.length === 14) {
    // +234 803 123 4567
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7, 10)} ${normalized.slice(10)}`;
  }

  return normalized;
}

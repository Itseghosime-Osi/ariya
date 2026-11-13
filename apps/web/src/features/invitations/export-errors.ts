/**
 * Turns whatever an export threw into a message that says what happened and what to do next.
 * Messages that already carry a next step (a picture to replace, a size to change) pass through
 * unchanged; anything else gets the plain fallback, so a raw browser error never reaches the host
 * on its own.
 */
const HAS_NEXT_STEP =
  /\b(try again|replace it|choose|adjust|reload|reconnect|check your connection)\b/i;

export function describeExportFailure(raw: unknown): string {
  const text =
    raw instanceof Error
      ? raw.message.trim()
      : typeof raw === "string"
        ? raw.trim()
        : "";
  if (text && HAS_NEXT_STEP.test(text)) return text;
  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline)
    return "The file could not be made because you are offline. Reconnect and try again; nothing was downloaded.";
  return "The file could not be made. Try again, or pick another format (a PNG works for most cards); nothing was downloaded.";
}

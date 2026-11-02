/**
 * What a database refusal leaves behind: the SQLSTATE and, when the refusal came from one of our own
 * RPCs, the hint token it raised. Both are fixed vocabularies, so a code can never quote a guest the
 * way an error message can.
 */
export interface ToolDiagnostic {
  code: string;
  hint?: string;
}

const SQLSTATE = /^[0-9A-Z]{5}$/;
const HINT_TOKEN = /^[A-Z][A-Z0-9_]{0,63}$/;

/**
 * Reduces a driver error to the two fields worth keeping. A message is dropped outright — it is the
 * field that names tables and policies and, on a constraint violation, can name the row that broke
 * them. A hint is kept only when it looks like one of the tokens our migrations raise
 * (`NOT_PERMITTED`, `ROW_INVALID`, `PENDING_LIMIT`), so a hint that grew a sentence carries nothing.
 */
export function diagnosticOf(error: unknown): ToolDiagnostic | null {
  if (!error || typeof error !== "object") return null;

  const { code, hint } = error as { code?: unknown; hint?: unknown };
  if (typeof code !== "string" || !SQLSTATE.test(code)) return null;

  const token = typeof hint === "string" ? hint.trim() : "";
  return HINT_TOKEN.test(token) ? { code, hint: token } : { code };
}

/** The form both the log line and the activity note use: `42501 NOT_PERMITTED`. */
export function describeDiagnostic(diagnostic: ToolDiagnostic): string {
  return diagnostic.hint
    ? `${diagnostic.code} ${diagnostic.hint}`
    : diagnostic.code;
}

/**
 * The note a host reads on Connect your AI, with the code appended when there is one. The note goes
 * on saying what did not happen; the code says why, without repeating a message.
 */
export function diagnosticNote(
  note: string | null | undefined,
  diagnostic: ToolDiagnostic | null
): string | null {
  if (!diagnostic) return note ?? null;

  const code = describeDiagnostic(diagnostic);
  return note ? `${note} (${code})` : code;
}

/**
 * Centralized application error mapper.
 * Safely transforms internal Supabase, PostgREST, and auth errors
 * into clear, user-friendly messages without leaking internal schemas or secrets.
 */

export interface ErrorLike {
  message?: string;
  code?: string;
  hint?: string;
  details?: string;
}

export function mapError(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (!error) return fallback;

  let message = "";
  let code = "";
  let hint = "";

  if (typeof error === "string") {
    message = error;
    code = error;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === "string") message = errObj.message;
    if (typeof errObj.code === "string") code = errObj.code;
    if (typeof errObj.hint === "string") hint = errObj.hint;
  }

  // 1. Structured database exceptions carrying stable HINT codes (SQLSTATE P0001 / 42501)
  if (hint) {
    const cleanHint = hint.trim().toUpperCase();
    switch (cleanHint) {
      case "CAPACITY_EXCEEDED": {
        // Whitelisted structured detail: available seats
        const match = message.match(/available:\s*(\d+)/i);
        if (match) {
          const avail = match[1];
          return `Table capacity exceeded. Only ${avail} seat${avail === "1" ? "" : "s"} available.`;
        }
        return "Table capacity exceeded for this assignment.";
      }
      case "NOT_PERMITTED":
        return "You do not have permission to perform this action.";
      case "ROW_INVALID":
        return "The provided information does not meet the required format or criteria.";
      case "RSVP_CLOSED":
        return "This celebration is no longer accepting RSVP responses.";
      case "RSVP_DEADLINE_PASSED":
        return "The RSVP deadline for this celebration has passed.";
      case "ATTENDEE_COUNT_INVALID":
        return "The requested attendee count is not permitted for this party.";
      case "GUEST_NOT_FOUND":
        return "Guest record could not be found.";
      case "EVENT_NOT_FOUND":
        return "Celebration could not be found.";
      case "TABLE_NOT_FOUND":
        return "Assigned table could not be found.";
      default:
        break;
    }
  }

  const lowerCode = code.toLowerCase();
  const lowerMsg = message.toLowerCase();

  // 2. Standard PostgreSQL SQLSTATE Codes
  if (code === "42501" || lowerCode === "42501") {
    return "You do not have permission to perform this action.";
  }
  if (code === "23505") {
    if (lowerMsg.includes("slug")) {
      return "An event with a similar title already exists. Please choose a slightly different title.";
    }
    if (lowerMsg.includes("phone") || lowerMsg.includes("email")) {
      return "A guest with this contact information is already registered for this celebration.";
    }
    return "A record with this information already exists in the system.";
  }
  if (code === "23503") {
    return "The referenced item could not be found or has been removed.";
  }
  if (code === "23514") {
    if (lowerMsg.includes("guests_side_check")) {
      return "Invalid event side selected. Must be bride, groom, family, vip, planner, or mutual.";
    }
    return "The provided information does not meet the required format or criteria.";
  }

  // 3. Supabase Auth codes and known messages
  if (
    lowerCode === "invalid_credentials" ||
    lowerMsg.includes("invalid login credentials") ||
    lowerMsg.includes("invalid credentials") ||
    lowerMsg.includes("invalid email or password")
  ) {
    return "Invalid email or password. Please verify your credentials and try again.";
  }
  if (
    lowerCode === "user_already_exists" ||
    lowerMsg.includes("user already registered") ||
    lowerMsg.includes("email already in use") ||
    lowerMsg.includes("email address is already registered")
  ) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (
    lowerCode === "weak_password" ||
    lowerMsg.includes("password should be at least") ||
    lowerMsg.includes("weak password")
  ) {
    return "Password is too weak. Please use at least 8 characters including numbers and symbols.";
  }
  if (
    lowerCode === "over_email_send_rate_limit" ||
    lowerCode === "rate_limit_exceeded" ||
    lowerMsg.includes("over_email_send_rate_limit") ||
    lowerMsg.includes("too many requests")
  ) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  if (
    lowerCode === "email_not_confirmed" ||
    lowerMsg.includes("email not confirmed")
  ) {
    return "Your email address has not been confirmed. Please check your inbox for the confirmation link.";
  }
  if (
    lowerCode === "session_expired" ||
    lowerCode === "invalid_grant" ||
    lowerMsg.includes("session expired") ||
    lowerMsg.includes("token has expired")
  ) {
    return "Your session or security token has expired. Please sign in again.";
  }

  // 4. Anything unknown gets logged server-side and returns the safe generic fallback
  console.error("[mapError] Unhandled error:", { code, hint, message });
  return fallback;
}

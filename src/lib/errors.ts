/**
 * Centralized application error mapper.
 * Safely transforms internal Supabase, PostgREST, and auth errors
 * into clear, user-friendly messages without leaking internal schemas or secrets.
 */

export function mapError(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (!error) return fallback;

  let message = "";
  let code = "";

  if (typeof error === "string") {
    message = error;
  } else if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === "string") {
      message = errObj.message;
    }
    if (typeof errObj.code === "string") {
      code = errObj.code;
    }
  }

  const lowerMsg = message.toLowerCase();
  const lowerCode = code.toLowerCase();

  // Supabase Auth Mappings
  if (
    lowerMsg.includes("invalid login credentials") ||
    lowerMsg.includes("invalid credentials") ||
    lowerMsg.includes("invalid_credentials") ||
    lowerMsg.includes("invalid email or password") ||
    lowerCode === "invalid_credentials"
  ) {
    return "Invalid email or password. Please verify your credentials and try again.";
  }

  if (
    lowerMsg.includes("user already registered") ||
    lowerMsg.includes("email already in use") ||
    lowerMsg.includes("email address is already registered") ||
    lowerCode === "user_already_exists"
  ) {
    return "An account with this email address already exists. Please sign in instead.";
  }

  if (
    lowerMsg.includes("password should be at least") ||
    lowerMsg.includes("weak password") ||
    lowerCode === "weak_password"
  ) {
    return "Password is too weak. Please use at least 8 characters including numbers and symbols.";
  }

  if (
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("too many requests") ||
    lowerMsg.includes("over_email_send_rate_limit") ||
    lowerCode === "over_email_send_rate_limit" ||
    lowerCode === "rate_limit_exceeded"
  ) {
    return "Too many requests. Please wait a moment before trying again.";
  }

  if (
    lowerMsg.includes("email not confirmed") ||
    lowerCode === "email_not_confirmed"
  ) {
    return "Your email address has not been confirmed. Please check your inbox for the confirmation link.";
  }

  if (
    lowerMsg.includes("token has expired") ||
    lowerMsg.includes("session expired") ||
    lowerCode === "session_expired" ||
    lowerCode === "invalid_grant"
  ) {
    return "Your session or security token has expired. Please sign in again.";
  }

  if (lowerMsg.includes("user not found")) {
    return "No account found matching the provided details.";
  }

  // Database & PostgREST Mappings
  if (
    code === "23505" ||
    lowerMsg.includes("duplicate key") ||
    lowerMsg.includes("unique constraint")
  ) {
    if (lowerMsg.includes("slug")) {
      return "An event with a similar title already exists. Please choose a slightly different title.";
    }
    if (lowerMsg.includes("phone") || lowerMsg.includes("email")) {
      return "A guest with this contact information is already registered for this celebration.";
    }
    return "A record with this information already exists in the system.";
  }

  if (
    code === "42501" ||
    lowerMsg.includes("row-level security") ||
    lowerMsg.includes("permission denied")
  ) {
    return "You do not have permission to perform this action.";
  }

  if (code === "23503" || lowerMsg.includes("foreign key")) {
    return "The referenced item could not be found or has been removed.";
  }

  if (code === "23514" || lowerMsg.includes("check constraint")) {
    if (lowerMsg.includes("guests_side_check")) {
      return "Invalid event side selected. Must be bride, groom, family, vip, planner, or mutual.";
    }
    return "The provided information does not meet the required format or criteria.";
  }

  // Application custom exceptions (from PostgreSQL RAISE EXCEPTION)
  if (code === "22000" || lowerMsg.includes("payload exceeds")) {
    return message;
  }
  if (
    lowerMsg.includes("you must be an owner or planner") ||
    lowerMsg.includes("guest name cannot be empty") ||
    lowerMsg.includes("row ")
  ) {
    return message;
  }

  return fallback;
}

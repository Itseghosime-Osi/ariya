import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Where Google sends the person back to after they choose an account. The callback route trades the
 * one-time code for a session, then follows `next`, which only ever stays inside this app.
 */
export function oauthCallbackUrl(origin: string, next?: string | null): string {
  const url = new URL("/auth/callback", origin);
  const safe = safeRedirectPath(next, "/events");
  if (safe !== "/events") url.searchParams.set("next", safe);
  return url.toString();
}

/** What the sign-in page says when Google, or the callback, did not finish. */
export function oauthFailureMessage(code: string | null): string | null {
  switch (code) {
    case "oauth_cancelled":
      return "Google sign-in was cancelled. Choose an account to try again, or use your email.";
    case "oauth_failed":
      return "We could not finish signing you in with Google. Please try again, or use your email.";
    default:
      return null;
  }
}

/**
 * Google sign-in is switched on with NEXT_PUBLIC_GOOGLE_SIGN_IN=true once the provider is enabled in
 * Supabase, so the button never appears before it can work.
 */
export function googleSignInEnabled(flag: string | undefined): boolean {
  return flag === "true";
}

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const providerError = requestUrl.searchParams.get("error");
  const next = safeRedirectPath(rawNext, "/events");

  // The person closed Google's window or declined: say so, rather than "that link expired".
  if (providerError) {
    const cancelled = providerError === "access_denied";
    return NextResponse.redirect(
      new URL(
        `/sign-in?error=${cancelled ? "oauth_cancelled" : "oauth_failed"}`,
        request.url
      )
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // No code, or Google's code would not exchange: back to sign-in with a notice
  return NextResponse.redirect(
    new URL("/sign-in?error=auth_callback_failed", request.url)
  );
}

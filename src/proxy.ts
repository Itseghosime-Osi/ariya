import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { safeRedirectPath } from "@/lib/safe-redirect";

// Note: /reset-password is deliberately excluded from AUTH_PATHS so
// that users arriving via a password-recovery link (who receive a temporary
// recovery session from Supabase) can access the reset form rather than being
// prematurely redirected away.
const AUTH_PATHS = ["/sign-in", "/sign-up", "/forgot-password"];

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isAuthPath = AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  const isEventsPath =
    pathname === "/events" || pathname.startsWith("/events/");

  if (!user && isEventsPath) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("next", `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (user && isAuthPath) {
    const rawNext = request.nextUrl.searchParams.get("next");
    const target = safeRedirectPath(rawNext, "/events");
    const redirectUrl = new URL(target, request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - site (marketing site)
     * - assets (static site assets)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|site|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

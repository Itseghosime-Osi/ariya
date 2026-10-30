import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Note: /reset-password is deliberately excluded from AUTH_PATHS so
// that users arriving via a password-recovery link (who receive a temporary
// recovery session from Supabase) can access the reset form rather than being
// prematurely redirected away.
const AUTH_PATHS = ["/sign-in", "/sign-up", "/forgot-password"];

// Public paths that never need a Supabase session check.
// Checking auth on these causes a ~25 s hang when the local Supabase instance
// is unreachable (AuthRetryableFetchError, status: 0).
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/product",
  "/pricing",
  "/story",
  "/film",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Public event pages, invite links, API webhooks / cron, and auth routes
  // are all safe to bypass.
  if (
    pathname.startsWith("/e/") ||
    pathname.startsWith("/i/") ||
    pathname.startsWith("/api/webhooks/") ||
    pathname.startsWith("/api/cron/")
  )
    return true;
  // Auth paths (sign-in, sign-up, forgot-password) are treated as public.
  // Redirecting an already-logged-in user away from these pages is handled
  // inside the app (sign-in page server action) so we avoid a Supabase
  // network call in the proxy on every visit — that call can hang for ~25 s
  // when the local Supabase instance is unreachable.
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
    return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Fast-path: skip the Supabase round-trip entirely for public/auth routes.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Protected routes — fetch the session. This is the only place we pay the
  // Supabase latency cost, and only when the browser navigates to app routes.
  const { supabaseResponse, user } = await updateSession(request);

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

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - site / assets (marketing static assets)
     * - files with common media extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|site|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};

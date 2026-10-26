import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - site (legacy marketing site)
     * - assets (legacy static site assets)
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|site|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

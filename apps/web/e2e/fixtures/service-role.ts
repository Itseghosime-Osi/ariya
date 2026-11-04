import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The service-role client, built the way `createAdminClient()` in `src/lib/supabase/admin.ts`
 * builds it. That module opens with `import "server-only"`, which throws when anything outside a
 * React Server Component imports it — the Playwright runner is plain Node — so the two lines are
 * repeated here rather than imported.
 */
export function serviceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Seeding needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, the same values the app reads from .env.local."
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

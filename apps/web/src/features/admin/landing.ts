import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { adminBase } from "./path";

/**
 * Where to go after signing in. A link that asked for a page (`next`) always wins. Otherwise an
 * admin lands on the admin desk, which asks for their authenticator code first, and everyone else
 * on their celebrations. The desk's secret address is only ever sent to an admin.
 */
export async function landingAfterSignIn(
  userId: string | null | undefined,
  requestedNext: string | null | undefined
): Promise<string> {
  if (requestedNext) return safeRedirectPath(requestedNext, "/events");
  const base = adminBase();
  if (!userId || !base) return "/events";
  try {
    const { data } = await createAdminClient().rpc("is_platform_admin", {
      p_user: userId,
    });
    return data === true ? base : "/events";
  } catch {
    return "/events";
  }
}

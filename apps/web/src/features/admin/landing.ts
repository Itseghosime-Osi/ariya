import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Where to go after signing in. A link that asked for a page (`next`) always wins. Otherwise an
 * admin lands on the admin desk, which asks for their authenticator code first, and everyone else
 * on their celebrations.
 */
export async function landingAfterSignIn(
  userId: string | null | undefined,
  requestedNext: string | null | undefined
): Promise<string> {
  if (requestedNext) return safeRedirectPath(requestedNext, "/events");
  if (!userId) return "/events";
  try {
    const { data } = await createAdminClient().rpc("is_platform_admin", {
      p_user: userId,
    });
    return data === true ? "/admin" : "/events";
  } catch {
    return "/events";
  }
}

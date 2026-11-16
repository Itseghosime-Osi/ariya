import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAuthEmail } from "@/lib/email/auth-mail";
import { welcomeEmail } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/site-url";

/** Marks the account once the welcome email has gone, so nobody is ever welcomed twice. */
export const WELCOME_SENT_KEY = "welcome_email_sent_at";

/**
 * Sends the welcome email once per person: after they confirm their email address, or the first
 * time they sign in with Google. The account remembers that it was sent, so a second confirmation
 * link, a quick second sign-in or a retry never sends it again. Never throws: a welcome that could
 * not be sent must not stop anyone signing in.
 */
export async function sendWelcomeEmailOnce(
  user: Pick<User, "id" | "email" | "user_metadata"> | null | undefined
): Promise<void> {
  try {
    if (!user?.email) return;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta[WELCOME_SENT_KEY]) return;

    const admin = createAdminClient();
    // Read it fresh: the session's copy can be a moment behind another tab's sign-in.
    const { data } = await admin.auth.admin.getUserById(user.id);
    const current = (data.user?.user_metadata ?? meta) as Record<
      string,
      unknown
    >;
    if (current[WELCOME_SENT_KEY]) return;

    // Claim it before sending, so two sign-ins at once cannot both send.
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...current,
        [WELCOME_SENT_KEY]: new Date().toISOString(),
      },
    });
    if (error) return;

    const name =
      (current.full_name as string | undefined) ??
      (current.name as string | undefined) ??
      null;
    const email = welcomeEmail({ name, email: user.email, siteUrl: SITE_URL });
    await sendAuthEmail({ to: user.email, ...email });
  } catch (err) {
    console.error(
      "Welcome email failed:",
      err instanceof Error ? err.constructor.name : "UnknownError"
    );
  }
}

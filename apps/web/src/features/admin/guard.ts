import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Who may open /admin.
 *
 * Two things must be true: the signed-in account is in `platform_admins`, and this session passed
 * two-step sign-in (an authenticator code, assurance level `aal2`). Anyone else is shown a plain
 * "page not found", so the desk does not announce itself.
 */
export interface AdminIdentity {
  userId: string;
  email: string;
}

export type AdminState =
  | { kind: "none" }
  | {
      kind: "needs-second-step";
      admin: AdminIdentity;
      /** True once an authenticator app is set up; false means it must be set up first. */
      hasAuthenticator: boolean;
    }
  | { kind: "admin"; admin: AdminIdentity };

export const getAdminState = cache(async (): Promise<AdminState> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { kind: "none" };

  const { data: isAdmin, error } = await createAdminClient().rpc(
    "is_platform_admin",
    { p_user: user.id }
  );
  if (error || isAdmin !== true) return { kind: "none" };

  const admin = { userId: user.id, email: user.email };
  const { data: level } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (level?.currentLevel === "aal2") return { kind: "admin", admin };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  return {
    kind: "needs-second-step",
    admin,
    hasAuthenticator: (factors?.totp ?? []).some(
      (f) => f.status === "verified"
    ),
  };
});

/** For admin pages: the admin, or a 404 (not an admin) or the code screen (second step missing). */
export async function requireAdmin(): Promise<AdminIdentity> {
  const state = await getAdminState();
  if (state.kind === "none") notFound();
  if (state.kind === "needs-second-step") redirect("/admin/verify");
  return state.admin;
}

/** For admin server actions: the admin, or null. Actions answer "not allowed" rather than redirect. */
export async function adminForAction(): Promise<AdminIdentity | null> {
  const state = await getAdminState();
  return state.kind === "admin" ? state.admin : null;
}

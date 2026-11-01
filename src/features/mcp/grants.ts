"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CONNECT_AI_PATH, type ActionResult, type ConnectedApp } from "./types";

const SIGNED_OUT = "Sign in to see which apps are connected to your account.";
const READ_FAILED = "Could not load your connected apps right now.";
const REVOKE_FAILED = "Could not disconnect that app. Please try again.";

/** What each app may do, in the host's words. An unknown scope is shown as-is rather than hidden. */
export async function listConnectedApps(): Promise<
  ActionResult<ConnectedApp[]>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: SIGNED_OUT };

  const { data, error } = await supabase.auth.oauth.listGrants();
  if (error || !data) return { ok: false, error: READ_FAILED };

  return {
    ok: true,
    data: data.map((grant) => ({
      clientId: grant.client.id,
      name: grant.client.name || "An unnamed app",
      logoUrl: grant.client.logo_uri || null,
      website: grant.client.uri || null,
      grantedAt: grant.granted_at,
      scopes: grant.scopes ?? [],
    })),
  };
}

/**
 * Revoking marks the consent revoked and drops the app's sessions and refresh tokens, so its next
 * call is rejected at the front door rather than partway through a tool.
 */
export async function disconnectApp(
  clientId: string
): Promise<ActionResult<{ clientId: string }>> {
  if (!clientId.trim()) {
    return { ok: false, error: "That app could not be identified." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: SIGNED_OUT };

  const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
  if (error) return { ok: false, error: REVOKE_FAILED };

  revalidatePath(CONNECT_AI_PATH);
  return { ok: true, data: { clientId } };
}

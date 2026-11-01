"use server";

import { createClient } from "@/lib/supabase/server";

export type ConsentDecisionState =
  { ok: true; redirectUrl: string } | { ok: false; error: string };

/**
 * Records the host's answer to an OAuth authorization request. Supabase Auth owns the codes, PKCE and
 * redirect construction, so this only forwards the decision and hands back the URL to send the
 * browser to. The URL points at the OAuth client's registered redirect URI, which is why it is used
 * as-is rather than passed through `safeRedirectPath`.
 */
export async function decideConsentAction(
  _previous: ConsentDecisionState | null,
  formData: FormData
): Promise<ConsentDecisionState> {
  const authorizationId = formData.get("authorization_id");
  const decision = formData.get("decision");

  if (typeof authorizationId !== "string" || !authorizationId) {
    return {
      ok: false,
      error: "That request is no longer valid. Try connecting again.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Your session ended. Sign in and approve again.",
    };
  }

  const { data, error } =
    decision === "approve"
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, {
          skipBrowserRedirect: true,
        });

  if (error || !data?.redirect_url) {
    return {
      ok: false,
      error: "We could not save that choice. Please try again.",
    };
  }

  return { ok: true, redirectUrl: data.redirect_url };
}

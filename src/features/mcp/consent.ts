"use server";

import { createClient } from "@/lib/supabase/server";
import { UNKNOWN_APP_ACKNOWLEDGEMENT, classifyApp } from "./app-trust";

export type ConsentDecisionState =
  { ok: true; redirectUrl: string } | { ok: false; error: string };

const UNVERIFIED_REFUSED =
  "We do not recognise this app. Tick the acknowledgement to say you understand the risk, then approve.";

/**
 * Records the host's answer to an OAuth authorization request. Supabase Auth owns the codes, PKCE and
 * redirect construction, so this only forwards the decision and hands back the URL to send the
 * browser to. The URL points at the OAuth client's registered redirect URI, which is why it is used
 * as-is rather than passed through `safeRedirectPath`.
 *
 * The app is classified again here, from the redirect URI Supabase reports. The checkbox on the card
 * is a prompt, not a permission: an acknowledgement posted for a known app does not make an unknown
 * one approvable, and the tier never comes from the form.
 */
export async function decideConsentAction(
  _previous: ConsentDecisionState | null,
  formData: FormData
): Promise<ConsentDecisionState> {
  const authorizationId = formData.get("authorization_id");
  const decision = formData.get("decision");
  const acknowledged =
    formData.get("acknowledge_unknown_app") === UNKNOWN_APP_ACKNOWLEDGEMENT;

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

  const { data: details, error: detailsError } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (detailsError || !details) {
    return {
      ok: false,
      error:
        "That request has expired. Start the connection again from the app.",
    };
  }

  // Supabase answers with a finished redirect when this host has already granted these scopes.
  if (!("authorization_id" in details)) {
    if (decision === "approve") {
      return { ok: true, redirectUrl: details.redirect_url };
    }
  } else if (decision === "approve") {
    const trust = classifyApp(details.redirect_uri);

    if (trust.tier === "unknown" && !acknowledged) {
      return { ok: false, error: UNVERIFIED_REFUSED };
    }
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

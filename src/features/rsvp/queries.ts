import "server-only";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import type { InvitationData, RsvpViewMode } from "./types";

export interface GetInvitationResult {
  data: InvitationData | null;
  state: RsvpViewMode;
  rateLimited?: boolean;
}

export async function getInvitationByToken(
  token: string,
  isReviseRequested: boolean = false
): Promise<GetInvitationResult> {
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length < 10) {
    return { data: null, state: "invalid_link" };
  }

  // Rate limit token lookups: max 40 lookups per minute per token
  const rateLimit = checkRateLimit(`invitation_lookup:${cleanToken}`, 40);
  if (!rateLimit.success) {
    return { data: null, state: "invalid_link", rateLimited: true };
  }

  // Call get_invitation RPC strictly (never direct table access)
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation", {
    p_token: cleanToken,
  });

  if (error || !data || typeof data !== "object") {
    return { data: null, state: "invalid_link" };
  }

  const raw = data as unknown as InvitationData;
  if (!raw.guest || !raw.event) {
    return { data: null, state: "invalid_link" };
  }

  // Determine ceremonial RSVP state
  if (raw.event.status !== "active") {
    return { data: raw, state: "closed" };
  }

  if (raw.event.rsvp_by && new Date(raw.event.rsvp_by).getTime() < Date.now()) {
    return { data: raw, state: "deadline_passed" };
  }

  if (raw.rsvp && raw.rsvp.responded_at) {
    if (isReviseRequested) {
      return { data: raw, state: "revise" };
    }
    return { data: raw, state: "already_replied" };
  }

  return { data: raw, state: "active" };
}

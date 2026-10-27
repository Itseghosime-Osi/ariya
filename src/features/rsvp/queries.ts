import "server-only";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimitByKeyAndIp } from "@/lib/rate-limit";
import { invitationDataSchema } from "./schemas";
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

  const supabase = await createClient();

  // Rate limit token lookups keyed by token AND hashed client IP
  const rateLimit = await checkRateLimitByKeyAndIp({
    prefix: "lookup",
    identifier: cleanToken,
    tokenLimit: 40,
    ipLimit: 120,
  });

  if (!rateLimit.success) {
    return { data: null, state: "invalid_link", rateLimited: true };
  }

  // Call get_invitation RPC strictly (never direct table access)
  const { data, error } = await supabase.rpc("get_invitation", {
    p_token: cleanToken,
  });

  if (error || !data) {
    return { data: null, state: "invalid_link" };
  }

  // Validate database payload strictly with Zod
  const parsed = invitationDataSchema.safeParse(data);
  if (!parsed.success) {
    return { data: null, state: "invalid_link" };
  }

  const inv = parsed.data;

  // Determine ceremonial RSVP state
  if (inv.event.status !== "active") {
    return { data: inv, state: "closed" };
  }

  if (inv.event.rsvp_by && new Date(inv.event.rsvp_by).getTime() < Date.now()) {
    return { data: inv, state: "deadline_passed" };
  }

  if (inv.rsvp && inv.rsvp.responded_at) {
    if (isReviseRequested) {
      return { data: inv, state: "revise" };
    }
    return { data: inv, state: "already_replied" };
  }

  return { data: inv, state: "active" };
}

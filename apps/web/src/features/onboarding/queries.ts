import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FirstStepsStatus } from "./state";

/**
 * How far a celebration is through its first steps, as counts only (head requests: no rows come
 * back). A count that fails reads as nought, so the card at worst leaves a step unticked.
 */
export async function getFirstStepsStatus(
  eventId: string,
  guests: number
): Promise<FirstStepsStatus> {
  const supabase = await createClient();
  const count = (r: { count: number | null; error: unknown }) =>
    r.error ? 0 : (r.count ?? 0);
  const [design, sent, tables, members, invites] = await Promise.all([
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("id", eventId)
      .not("invitation_design", "is", null),
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .not("invited_at", "is", null),
    supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("event_members")
      .select("user_id", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("event_invites")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);
  return {
    guests,
    invitationDesigned: count(design) > 0,
    invitesSent: count(sent),
    tables: count(tables),
    // The creator is a member from the start; an invite sent counts as the team begun.
    teamMembers: count(members) + count(invites),
  };
}

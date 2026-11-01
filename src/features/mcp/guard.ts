import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ToolError } from "./result";

export interface ToolContext {
  client: SupabaseClient<Database>;
  user: User;
  /** The connected app behind the token, or null when the host called with their own session. */
  clientId: string | null;
}

/** Who may change a celebration. */
const WRITE_ROLES = ["owner", "planner"];
/** Who may read one: everyone the team page can add. */
const READ_ROLES = ["owner", "planner", "couple", "staff"];

const NO_ACCESS =
  "That celebration does not exist, or you do not have access to it.";

export function requireWriteAccess(
  ctx: ToolContext,
  eventId: string
): Promise<void> {
  return requireRole(ctx, eventId, WRITE_ROLES, NO_ACCESS);
}

export function requireReadAccess(
  ctx: ToolContext,
  eventId: string
): Promise<void> {
  return requireRole(ctx, eventId, READ_ROLES, NO_ACCESS);
}

/**
 * The same answer for "no such celebration" and "not yours", so the tools cannot be used to discover
 * which ids exist.
 */
async function requireRole(
  ctx: ToolContext,
  eventId: string,
  roles: string[],
  message: string
): Promise<void> {
  const { data, error } = await ctx.client.rpc("has_event_role", {
    p_event_id: eventId,
    p_roles: roles,
  });

  if (error) {
    throw new ToolError("Could not confirm your access to that celebration.");
  }
  if (!data) {
    throw new ToolError(message);
  }
}

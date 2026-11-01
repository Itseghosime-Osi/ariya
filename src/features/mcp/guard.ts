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

/** The host narrowed this connection in Àríyá; say so, rather than repeating "not yours". */
const OUT_OF_SCOPE =
  "This connection is not set up to reach that celebration. Change which celebrations it can see in Àríyá, under Connect your AI.";

const READ_ONLY =
  "This connection is read-only, so it cannot make changes. Switch that off in Àríyá, under Connect your AI.";

export async function requireWriteAccess(
  ctx: ToolContext,
  eventId: string
): Promise<void> {
  // Scope first: a celebration outside it is out of reach whatever the role says, and the host
  // needs the refusal that names the setting they changed.
  await requireScope(ctx, eventId);
  await requireNotReadOnly(ctx);
  await requireRole(ctx, eventId, WRITE_ROLES, NO_ACCESS);
}

export async function requireReadAccess(
  ctx: ToolContext,
  eventId: string
): Promise<void> {
  await requireScope(ctx, eventId);
  await requireRole(ctx, eventId, READ_ROLES, NO_ACCESS);
}

/**
 * The database already refuses an out-of-scope celebration through `has_event_role`, which honours
 * the same setting. Asking directly is what lets the refusal name the setting instead of arriving
 * as the generic no-access answer.
 *
 * A first-party session is always in scope and has no settings row to read, so this costs an app
 * token one lookup and everyone else nothing.
 */
async function requireScope(ctx: ToolContext, eventId: string): Promise<void> {
  if (!ctx.clientId) return;

  const { data, error } = await ctx.client.rpc("ai_connection_event_allowed", {
    p_event_id: eventId,
  });

  if (error) {
    throw new ToolError("Could not confirm your access to that celebration.");
  }
  if (!data) {
    throw new ToolError(OUT_OF_SCOPE, { denied: true });
  }
}

/** Only an app token can be switched to read-only, so a first-party session never pays for this. */
async function requireNotReadOnly(ctx: ToolContext): Promise<void> {
  if (!ctx.clientId) return;

  const { data, error } = await ctx.client.rpc("ai_connection_read_only");

  if (error) {
    throw new ToolError("Could not confirm your access to that celebration.");
  }
  if (data) {
    throw new ToolError(READ_ONLY, { denied: true });
  }
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
    throw new ToolError(message, { denied: true });
  }
}

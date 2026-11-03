import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { diagnosticNote, type ToolDiagnostic } from "./diagnostics";

/**
 * Every list tool answers with the same envelope, so a model never has to guess whether it has seen
 * everything: `truncated` is true whenever the caps below returned less than the real total.
 */
export interface Paged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  truncated: boolean;
}

export function paged<T>(
  items: T[],
  page: {
    totalCount: number;
    page: number;
    pageSize: number;
    truncated?: boolean;
  }
): Paged<T> {
  return {
    items,
    totalCount: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
    truncated: page.truncated ?? items.length < page.totalCount,
  };
}

export function dataResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/**
 * Errors never carry a stack trace or a database message: `mapError` has already reduced them to
 * something safe to show a model.
 */
export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Who to attribute a call to. Structural, so `ToolContext` satisfies it without an import cycle. */
export interface ToolCaller {
  user: { id: string };
  clientId: string | null;
  /** Absent only in tests; a real call always carries the client that writes the activity row. */
  client?: SupabaseClient<Database>;
}

/**
 * What a call is remembered by, beyond who made it. `note` is a fixed phrase chosen by the tool
 * layer — never an argument, and never anything a guest typed.
 */
export interface ToolLog {
  eventId?: string | null;
  note?: string | null;
}

type ToolOutcome = "ok" | "denied" | "error";

/**
 * Runs a tool body and converts anything thrown into a safe tool error, so one bad call cannot take
 * down the request. Every call leaves one log line and one activity row, success or failure.
 */
export async function runTool(
  caller: ToolCaller,
  toolName: string,
  log: ToolLog,
  body: () => Promise<CallToolResult>
): Promise<CallToolResult> {
  try {
    const result = await body();
    await recordCall(caller, toolName, result.isError ? "error" : "ok", log);
    return result;
  } catch (error) {
    await recordCall(
      caller,
      toolName,
      isDenial(error) ? "denied" : "error",
      log,
      error instanceof ToolError ? error.diagnostic : null
    );
    return errorResult(errorMessage(error));
  }
}

/**
 * Which host, through which connected app, which tool, and whether it worked — never the arguments
 * and never anything a guest typed, so nothing sensitive reaches the logs. When the database refused
 * the call, the SQLSTATE and hint travel with it: a fixed pair, which is what tells a missing table
 * from a refused policy without replaying the message that named them.
 *
 * The activity row is what the host reads back on the Connect your AI page. Writing it is best
 * effort: a tool that did its job must not be reported as failed because the audit row could not be
 * written, so a failure here is swallowed.
 */
async function recordCall(
  caller: ToolCaller,
  toolName: string,
  outcome: ToolOutcome,
  log: ToolLog,
  diagnostic: ToolDiagnostic | null = null
): Promise<void> {
  console.info(
    JSON.stringify({
      event: "mcp_tool_call",
      userId: caller.user.id,
      clientId: caller.clientId,
      tool: toolName,
      outcome,
      ...(diagnostic
        ? {
            code: diagnostic.code,
            ...(diagnostic.hint ? { hint: diagnostic.hint } : {}),
          }
        : {}),
    })
  );

  if (!caller.client) return;

  try {
    await caller.client.from("ai_activity_log").insert({
      user_id: caller.user.id,
      client_id: caller.clientId,
      tool: toolName,
      event_id: log.eventId ?? null,
      outcome,
      note: diagnosticNote(log.note, diagnostic),
    });
  } catch {
    // Best effort, as above.
  }
}

/** A refusal the host can act on is not a fault; the difference is what the activity list shows. */
function isDenial(error: unknown): boolean {
  return error instanceof ToolError && error.denied;
}

export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return "Something went wrong on Àríyá. Nothing was changed.";
}

export class ToolError extends Error {
  /**
   * True when the tool refused on purpose — the host asked for something the connection may not do
   * — rather than something breaking. Logged as `denied` so the activity list can say so.
   */
  readonly denied: boolean;

  /**
   * The database's own reason, when a refusal came from there. Kept apart from the message so the
   * code can reach the log without the message — which may name a table, a policy, or a row — ever
   * leaving the tool.
   */
  readonly diagnostic: ToolDiagnostic | null;

  constructor(
    message: string,
    options: { denied?: boolean; diagnostic?: ToolDiagnostic | null } = {}
  ) {
    super(message);
    this.denied = options.denied ?? false;
    this.diagnostic = options.diagnostic ?? null;
  }
}

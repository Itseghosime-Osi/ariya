import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * The database client the current request should resolve to. Server actions and
 * queries call `createClient()` with no arguments, so this is how a request that
 * authenticates some other way — the MCP endpoint's bearer token — supplies its
 * own client without every caller learning about it.
 *
 * Node runtime only: `node:async_hooks` cannot be bundled for Edge.
 */
const storage = new AsyncLocalStorage<SupabaseClient<Database>>();

export function withSupabaseClient<T>(
  client: SupabaseClient<Database>,
  fn: () => T
): T {
  return storage.run(client, fn);
}

export function getOverrideClient(): SupabaseClient<Database> | undefined {
  return storage.getStore();
}

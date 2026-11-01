import "server-only";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env/client";
import type { Database } from "./database.types";

const STORAGE_KEY = "ariya-mcp-bearer";
const FALLBACK_LIFETIME_SECONDS = 300;

/**
 * Server actions call `supabase.auth.getUser()` with no argument, and auth-js answers that from a
 * stored session, not from a header. So a caller authenticated by a bearer token gets a client whose
 * storage already holds a session built around that token: `getUser()` then validates it against
 * `/auth/v1/user`, and PostgREST sees the same JWT, so RLS applies unchanged.
 */
export function createBearerClient(
  accessToken: string,
  user: User
): SupabaseClient<Database> {
  const session = {
    access_token: accessToken,
    refresh_token: "mcp-bearer",
    expires_at: accessTokenExpirySeconds(accessToken),
    expires_in: FALLBACK_LIFETIME_SECONDS,
    token_type: "bearer",
    user,
  };
  const store = new Map<string, string>([
    [STORAGE_KEY, JSON.stringify(session)],
  ]);

  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        storage: {
          getItem: (key) => store.get(key) ?? null,
          setItem: (key, value) => {
            store.set(key, value);
          },
          removeItem: (key) => {
            store.delete(key);
          },
        },
        storageKey: STORAGE_KEY,
        persistSession: true,
        // The token is not ours to refresh, and a background timer would outlive the request.
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

/** Returns the caller's user, or null when the token is missing, malformed or revoked. */
export async function verifyAccessToken(
  accessToken: string
): Promise<User | null> {
  const supabase = createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

function accessTokenExpirySeconds(accessToken: string): number {
  const payload = accessToken.split(".")[1];
  if (payload) {
    try {
      const claims = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8")
      ) as { exp?: number };
      if (typeof claims.exp === "number") return claims.exp;
    } catch {
      // Not a JWT we can read; fall through to a short lifetime.
    }
  }
  return Math.floor(Date.now() / 1000) + FALLBACK_LIFETIME_SECONDS;
}

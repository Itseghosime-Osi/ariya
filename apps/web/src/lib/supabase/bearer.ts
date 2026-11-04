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

export interface BearerIdentity {
  user: User;
  /**
   * The OAuth client the token was issued to, when it came from a connected app. A token minted by
   * the host's own password grant carries no such claim, and both are accepted.
   */
  clientId: string | null;
}

/** Returns who the token belongs to, or null when it is missing, malformed or revoked. */
export async function verifyAccessToken(
  accessToken: string
): Promise<BearerIdentity | null> {
  const supabase = createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return { user: data.user, clientId: clientIdOf(accessToken) };
}

/** Claim names live here so the untrusted-token handling stays in one place. */
interface AccessTokenClaims {
  exp?: unknown;
  client_id?: unknown;
}

/**
 * Decodes a JWT payload without verifying it. These claims only annotate a token whose signature
 * `getUser()` has already checked, so a forged payload cannot get past that gate — but nothing here
 * is trusted for authorization either.
 */
function decodeClaims(accessToken: string): AccessTokenClaims | null {
  const payload = accessToken.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as AccessTokenClaims | null;
  } catch {
    return null;
  }
}

function clientIdOf(accessToken: string): string | null {
  const claim = decodeClaims(accessToken)?.client_id;
  return typeof claim === "string" && claim.trim() ? claim.trim() : null;
}

function accessTokenExpirySeconds(accessToken: string): number {
  const exp = decodeClaims(accessToken)?.exp;
  if (typeof exp === "number") return exp;
  return Math.floor(Date.now() / 1000) + FALLBACK_LIFETIME_SECONDS;
}

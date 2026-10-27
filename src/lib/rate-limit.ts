import "server-only";
import crypto from "crypto";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/lib/supabase/database.types";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt?: string;
  retryAfter?: number;
}

export async function getClientIpHmac(): Promise<string> {
  let ip = "127.0.0.1";
  try {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    if (forwarded) {
      ip = forwarded.split(",")[0].trim();
    } else if (realIp) {
      ip = realIp.trim();
    }
  } catch {
    // Falls back to default outside Next.js request context
  }
  return crypto
    .createHmac("sha256", serverEnv.RATE_LIMIT_SECRET)
    .update(ip)
    .digest("hex")
    .slice(0, 32);
}

// Backward-compatible alias for existing callers
export const getClientIpHash = getClientIpHmac;

export async function checkRateLimit(
  key: string,
  limit: number,
  windowInterval: string = "1 minute",
  client?: SupabaseClient<Database>
): Promise<RateLimitResult> {
  // Service-role admin client required: execute on hit_rate_limit is revoked from anon & authenticated
  const supabase = client ?? createAdminClient();
  const { data, error } = await supabase.rpc("hit_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window: windowInterval,
  });

  if (error || !data) {
    console.error("Database rate limit RPC error:", error);
    // Strict fail-closed policy
    return { success: false, remaining: 0 };
  }

  const resultObj = (Array.isArray(data) ? data[0] : data) as
    Record<string, unknown> | undefined;

  if (!resultObj) {
    return { success: false, remaining: 0 };
  }

  const allowed = Boolean(resultObj.allowed);
  const remaining = Number(resultObj.remaining ?? 0);
  let retryAfter = Number(resultObj.retry_after ?? 0);
  const resetAt = resultObj.reset_at ? String(resultObj.reset_at) : undefined;
  if (!retryAfter && resetAt) {
    const resetTime = new Date(resetAt).getTime();
    retryAfter = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
  }

  return {
    success: allowed,
    remaining,
    resetAt,
    retryAfter,
  };
}

export async function checkRateLimitByKeyAndIp({
  prefix,
  identifier,
  tokenLimit,
  ipLimit,
  windowInterval = "1 minute",
  client,
}: {
  prefix: string;
  identifier: string;
  tokenLimit: number;
  ipLimit: number;
  windowInterval?: string;
  client?: SupabaseClient<Database>;
}): Promise<RateLimitResult> {
  const ipHash = await getClientIpHmac();
  const tokenKey = `${prefix}:token:${identifier}`;
  const ipKey = `${prefix}:ip:${ipHash}`;

  const [tokenResult, ipResult] = await Promise.all([
    checkRateLimit(tokenKey, tokenLimit, windowInterval, client),
    checkRateLimit(ipKey, ipLimit, windowInterval, client),
  ]);

  if (!tokenResult.success) {
    return tokenResult;
  }
  if (!ipResult.success) {
    return ipResult;
  }

  return {
    success: true,
    remaining: Math.min(tokenResult.remaining, ipResult.remaining),
    resetAt: tokenResult.resetAt,
  };
}

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { serviceRoleClient } from "./service-role";

/**
 * Admins are added in SQL by the database owner only (the website's service-role key cannot), so
 * the tests do the same, straight against the local database.
 */
const DB_URL =
  process.env.SUPABASE_DB_URL ??
  "postgresql://postgres:postgres@127.0.0.1:57322/postgres";

export async function userIdFor(email: string): Promise<string> {
  const { data, error } = await serviceRoleClient()
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  if (error || !data) throw new Error(`No profile for ${email}`);
  return data.id as string;
}

export function makeAdmin(userId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Bad user id");
  execFileSync(
    "psql",
    [
      DB_URL,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `insert into public.platform_admins (user_id) values ('${userId}') on conflict do nothing`,
    ],
    { stdio: "pipe" }
  );
}

function base32(secret: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) {
    const v = alphabet.indexOf(ch);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/** The six-digit code an authenticator app would show now (RFC 6238, SHA-1, 30 seconds). */
export function totp(secret: string, at = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const hmac = crypto
    .createHmac("sha1", base32(secret))
    .update(counter)
    .digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

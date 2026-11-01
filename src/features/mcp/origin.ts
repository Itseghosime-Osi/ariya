import "server-only";

/**
 * The MCP spec's DNS-rebinding protection. A browser can be pointed at a name that resolves to an
 * internal address, but it cannot forge the Origin header the request carries, so an Origin we do
 * not recognise is refused outright.
 *
 * A request with no Origin header at all is not a browser and cannot be rebound: CLI clients and
 * server-to-server connectors send none, and refusing those would break every one of them.
 *
 * Deliberately not allowed: the origin of the request's own URL. Under a rebinding attack the Host
 * header carries the attacker's name, so trusting "same origin as the request" would permit exactly
 * the request this check exists to refuse.
 */

/** Browser-hosted MCP clients that legitimately call this endpoint. */
const HOSTED_ORIGINS = ["https://claude.ai", "https://chatgpt.com"];

/** Local clients choose their own port, so any port on these hosts is allowed. */
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The app's own origin, as a browser would send it. Absent in tests and bare local runs. */
function appOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/** Reduced to `scheme://host[:port]`, or null when the header is not an origin at all. */
function normalise(origin: string): string | null {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function isLocal(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return LOCAL_HOSTNAMES.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * `null` means the header was absent, which passes: it is not a browser. Anything present must
 * match exactly, so an empty or malformed Origin is refused rather than read as absent.
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (origin === null) return true;

  const normalised = normalise(origin.trim());
  if (!normalised) return false;

  if (normalised === appOrigin()) return true;
  if (HOSTED_ORIGINS.includes(normalised)) return true;

  return isLocal(normalised);
}

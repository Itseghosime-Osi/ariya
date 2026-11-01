/**
 * Which party is really on the other side of a consent request.
 *
 * Only the redirect URI is trustworthy here. The client name, logo and homepage come from whoever
 * registered the OAuth client, so an attacker picks them freely; the redirect URI is the one field
 * that decides where the host's token is delivered, and it is what this module reads.
 *
 * Vendors, as documented on 2026-11-01:
 * - https://claude.com/docs/connectors/building/authentication.md#callback-urls — the hosted Claude
 *   apps (web, Desktop, mobile, Cowork) share one fixed callback. Claude Code uses an RFC 8252
 *   loopback redirect, declared in https://claude.ai/oauth/claude-code-client-metadata.
 * - https://developers.openai.com/apps-sdk/build/auth — ChatGPT uses a stable redirect URI, and a
 *   callback-ID-specific one for servers that cannot identify the issuer per RFC 9207.
 *
 * No claude.com OAuth callback is documented, so claude.com is deliberately not allowlisted.
 */

export type AppTrustTier = "known" | "local" | "unknown";

export type AppVendor = "claude" | "chatgpt";

export interface AppTrust {
  tier: AppTrustTier;
  /** Normalised redirect URI, or the raw string when it is not a URL at all. */
  redirectUri: string;
  /** Host as the URL parser sees it. Empty when the URI is unparseable. */
  host: string;
  /** Which vendor, when the app is known. */
  vendor: AppVendor | null;
}

/** Exact redirect URIs of first-party connectors. Compared against `URL#href`, so no extras. */
const KNOWN_REDIRECT_URIS: Record<string, AppVendor> = {
  "https://claude.ai/api/mcp/auth_callback": "claude",
  "https://chatgpt.com/connector_platform_oauth_redirect": "chatgpt",
};

/**
 * ChatGPT's per-connection callback. The id is minted when the connector is set up, so it cannot be
 * listed exactly; the host and the shape of the path are what make it trustworthy. The token still
 * lands on chatgpt.com, which is where the stable URI sends it too.
 */
const CHATGPT_CALLBACK_ID_PATH = /^\/connector\/oauth\/[A-Za-z0-9_-]+$/;

/** Loopback as the URL parser reports it: `[::1]` keeps its brackets in `hostname`. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const UNKNOWN_APP_ACKNOWLEDGEMENT = "acknowledged";

/**
 * Control and format characters: zero-widths, bidi overrides, the BOM. They make a name read as a
 * different name, and a bidi override can reverse the text around it.
 */
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu;

/**
 * Trims a client-supplied name down to something safe to show. React escapes text already; this
 * removes the characters that make a name read as a different name, and bounds the length so it
 * cannot push the real warning off the screen.
 */
export function sanitiseAppName(name: string, maxLength = 60): string {
  const cleaned = name.replace(INVISIBLE, "").replace(/\s+/g, " ").trim();

  if (!cleaned) return "This app";
  if (cleaned.length <= maxLength) return cleaned;

  return `${cleaned.slice(0, maxLength - 1)}…`;
}

function unknown(redirectUri: string, host = ""): AppTrust {
  return { tier: "unknown", redirectUri, host, vendor: null };
}

/** Classifies an app from its redirect URI, and from nothing else. */
export function classifyApp(redirectUri: string): AppTrust {
  const raw = redirectUri.trim();

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return unknown(raw);
  }

  // `https://claude.ai@evil.com/` parses to host evil.com, but refuse userinfo outright rather than
  // rely on the parser alone: it is never legitimate in a redirect URI.
  if (url.username || url.password) return unknown(url.href, url.hostname);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return unknown(url.href, url.hostname);
  }

  if (LOOPBACK_HOSTS.has(url.hostname)) {
    return {
      tier: "local",
      redirectUri: url.href,
      host: url.hostname,
      vendor: null,
    };
  }

  // Everything below must be https. The URL parser collapses the protocol's default port, so an
  // explicit :443 is indistinguishable from none and any other port shows up in `url.port`.
  if (url.protocol !== "https:" || url.port) {
    return unknown(url.href, url.hostname);
  }

  const vendor = KNOWN_REDIRECT_URIS[url.href];
  if (vendor) {
    return {
      tier: "known",
      redirectUri: url.href,
      host: url.hostname,
      vendor,
    };
  }

  if (
    url.hostname === "chatgpt.com" &&
    !url.search &&
    !url.hash &&
    CHATGPT_CALLBACK_ID_PATH.test(url.pathname)
  ) {
    return {
      tier: "known",
      redirectUri: url.href,
      host: url.hostname,
      vendor: "chatgpt",
    };
  }

  return unknown(url.href, url.hostname);
}

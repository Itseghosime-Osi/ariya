/**
 * Sanitizes an untrusted redirect path parameter to prevent open redirect vulnerabilities.
 *
 * Rules:
 * - Must start with exactly one leading slash ('/').
 * - Rejects protocol-relative paths ('//'), backslash escapes ('/\\', '\\'),
 *   and any URI scheme or authority ('http:', 'javascript:', 'data:').
 * - Rejects percent-encoded attempts to inject protocol-relative or backslash paths (e.g. '/%2f', '/%5c').
 * - Parses against a canonical dummy base to guarantee that no host or external origin is resolved.
 * - Falls back to a safe internal path (default: '/events').
 */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/events"
): string {
  if (!next || typeof next !== "string") {
    return fallback;
  }

  const trimmed = next.trim();
  if (!trimmed) {
    return fallback;
  }

  // Must begin with a single '/' and not with '//' or '/\'
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\")
  ) {
    return fallback;
  }

  // Reject newlines or null bytes (CRLF injection prevention)
  if (/[\r\n\t\0]/.test(trimmed)) {
    return fallback;
  }

  // Inspect percent-decoded string to detect encoded escapes (e.g., %2f, %5c)
  try {
    const decoded = decodeURIComponent(trimmed);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.startsWith("/\\") ||
      decoded.includes("://")
    ) {
      return fallback;
    }
  } catch {
    // Malformed percent encoding
    return fallback;
  }

  // Parse against a dummy base origin to verify no external scheme or host
  try {
    const dummyOrigin = "http://localhost";
    const parsed = new URL(trimmed, dummyOrigin);

    if (parsed.origin !== dummyOrigin) {
      return fallback;
    }

    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

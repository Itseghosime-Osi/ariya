/**
 * Where the admin desk lives.
 *
 * The pages sit in the app under /admin, but nobody reaches them there: /admin always answers
 * "not found". The desk opens only at a secret address set in the ADMIN_PATH environment variable
 * (for example `/ojukoro-5k2m9q7d`), which the proxy quietly maps onto /admin. The address is
 * never written in the code, so reading the repository does not reveal it. Without the variable
 * the desk does not open at all.
 *
 * This is a curtain, not the lock: the desk still needs an admin account and two-step sign-in.
 */
const SECRET_PATH = /^\/[a-z0-9][a-z0-9-]{11,63}$/;

/** The secret base path, or null when none (or an unsafe one) is configured. */
export function adminBase(): string | null {
  const raw = process.env.ADMIN_PATH?.trim().toLowerCase();
  if (!raw || !SECRET_PATH.test(raw)) return null;
  // A guessable word defeats the point.
  if (/^\/(admin|dashboard|staff|backoffice|internal|manage)(-|$)/.test(raw))
    return null;
  return raw;
}

/** The address a browser should use for an internal /admin path. */
export function adm(path: string): string {
  const base = adminBase() ?? "/admin";
  return path.replace(/^\/admin(?=\/|\?|$)/, base);
}

/** The internal /admin path for an address under the secret base, or null if it is not one. */
export function internalAdminPath(pathname: string): string | null {
  const base = adminBase();
  if (!base) return null;
  if (pathname === base) return "/admin";
  if (pathname.startsWith(`${base}/`))
    return `/admin${pathname.slice(base.length)}`;
  return null;
}

export function isHiddenAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

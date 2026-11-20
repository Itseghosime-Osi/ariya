/**
 * Where the admin desk lives: /admin.
 *
 * It used to open only at a secret address set in ADMIN_PATH, with /admin answering "not found".
 * The desk now answers at /admin directly. What keeps it closed is unchanged: every desk page
 * still needs an admin account and two-step sign-in, and anyone else gets the ordinary
 * "not found" page, so its existence is not advertised.
 */

/** The address a browser should use for an internal /admin path (now the same path). */
export function adm(path: string): string {
  return path;
}

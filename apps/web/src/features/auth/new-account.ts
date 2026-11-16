/** How long after an account is made its first sign-in still counts as signing up. */
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

/**
 * True for the first sign-in of an account Google (or another provider) just created. An email
 * account confirming its address also comes through here, but it already had its fireworks when it
 * signed up, so only provider accounts count.
 */
export function isNewOAuthAccount(
  user:
    | { created_at?: string; app_metadata?: { provider?: string } }
    | null
    | undefined,
  now = Date.now()
): boolean {
  if (!user?.created_at) return false;
  const provider = user.app_metadata?.provider;
  if (!provider || provider === "email") return false;
  const created = Date.parse(user.created_at);
  return Number.isFinite(created) && now - created < NEW_ACCOUNT_WINDOW_MS;
}

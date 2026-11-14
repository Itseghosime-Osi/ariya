/**
 * The free allowance, in one place for the app. A celebration without a Celebration Pass can send
 * this many guest invitations (one per guest party, whatever its size). The database enforces the
 * same number in `public.check_invitation_quota`; change both together.
 */
export const FREE_PLAN_LIMIT = 50;

/** The dashboard starts warning when this many free invitations are used (80%). */
export const FREE_PLAN_WARN_THRESHOLD = 40;

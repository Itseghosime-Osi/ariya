/**
 * Quiet hours, as a decision rather than a clock (6.4.2).
 *
 * The window may wrap midnight (21:00 → 07:00 is the default, and the common case), so it cannot be
 * a simple `from <= now < to`. Everything here reads times as minutes since midnight in the host's
 * own wall clock, because "do not wake me at 3am" is a local-time question.
 */

/** "21:00" or "21:00:00" → 1260. Null for anything that is not a time. */
export function minutesOf(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Whether a moment falls inside a quiet window.
 *
 * A window whose ends are equal is treated as empty, not as all day: the database rejects that pair,
 * and if one reached here anyway, silencing every digest for ever would be the worse guess.
 */
export function isQuiet(
  nowMinutes: number,
  quietFrom: string | null | undefined,
  quietTo: string | null | undefined
): boolean {
  const from = minutesOf(quietFrom);
  const to = minutesOf(quietTo);
  if (from === null || to === null) return false;
  if (from === to) return false;
  return from < to
    ? nowMinutes >= from && nowMinutes < to
    : nowMinutes >= from || nowMinutes < to;
}

/**
 * When a digest held back by quiet hours is due instead.
 *
 * It is sent at the moment quiet hours end, in the same time zone: a Monday 03:00 run with a
 * 21:00–07:00 window delivers at 07:00 rather than being dropped for the whole week.
 */
export function nextSendableMinute(
  nowMinutes: number,
  quietFrom: string | null | undefined,
  quietTo: string | null | undefined
): number | null {
  if (!isQuiet(nowMinutes, quietFrom, quietTo)) return nowMinutes;
  return minutesOf(quietTo);
}

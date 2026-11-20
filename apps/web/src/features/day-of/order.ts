/**
 * The run sheet's order. A host can give a row an exact time ("10:00"); template rows carry words
 * ("Morning, before load-in", "All day"). Exact times sort by the clock; worded rows are placed
 * where their words say, and a row with no clue stays just after the row before it, so template
 * order still holds where nothing better is known.
 */
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Minutes after midnight that a slot stands for, or null when the words give no clue. */
export function slotMinutes(slot: string | null): number | null {
  if (!slot) return null;
  const s = slot.trim();
  const clock = CLOCK.exec(s);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const words = s.toLowerCase();
  if (/all day|throughout/.test(words)) return -1;
  if (/early morning|dawn/.test(words)) return 6 * 60;
  if (/morning/.test(words)) return 9 * 60;
  if (/noon|midday/.test(words)) return 12 * 60;
  if (/afternoon/.test(words)) return 14 * 60;
  if (/evening/.test(words)) return 18 * 60;
  if (/night|close|end of/.test(words)) return 22 * 60;
  return null;
}

export function isClockTime(slot: string | null): boolean {
  return Boolean(slot && CLOCK.test(slot.trim()));
}

export function orderRunSheet<T extends { timeSlot: string | null }>(
  rows: T[]
): T[] {
  let carried = -2;
  const keyed = rows.map((row, index) => {
    const own = slotMinutes(row.timeSlot);
    // A row with no clue follows the one before it in template order.
    const key = own ?? carried;
    carried = key;
    return { row, index, key, hasSlot: Boolean(row.timeSlot) };
  });
  return keyed
    .sort(
      (a, b) =>
        a.key - b.key ||
        // At the same moment, a row with an exact or worded slot leads one without.
        Number(b.hasSlot) - Number(a.hasSlot) ||
        a.index - b.index
    )
    .map((k) => k.row);
}

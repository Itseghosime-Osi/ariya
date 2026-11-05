import { getLagosDateKey } from "@/lib/format";

/**
 * A celebration ends with its day. From the next calendar day in Lagos it is frozen: the public page
 * and invitation links stop opening, and nothing about it can be changed. The same rule is enforced
 * in the database (`public.event_is_expired`); this is the app's mirror of it, for messages and for
 * pages that must not show an ended celebration.
 */
export function isEventExpired(
  eventDate: string | Date | number | null | undefined,
  now: number | Date = Date.now()
): boolean {
  const eventKey = getLagosDateKey(eventDate);
  const todayKey = getLagosDateKey(now);
  if (!eventKey || !todayKey) return false;
  return todayKey > eventKey;
}

export const EVENT_ENDED_MESSAGE =
  "This celebration has ended, so it can no longer be changed.";

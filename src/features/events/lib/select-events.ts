import { daysBetweenLagos, getLagosDateKey } from "@/lib/format";
import type { EventWithMetrics } from "../types";

/**
 * Returns true if the event has a valid calendar date in Africa/Lagos.
 */
export function hasValidEventDate(item: EventWithMetrics): boolean {
  return getLagosDateKey(item.event.date) !== null;
}

/**
 * Sorts upcoming events: dated events ascending by Lagos calendar day
 * (ties broken by created_at ascending), undated events last.
 */
export function sortUpcoming(items: EventWithMetrics[]): EventWithMetrics[] {
  return [...items].sort((a, b) => {
    const keyA = getLagosDateKey(a.event.date);
    const keyB = getLagosDateKey(b.event.date);

    if (keyA && !keyB) return -1;
    if (!keyA && keyB) return 1;

    if (keyA && keyB && keyA !== keyB) {
      return keyA.localeCompare(keyB);
    }

    const createdA = Date.parse(a.event.created_at || "") || 0;
    const createdB = Date.parse(b.event.created_at || "") || 0;
    if (createdA !== createdB) {
      return createdA - createdB;
    }

    return a.event.id.localeCompare(b.event.id);
  });
}

/**
 * Sorts past events: dated events descending by Lagos calendar day
 * (most recent past event first), undated archived events last.
 */
export function sortPast(items: EventWithMetrics[]): EventWithMetrics[] {
  return [...items].sort((a, b) => {
    const keyA = getLagosDateKey(a.event.date);
    const keyB = getLagosDateKey(b.event.date);

    if (keyA && !keyB) return -1;
    if (!keyA && keyB) return 1;

    if (keyA && keyB && keyA !== keyB) {
      return keyB.localeCompare(keyA);
    }

    const createdA = Date.parse(a.event.created_at || "") || 0;
    const createdB = Date.parse(b.event.created_at || "") || 0;
    return createdB - createdA;
  });
}

/**
 * Partitions events into Upcoming and Past using the Africa/Lagos calendar day.
 * - Past = event date before today (Africa/Lagos) OR status === 'archived'.
 * - Upcoming = not archived AND (date today or later in Africa/Lagos OR no date).
 */
export function partitionEvents(
  items: EventWithMetrics[],
  now: Date | string = new Date()
): {
  upcoming: EventWithMetrics[];
  past: EventWithMetrics[];
} {
  const upcomingRaw: EventWithMetrics[] = [];
  const pastRaw: EventWithMetrics[] = [];

  for (const item of items) {
    const isArchived = item.event.status === "archived";
    if (isArchived) {
      pastRaw.push(item);
      continue;
    }

    const dateKey = getLagosDateKey(item.event.date);
    if (!dateKey) {
      upcomingRaw.push(item);
      continue;
    }

    const diffDays = daysBetweenLagos(item.event.date, now);
    if (diffDays < 0) {
      pastRaw.push(item);
    } else {
      upcomingRaw.push(item);
    }
  }

  return {
    upcoming: sortUpcoming(upcomingRaw),
    past: sortPast(pastRaw),
  };
}

/**
 * Picks the Hero event from upcoming events:
 * - Soonest upcoming dated event (ties broken by created_at ascending).
 * - If no dated upcoming events exist, the first undated upcoming event.
 * - If no upcoming events exist, null.
 */
export function pickHeroEvent(
  upcoming: EventWithMetrics[],
  now: Date | string = new Date()
): EventWithMetrics | null {
  if (upcoming.length === 0) return null;
  const { upcoming: sorted } = partitionEvents(upcoming, now);
  return sorted[0] ?? null;
}

import type { EventWithMetrics } from "../types";

/**
 * Search bar is rendered only when the user has MORE THAN 3 events total.
 */
export const SEARCH_THRESHOLD = 3;

/**
 * Normalizes text for case- and diacritic-insensitive matching
 * (so "Adesola" and "Adéṣọlá" both match "Adéṣọlá").
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Client-side instant filter across existing event fields:
 * title (event name), couple (host/couple names), venue, and area.
 */
export function filterEvents(
  items: EventWithMetrics[],
  query: string
): EventWithMetrics[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return items;

  return items.filter(({ event }) => {
    const haystack = [event.title, event.couple, event.venue, event.area]
      .map(normalizeSearchText)
      .filter(Boolean)
      .join(" ");

    return haystack.includes(normalizedQuery);
  });
}

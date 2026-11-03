import type { Event } from "../types";

export interface ShareTarget {
  path: string;
  url: string;
  title: string;
}

/**
 * Returns the public share target (/e/<slug>) if and only if the event is public
 * and has a non-empty slug. Never returns a private or dashboard URL.
 */
export function getShareTarget(
  event: Pick<Event, "is_public" | "slug" | "title">,
  origin?: string
): ShareTarget | null {
  if (!event.is_public) return null;
  const cleanSlug = event.slug?.trim();
  if (!cleanSlug) return null;

  const path = `/e/${cleanSlug}`;
  const base = origin ? origin.replace(/\/$/, "") : "";
  return {
    path,
    url: `${base}${path}`,
    title: event.title,
  };
}

/** Pure helpers for the view-only floor plan link; safe in the browser and on the server. */

/** A view-only link to the floor plan, kept beside the hall (never part of the hall model). */
export interface HallShare {
  token: string;
  createdAt: number;
}

export function shareOf(doc: unknown): HallShare | null {
  if (!doc || typeof doc !== "object") return null;
  const s = (doc as { share?: unknown }).share;
  if (!s || typeof s !== "object") return null;
  const { token, createdAt } = s as Partial<HallShare>;
  return typeof token === "string" &&
    /^[A-Za-z0-9_-]{32,64}$/.test(token) &&
    typeof createdAt === "number"
    ? { token, createdAt }
    : null;
}

/** The public address of a shared floor plan. */
export function sharePath(token: string) {
  return `/plan/${token}`;
}

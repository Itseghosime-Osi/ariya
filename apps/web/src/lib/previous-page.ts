/**
 * Remembering which page a person came from, so a Back button can take them there.
 *
 * `document.referrer` only describes how the tab first loaded, not the in-app navigations after it,
 * so the app shell writes the page it just left here on every navigation. A Back button then steps
 * back through history when the person came from somewhere in the app, and goes to a sensible
 * fallback when they did not (a pasted link, a bookmark, a fresh tab).
 */

export const PREVIOUS_PAGE_KEY = "ariya:previous-page";

/** Whether going back leads somewhere in this app, rather than off it or nowhere. */
export function cameFromApp(input: {
  /** The page the shell last left, as a path, if it recorded one. */
  previous: string | null;
  /** `document.referrer`: how this tab first loaded. */
  referrer: string;
  /** The page being left now, as a path. */
  current: string;
  origin: string;
}): boolean {
  const { previous, referrer, current, origin } = input;
  if (previous && previous !== current) return true;
  if (!referrer) return false;
  try {
    const ref = new URL(referrer);
    return ref.origin === origin && ref.pathname !== current;
  } catch {
    return false;
  }
}

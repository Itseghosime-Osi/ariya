import type { Metadata } from "next";

/**
 * The address the site is published at. Canonical links, the sitemap, robots.txt and social
 * previews all build on this, so search engines and link previews see ariyaday.com and not a
 * preview or *.vercel.app address. `ariyaday.com` redirects to `www`, so `www` is the canonical
 * host. Set NEXT_PUBLIC_SITE_URL to change it (for example on a staging deployment).
 */
const FALLBACK = "https://www.ariyaday.com";

function clean(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  try {
    return trimmed ? new URL(trimmed).origin : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export const SITE_URL = clean(process.env.NEXT_PUBLIC_SITE_URL);

/** An absolute URL on the site for a path such as "/product". */
export function siteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The brand's X/Twitter handle for `twitter:site`, such as "@ariyaday". Absent until one is
 * set in NEXT_PUBLIC_TWITTER_HANDLE, so no tag is written rather than a made-up one.
 */
export const TWITTER_HANDLE = (() => {
  const raw = (process.env.NEXT_PUBLIC_TWITTER_HANDLE ?? "").trim();
  if (!raw) return undefined;
  const handle = raw.startsWith("@") ? raw : `@${raw}`;
  return /^@[A-Za-z0-9_]{1,15}$/.test(handle) ? handle : undefined;
})();

/** The icon set every public page declares, so browsers, iOS and Google Search each find theirs. */
export const SITE_ICONS: NonNullable<Metadata["icons"]> = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/site/assets/icon.svg", type: "image/svg+xml" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
  ],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
};

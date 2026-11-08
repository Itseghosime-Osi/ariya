import type { Metadata } from "next";

// Next replaces openGraph/twitter wholesale when a page sets one, rather than
// merging it with the layout's, so every page has to carry the social image or
// it silently disappears from the preview.
export const OG_IMAGE = {
  url: "/assets/og.jpg",
  width: 1200,
  height: 630,
  alt: "A red velvet ring box, open in candlelight. The Yes, by Àríyá.",
} as const;

const SITE = "Àríyá";

export function pageMetadata({
  title,
  description,
  path,
  socialTitle,
  socialDescription,
}: {
  title: string;
  description: string;
  path: string;
  socialTitle?: string;
  socialDescription?: string;
}): Metadata {
  const share = socialTitle ?? `${title} · Àríyá`;
  const shareCopy = socialDescription ?? description;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE,
      locale: "en_NG",
      title: share,
      description: shareCopy,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: share,
      description: shareCopy,
      images: [OG_IMAGE.url],
    },
  };
}

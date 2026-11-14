import type { Metadata, Viewport } from "next";
import "@/styles/site/archive.css";
import "@/styles/site/nav.css";
import { SITE_URL, SITE_ICONS, TWITTER_HANDLE } from "@/lib/site-url";
import { WebFonts } from "@/components/site/web-fonts";
import { SCENE_IMPORT_MAP } from "@/lib/site/scene-import-map";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Àríyá · The Yes",
    template: "%s · Àríyá",
  },
  description:
    "Àríyá plans Nigerian weddings and parties with one personal RSVP link per guest. The Yes is a wedding film in seventeen chapters.",
  alternates: { canonical: "/" },
  icons: SITE_ICONS,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Àríyá",
    locale: "en_NG",
    title: "The Yes · Àríyá",
    description:
      "One personal invitation for every guest, and a guest list that keeps itself. A Lagos wedding in seventeen chapters, from Àríyá.",
    url: "/",
    images: [
      {
        url: "/assets/og.jpg",
        width: 1200,
        height: 630,
        alt: "A red velvet ring box, open in candlelight. The Yes, by Àríyá.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    ...(TWITTER_HANDLE ? { site: TWITTER_HANDLE } : {}),
    title: "The Yes · Àríyá",
    description:
      "One personal invitation for every guest, and a guest list that keeps itself. A Lagos wedding in seventeen chapters.",
    images: ["/assets/og.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16040a",
};

const FONTS =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..600&family=Figtree:wght@400;500;600;700&family=Pinyon+Script&display=swap";

// Before paint: a page reached from another marketing page opens its velvet
// curtain; a direct visit renders plainly.
const curtainBoot =
  'try{if(sessionStorage.getItem("ariya-curtain")&&!/embed=/.test(location.search))document.documentElement.classList.add("cur-in")}catch(e){}';

// The film renders as React markup; the only thing left from the archive here
// is the import map, because the scene module imports three by bare specifier.
export default function FilmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        <WebFonts href={FONTS} />
        <script
          type="importmap"
          dangerouslySetInnerHTML={{ __html: SCENE_IMPORT_MAP }}
        />
        <script dangerouslySetInnerHTML={{ __html: curtainBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

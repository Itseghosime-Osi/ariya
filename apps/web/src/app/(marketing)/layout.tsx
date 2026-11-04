import type { Metadata, Viewport } from "next";
import "@/styles/site/ariya.css";
import "@/styles/site/nav.css";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SCENE_IMPORT_MAP } from "@/lib/site/scene";

export const metadata: Metadata = {
  metadataBase: new URL("https://ariya-two.vercel.app"),
  title: {
    default: "Àríyá · The Yes",
    template: "%s · Àríyá by OwambePlan",
  },
  applicationName: "Àríyá",
  icons: {
    icon: [
      { url: "/site/assets/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Àríyá by OwambePlan",
    locale: "en_NG",
    images: [
      {
        url: "/assets/og.jpg",
        width: 1200,
        height: 630,
        alt: "A red velvet ring box, open in candlelight. The Yes, by Àríyá.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16040a",
};

// Runs before paint: a page reached from another marketing page opens its
// velvet curtain; a direct visit renders plainly.
const curtainBoot =
  'try{if(sessionStorage.getItem("ariya-curtain"))document.documentElement.classList.add("cur-in")}catch(e){}';

const FONTS =
  "https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..600&family=Cinzel:wght@400;500&family=Figtree:wght@400;500;600;700&family=Pinyon+Script&display=swap";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="stylesheet" href={FONTS} precedence="default" />
        {/* /about mounts the film's 3D module directly; it imports three by bare specifier. */}
        <script
          type="importmap"
          dangerouslySetInnerHTML={{ __html: SCENE_IMPORT_MAP }}
        />
        <script dangerouslySetInnerHTML={{ __html: curtainBoot }} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}

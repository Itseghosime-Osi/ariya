import { BRAND_IVORY, BRAND_NIGHT } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Great_Vibes, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import { AppSplash, splashScript } from "@/components/layout/app-splash";
import { OfflineCache } from "@/components/layout/offline-cache";
import { SITE_URL } from "@/lib/site-url";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bodoni-moda",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-great-vibes",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Àríyá — Wedding & Event Suite",
  description: "Wedding and event planner for Nigerian couples and planners.",
  applicationName: "Àríyá",
  icons: {
    icon: "/site/assets/icon.svg",
    // Full-bleed square: iOS applies its own rounded mask.
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  // Home-screen install on iPhone and iPad: the title under the icon and the
  // status bar style.
  appleWebApp: {
    capable: true,
    title: "Àríyá",
    statusBarStyle: "default",
  },
  // Don't turn guest counts and dates into phone-number links.
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Tints the phone's status bar and browser chrome to match the page.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND_IVORY },
    { media: "(prefers-color-scheme: dark)", color: BRAND_NIGHT },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-NG"
      className={`${bodoniModa.variable} ${plusJakartaSans.variable} ${greatVibes.variable}`}
      // The launch script may mark <html> for the splash before React loads.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
      </head>
      <body className="antialiased min-h-screen bg-ivory text-on-surface">
        <AppSplash />
        <OfflineCache />
        {children}
      </body>
    </html>
  );
}

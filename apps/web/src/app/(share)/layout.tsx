import { BRAND_IVORY } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";

/**
 * The root for pages shared outside the app (a view-only floor plan). It has no loading screen on
 * purpose: under one, a page is already streaming before it can say "not found", so a stopped
 * link answered 200. Here a wrong or stopped link gets a real 404. No splash, no offline cache:
 * the person opening it is a venue manager, not a signed-in host.
 */
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

export const metadata: Metadata = {
  metadataBase: new URL("https://ariya-two.vercel.app"),
  title: "Àríyá",
  icons: { icon: "/site/assets/icon.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_IVORY,
};

export default function ShareLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-NG"
      className={`${bodoniModa.variable} ${plusJakartaSans.variable}`}
    >
      <body className="min-h-screen bg-ivory text-night antialiased">
        {children}
      </body>
    </html>
  );
}

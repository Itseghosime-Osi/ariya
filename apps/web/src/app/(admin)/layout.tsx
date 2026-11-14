import { BRAND_IVORY } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/admin.css";
import { SITE_URL } from "@/lib/site-url";

/**
 * The root for the admin desk. Like the shared floor plan, it has no loading screen on purpose:
 * under one the page is already streaming before the access check can answer, so a non-admin got
 * a 200 "not found". Here they get a real 404, and the desk does not announce itself.
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
  metadataBase: new URL(SITE_URL),
  title: "Àríyá",
  icons: { icon: "/site/assets/icon.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND_IVORY,
};

export default function AdminRootLayout({
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

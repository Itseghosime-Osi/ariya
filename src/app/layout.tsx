import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";

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
  title: "Àríyá — Wedding & Event Suite",
  description: "Wedding and event planner for Nigerian couples and planners.",
  icons: {
    icon: "/site/assets/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-NG"
      className={`${bodoniModa.variable} ${plusJakartaSans.variable}`}
    >
      <body className="antialiased min-h-screen bg-ivory text-on-surface">
        {children}
      </body>
    </html>
  );
}

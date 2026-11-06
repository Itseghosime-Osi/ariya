import type { Metadata } from "next";
import Link from "next/link";
import { Bodoni_Moda, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import {
  ERROR_PRIMARY,
  ERROR_SECONDARY,
  ErrorScreen,
} from "@/components/errors/error-screen";

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
  title: "Page not found · Àríyá",
  robots: { index: false, follow: false },
};

/** The 404 for an address that matches no page at all, so no layout group is around it. */
export default function GlobalNotFound() {
  return (
    <html
      lang="en-NG"
      className={`${bodoniModa.variable} ${plusJakartaSans.variable}`}
    >
      <body className="antialiased min-h-screen bg-ivory text-on-surface">
        <ErrorScreen
          code="404"
          eyebrow="Page not found"
          title="This page has wandered off"
          message="The page or link you are looking for does not exist, or it has moved. Check the address, or head back to Àríyá."
          actions={
            <>
              <Link href="/" className={ERROR_PRIMARY}>
                Back to Àríyá
              </Link>
              <Link href="/events" className={ERROR_SECONDARY}>
                My celebrations
              </Link>
            </>
          }
        />
      </body>
    </html>
  );
}

import React from "react";
import Link from "next/link";
import { LEGAL } from "@/lib/legal/site";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ivory text-night antialiased selection:bg-gold/30">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 pb-2 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy"
        >
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-full border border-gold/50 bg-wine font-display text-2xl font-bold text-gold"
          >
            À
          </span>
          <span className="font-display text-2xl leading-none text-burgundy">
            {LEGAL.product}
          </span>
        </Link>
        <nav aria-label="Legal" className="flex items-center gap-1 text-sm">
          <Link
            href="/privacy"
            className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-burgundy hover:bg-burgundy/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-burgundy hover:bg-burgundy/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
          >
            Terms
          </Link>
        </nav>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-8"
      >
        {children}
      </main>
      <footer className="mx-auto max-w-3xl border-t border-hairline px-5 py-6 text-[13px] text-label-2 sm:px-8">
        © 2026 {LEGAL.operator}. Questions? Write to{" "}
        <a
          className="font-semibold text-burgundy underline underline-offset-2"
          href={`mailto:${LEGAL.contactEmail}`}
        >
          {LEGAL.contactEmail}
        </a>
        .
      </footer>
    </div>
  );
}

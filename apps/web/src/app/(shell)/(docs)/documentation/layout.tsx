import React from "react";
import Link from "next/link";
import { LEGAL } from "@/lib/legal/site";
import { DOC_GROUPS, pagesInGroup, searchIndex } from "@/lib/docs";
import { DocsNav } from "@/components/docs/DocsNav";
import { DocsSearch } from "@/components/docs/DocsSearch";

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const groups = DOC_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    pages: pagesInGroup(g.id).map((p) => ({ slug: p.slug, title: p.title })),
  }));
  return (
    <div className="min-h-screen bg-ivory text-night antialiased selection:bg-gold/30">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pb-2 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-8">
        <Link
          href="/documentation"
          className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-burgundy"
        >
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-full border border-gold/50 bg-wine font-display text-2xl font-bold text-gold"
          >
            À
          </span>
          <span className="font-display text-2xl leading-none text-burgundy">
            {LEGAL.product} manual
          </span>
        </Link>
        <nav aria-label="Site" className="flex items-center gap-1 text-sm">
          <Link
            href="/events"
            className="inline-flex min-h-11 items-center rounded-full bg-burgundy px-4 font-semibold text-ivory hover:bg-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
          >
            Open the app
          </Link>
        </nav>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-2">
          <DocsSearch index={searchIndex()} />
          <details className="mt-4 lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center rounded-full border border-hairline bg-white px-4 text-sm font-semibold text-burgundy">
              All pages
            </summary>
            <div className="mt-3 rounded-2xl border border-hairline bg-white p-4">
              <DocsNav groups={groups} />
            </div>
          </details>
          <div className="mt-5 hidden lg:block">
            <DocsNav groups={groups} />
          </div>
        </aside>
        <main id="main-content" className="min-w-0">
          {children}
        </main>
      </div>

      <footer className="mx-auto max-w-6xl border-t border-hairline px-5 py-6 text-[13px] text-label-2 sm:px-8">
        © 2026 {LEGAL.operator}. Spotted a mistake? Write to{" "}
        <a
          className="font-semibold text-burgundy underline underline-offset-2"
          href={`mailto:${LEGAL.contactEmail}`}
        >
          {LEGAL.contactEmail}
        </a>
        . See also the{" "}
        <Link
          className="font-semibold text-burgundy underline underline-offset-2"
          href="/privacy"
        >
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link
          className="font-semibold text-burgundy underline underline-offset-2"
          href="/terms"
        >
          Terms
        </Link>
        .
      </footer>
    </div>
  );
}

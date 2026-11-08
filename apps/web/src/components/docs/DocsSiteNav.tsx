"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site/site-header";
import "@/styles/site/nav.css";
import "@/styles/docs.css";

const LINKS = [
  ["/", "The film"],
  ["/about", "About"],
  ["/product", "What we do"],
  ["/pricing", "Pricing"],
  ["/documentation", "Docs"],
] as const;

/** The site's navigation and menu, using the manual's existing ivory shell. */
export function DocsSiteNav() {
  const pathname = usePathname();
  const current = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  return (
    <SiteHeader
      renderHeader={({ open, onMenuClick }) => (
        <header className="docs-navigation mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-5 pb-5 pt-[calc(1.25rem+env(safe-area-inset-top))] sm:px-8">
          <Link
            href="/"
            aria-label="Àríyá, the film"
            className="font-display text-3xl font-bold text-burgundy"
          >
            Àríyá
          </Link>
          <nav
            aria-label="Main"
            className="hidden items-center gap-6 text-sm md:flex"
          >
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={current(href) ? "page" : undefined}
                className={
                  current(href)
                    ? "font-semibold text-burgundy underline decoration-gold underline-offset-8"
                    : "text-night hover:text-burgundy"
                }
              >
                {label}
              </Link>
            ))}
            <Link
              href="/events"
              className="rounded-full bg-burgundy px-5 py-3 font-semibold text-ivory"
            >
              Start planning
            </Link>
          </nav>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-controls="cm"
            aria-expanded={open}
            onClick={onMenuClick}
            className="min-h-11 rounded-full border border-burgundy/30 px-5 text-sm font-semibold text-burgundy md:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </header>
      )}
    />
  );
}

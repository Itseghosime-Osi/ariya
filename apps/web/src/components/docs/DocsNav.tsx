"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Group {
  id: string;
  title: string;
  pages: { slug: string; title: string }[];
}

/** The manual's contents. The current page is marked for screen readers as well as by colour. */
export function DocsNav({ groups }: { groups: Group[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Manual contents" className="space-y-6">
      {groups.map((g) => (
        <div key={g.id}>
          <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
            <span aria-hidden="true" className="h-px w-4 bg-gold" />
            {g.title}
          </p>
          <ul className="space-y-0.5">
            {g.pages.map((p) => {
              const href = `/documentation/${p.slug}`;
              const current = pathname === href;
              return (
                <li key={p.slug}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-9 items-center rounded-lg px-2.5 text-[14.5px] focus-visible:outline-2 focus-visible:outline-burgundy ${
                      current
                        ? "border-l-[3px] border-gold bg-burgundy font-semibold text-ivory"
                        : "border-l-[3px] border-transparent text-night hover:bg-burgundy/10"
                    }`}
                  >
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

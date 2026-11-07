"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

interface Entry {
  slug: string;
  title: string;
  summary: string;
  group: string;
  text: string;
}

/** Search across every page of the manual, in the browser, with no request. */
export function DocsSearch({ index }: { index: Entry[] }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    return index
      .map((e) => {
        const title = e.title.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (title.includes(t)) score += 5;
          if (e.summary.toLowerCase().includes(t)) score += 2;
          const hits = e.text.split(t).length - 1;
          if (hits === 0) return { e, score: 0 };
          score += Math.min(hits, 5);
        }
        return { e, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [q, index]);

  return (
    <div role="search" className="relative">
      <label htmlFor="docs-search" className="sr-only">
        Search the manual
      </label>
      <input
        id="docs-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the manual"
        autoComplete="off"
        className="desk-field min-h-11 w-full rounded-full px-4 text-[15px] text-night outline-hidden placeholder:text-label-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      />
      {q.trim() && (
        <div
          aria-live="polite"
          className="mt-2 rounded-2xl border border-hairline bg-white p-2 shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-label-2">
              Nothing found for “{q}”.
            </p>
          ) : (
            <ul>
              {results.map(({ e }) => (
                <li key={e.slug}>
                  <Link
                    href={`/documentation/${e.slug}`}
                    className="block rounded-xl px-3 py-2 hover:bg-burgundy/10 focus-visible:outline-2 focus-visible:outline-burgundy"
                  >
                    <span className="block text-sm font-semibold text-night">
                      {e.title}
                    </span>
                    <span className="block text-[13px] text-label-2">
                      {e.summary}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

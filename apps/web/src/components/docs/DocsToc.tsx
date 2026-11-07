"use client";

import React, { useEffect, useState } from "react";

interface Heading {
  id: string;
  text: string;
}

/** The right-hand rail: the sections of this page, with the one being read marked. */
export function DocsToc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((e): e is HTMLElement => Boolean(e));
    if (els.length === 0) return;
    const onScroll = () => {
      let current = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= 120) current = el.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  return (
    <nav aria-label="On this page">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
        On this page
      </p>
      <ol className="space-y-0.5 border-l border-gold/40">
        {headings.map((h, i) => {
          const current = active === h.id;
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                aria-current={current ? "location" : undefined}
                className={`-ml-px flex min-h-9 items-center gap-2 border-l-2 py-1 pl-3 pr-2 text-[13.5px] leading-snug focus-visible:outline-2 focus-visible:outline-burgundy ${
                  current
                    ? "border-burgundy font-semibold text-burgundy"
                    : "border-transparent text-label-2 hover:text-night"
                }`}
              >
                <span className="font-mono text-[11px] tabular-nums text-gold-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {h.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

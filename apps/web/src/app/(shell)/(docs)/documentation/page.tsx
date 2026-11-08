import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { DOC_GROUPS, DOC_PAGES, pagesInGroup } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Documentation • Àríyá",
  alternates: { canonical: "/documentation" },
  description:
    "Practical Àríyá guides for hosts, guests and door staff: events, invitations, replies, seating and check-in.",
};

export default function DocumentationHome() {
  return (
    <article>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
        Àríyá
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">
        The Àríyá manual
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed">
        How a host plans a celebration, how guests reply, and how the team
        welcomes everyone on the day. {DOC_PAGES.length} pages in{" "}
        {DOC_GROUPS.length} sections.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/documentation/quick-start"
          className="inline-flex min-h-11 items-center rounded-full bg-burgundy px-5 text-sm font-semibold text-ivory hover:bg-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          Start your celebration
        </Link>
        <Link
          href="/documentation/overview"
          className="inline-flex min-h-11 items-center rounded-full border border-burgundy/40 px-5 text-sm font-semibold text-burgundy hover:bg-burgundy/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
        >
          What Àríyá is
        </Link>
      </div>

      <div className="mt-10 space-y-10">
        {DOC_GROUPS.map((g) => (
          <section key={g.id} aria-labelledby={`g-${g.id}`}>
            <h2 id={`g-${g.id}`} className="font-display text-2xl font-bold">
              {g.title}
            </h2>
            <p className="mt-1 text-sm text-label-2">{g.blurb}</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {pagesInGroup(g.id).map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/documentation/${p.slug}`}
                    className="bento-card block h-full p-4 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
                  >
                    <span className="block font-display text-lg font-bold text-night">
                      {p.title}
                    </span>
                    <span className="mt-1 block text-[14px] leading-snug text-label-2">
                      {p.summary}
                    </span>
                    <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-ink">
                      {p.audience}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}

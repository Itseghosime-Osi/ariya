import React from "react";
import { LEGAL } from "./site";

export interface LegalSection {
  id: string;
  title: string;
  /** Paragraphs, then an optional list. */
  body: React.ReactNode;
}

/** A legal text: a heading, when it took effect, a short contents list, then numbered sections. */
export function LegalDocument({
  title,
  summary,
  sections,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
}) {
  return (
    <article>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
        {LEGAL.product}
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-night sm:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-label-2">Last updated {LEGAL.updated}</p>
      <p className="mt-5 text-base leading-relaxed text-night">{summary}</p>

      <nav
        aria-label="On this page"
        className="bento-card mt-8 p-5 text-[15px] sm:p-6"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
          On this page
        </p>
        <ol className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex min-h-9 items-center text-burgundy underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
              >
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
            <h2
              id={`${s.id}-h`}
              className="font-display text-2xl font-bold text-night"
            >
              {i + 1}. {s.title}
            </h2>
            <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-night [&_a]:font-semibold [&_a]:text-burgundy [&_a]:underline [&_a]:underline-offset-2 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

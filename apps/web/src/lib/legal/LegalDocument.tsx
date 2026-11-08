import React from "react";
import { LegalSidebar } from "./LegalSidebar";
import { LEGAL } from "./site";

export interface LegalSection {
  id: string;
  title: string;
  /** Paragraphs, then an optional list. */
  body: React.ReactNode;
}

/** A legal text: a heading, when it took effect, a searchable sidebar, then numbered sections. */
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
    <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <LegalSidebar
        title={title}
        sections={sections.map(({ id, title }) => ({ id, title }))}
      />
      <main id="main-content" className="min-w-0">
        <article>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-ink">
            {LEGAL.product}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-night sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-label-2">
            Last updated {LEGAL.updated}
          </p>
          <p className="mt-5 text-base leading-relaxed text-night">{summary}</p>

          <div className="mt-10 space-y-10">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-8"
                aria-labelledby={`${s.id}-h`}
              >
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
      </main>
    </div>
  );
}

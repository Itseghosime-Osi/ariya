"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  title: string;
}

/** Section navigation follows the manual's search, gold labels and burgundy current item. */
export function LegalSidebar({
  title,
  sections,
}: {
  title: string;
  sections: Section[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(sections[0]?.id ?? "");
  useEffect(() => {
    const update = () => {
      let id = sections[0]?.id ?? "";
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top <= 140)
          id = section.id;
      }
      setActive(id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [sections]);
  const filtered = sections.filter((section) =>
    section.title.toLowerCase().includes(query.trim().toLowerCase())
  );
  const contents = (
    <nav aria-label={`${title} sections`}>
      <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
        <span aria-hidden="true" className="h-px w-4 bg-gold" />
        On this page
      </p>
      <ol className="space-y-0.5">
        {filtered.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "location" : undefined}
              className={`flex min-h-9 items-start gap-2 rounded-lg border-l-[3px] px-2.5 py-2 text-[14.5px] leading-snug focus-visible:outline-2 focus-visible:outline-burgundy ${active === section.id ? "border-gold bg-burgundy font-semibold text-ivory" : "border-transparent text-night hover:bg-burgundy/10"}`}
            >
              <span
                aria-hidden="true"
                className="mt-0.5 text-[11px] tabular-nums opacity-75"
              >
                {String(sections.indexOf(section) + 1).padStart(2, "0")}
              </span>
              {section.title}
            </a>
          </li>
        ))}
      </ol>
      <p role="status" className="mt-3 text-sm text-label-2">
        {query.trim()
          ? filtered.length
            ? `${filtered.length} matching sections`
            : "No matching sections. Try another word."
          : ""}
      </p>
    </nav>
  );
  return (
    <aside className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:border-r lg:border-hairline lg:pr-5">
      <label htmlFor="legal-search" className="sr-only">
        Find a section
      </label>
      <input
        id="legal-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find a section"
        className="desk-field min-h-11 w-full rounded-full px-4 text-[15px] text-night outline-hidden placeholder:text-label-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
      />
      <details
        className="mt-5 lg:hidden"
        open={query.trim() ? true : undefined}
      >
        <summary className="flex min-h-11 cursor-pointer items-center rounded-full border border-hairline bg-white px-4 text-sm font-semibold text-burgundy">
          All sections
        </summary>
        <div className="mt-3 rounded-2xl border border-hairline bg-white p-4">
          {contents}
        </div>
      </details>
      <div className="mt-5 hidden lg:block">{contents}</div>
    </aside>
  );
}

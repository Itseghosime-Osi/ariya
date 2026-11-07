import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DOC_GROUPS,
  DOC_PAGES,
  getDocPage,
  neighbours,
  pageHeadings,
} from "@/lib/docs";
import { DocBlocks } from "@/components/docs/DocBlocks";

export function generateStaticParams() {
  return DOC_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getDocPage(slug);
  if (!page) return {};
  return {
    title: `${page.title} • Àríyá manual`,
    description: page.summary,
  };
}

export default async function DocumentationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getDocPage(slug);
  if (!page) notFound();
  const group = DOC_GROUPS.find((g) => g.id === page.group);
  const { prev, next } = neighbours(page.slug);
  const headings = pageHeadings(page);

  return (
    <article>
      <nav aria-label="Breadcrumb" className="text-[13px] text-label-2">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              className="underline-offset-2 hover:underline"
              href="/documentation"
            >
              Manual
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>{group?.title}</li>
        </ol>
      </nav>
      <h1 className="mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">
        {page.title}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-label-2">
        {page.summary}
      </p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
        For: {page.audience}
      </p>

      {headings.length > 1 && (
        <nav
          aria-label="On this page"
          className="bento-card mt-6 p-5 text-[15px]"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
            On this page
          </p>
          <ol className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className="inline-flex min-h-9 items-center text-burgundy underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-burgundy"
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="mt-8">
        <DocBlocks blocks={page.blocks} />
      </div>

      <nav
        aria-label="Previous and next"
        className="mt-12 grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2"
      >
        {prev ? (
          <Link
            href={`/documentation/${prev.slug}`}
            className="bento-card block p-4 hover:shadow-md focus-visible:outline-2 focus-visible:outline-burgundy"
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
              Previous
            </span>
            <span className="font-display text-lg font-bold">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/documentation/${next.slug}`}
            className="bento-card block p-4 text-right hover:shadow-md focus-visible:outline-2 focus-visible:outline-burgundy sm:col-start-2"
          >
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
              Next
            </span>
            <span className="font-display text-lg font-bold">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}

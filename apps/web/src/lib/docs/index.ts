import type { Block, DocGroup, DocPage } from "./types";
import { publicPages } from "./content/public";

export type { Block, DocGroup, DocPage } from "./types";

export const DOC_GROUPS: DocGroup[] = [
  {
    id: "start",
    title: "Start here",
    blurb: "A calm beginning, from your first event to your first reply.",
  },
  {
    id: "hosts",
    title: "For hosts & planners",
    blurb: "The guest list, the invitation and every place at the table.",
  },
  {
    id: "guests",
    title: "For guests",
    blurb: "Your invitation, your reply and what to bring on the day.",
  },
  {
    id: "staff",
    title: "At the door",
    blurb: "A warm welcome, with the right guest and the right pass.",
  },
];

export const DOC_PAGES: DocPage[] = publicPages;

export function getDocPage(slug: string): DocPage | undefined {
  return DOC_PAGES.find((p) => p.slug === slug);
}

export function pagesInGroup(id: DocGroup["id"]): DocPage[] {
  return DOC_PAGES.filter((p) => p.group === id);
}

/** Neighbours in reading order, for the previous and next links. */
export function neighbours(slug: string): {
  prev: DocPage | null;
  next: DocPage | null;
} {
  const i = DOC_PAGES.findIndex((p) => p.slug === slug);
  return {
    prev: i > 0 ? DOC_PAGES[i - 1] : null,
    next: i >= 0 && i < DOC_PAGES.length - 1 ? DOC_PAGES[i + 1] : null,
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/`|\*\*/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The h2 headings of a page, for its table of contents. */
export function pageHeadings(page: DocPage): { id: string; text: string }[] {
  return page.blocks
    .filter((b): b is Extract<Block, { t: "h2" }> => b.t === "h2")
    .map((b) => ({ id: slugify(b.x), text: b.x.replace(/`|\*\*/g, "") }));
}

function blockText(b: Block): string {
  switch (b.t) {
    case "ul":
    case "ol":
      return b.x.join(" ");
    case "table":
      return [...b.head, ...b.rows.flat()].join(" ");
    default:
      return b.x;
  }
}

/** Plain text of a page, lower-cased, for the search box. */
export function pageText(page: DocPage): string {
  return [page.title, page.summary, ...page.blocks.map(blockText)]
    .join(" ")
    .replace(/`|\*\*|\[([^\]]+)\]\([^)]+\)/g, "$1")
    .toLowerCase();
}

/** The searchable index shipped to the browser: titles, summaries and a short body. */
export function searchIndex() {
  return DOC_PAGES.map((p) => ({
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    group: p.group,
    text: pageText(p),
  }));
}

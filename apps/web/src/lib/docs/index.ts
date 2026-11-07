import type { Block, DocGroup, DocPage } from "./types";
import { startPages } from "./content/start";
import { hostPages } from "./content/hosts";
import { hostPages2 } from "./content/hosts2";
import { adminPages } from "./content/admin";
import { engineeringPages } from "./content/engineering";
import { referencePages } from "./content/reference";

export type { Block, DocGroup, DocPage } from "./types";

export const DOC_GROUPS: DocGroup[] = [
  {
    id: "start",
    title: "Start here",
    blurb: "What Àríyá is, a ten-minute tour and the words we use.",
  },
  {
    id: "hosts",
    title: "Host guide",
    blurb:
      "Everything a couple or planner does, from the guest list to the door.",
  },
  {
    id: "admin",
    title: "Team, safety and data",
    blurb: "Roles, security, privacy, email and billing.",
  },
  {
    id: "engineering",
    title: "Engineering",
    blurb: "Set up, deploy, test and extend the product.",
  },
  {
    id: "reference",
    title: "Reference",
    blurb: "Routes, variables, limits, fixes and what is not built yet.",
  },
];

export const DOC_PAGES: DocPage[] = [
  ...startPages,
  ...hostPages,
  ...hostPages2,
  ...adminPages,
  ...engineeringPages,
  ...referencePages,
];

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

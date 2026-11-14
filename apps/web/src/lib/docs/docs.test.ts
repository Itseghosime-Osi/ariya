import { describe, expect, it } from "vitest";
import {
  DOC_GROUPS,
  DOC_PAGES,
  getDocPage,
  neighbours,
  pageHeadings,
  pageText,
  searchIndex,
  slugify,
} from "./index";
import type { Block } from "./types";

function texts(b: Block): string[] {
  switch (b.t) {
    case "ul":
    case "ol":
      return b.x;
    case "table":
      return [...b.head, ...b.rows.flat()];
    default:
      return [b.x];
  }
}

describe("the manual", () => {
  it("has unique slugs and known groups", () => {
    const slugs = DOC_PAGES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const groups = new Set(DOC_GROUPS.map((g) => g.id));
    for (const p of DOC_PAGES) expect(groups.has(p.group)).toBe(true);
    for (const g of DOC_GROUPS) {
      expect(DOC_PAGES.some((p) => p.group === g.id)).toBe(true);
    }
  });

  it("gives every page a title, summary, audience and body", () => {
    for (const p of DOC_PAGES) {
      expect(p.title.length).toBeGreaterThan(2);
      expect(p.summary.length).toBeGreaterThan(10);
      expect(p.audience.length).toBeGreaterThan(2);
      expect(p.blocks.length).toBeGreaterThan(1);
    }
  });

  it("every internal manual link points at a real page", () => {
    const bad: string[] = [];
    for (const p of DOC_PAGES) {
      for (const block of p.blocks) {
        for (const t of texts(block)) {
          for (const m of t.matchAll(
            /\]\((\/documentation\/([a-z0-9-]+))\)/g
          )) {
            if (!getDocPage(m[2])) bad.push(`${p.slug} -> ${m[1]}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("only links to routes that exist", () => {
    const allowed = new Set([
      "/privacy",
      "/terms",
      "/documentation",
      "/events",
      "/pricing",
    ]);
    for (const p of DOC_PAGES) {
      for (const block of p.blocks) {
        for (const t of texts(block)) {
          for (const m of t.matchAll(/\]\((\/[^)]*)\)/g)) {
            const href = m[1];
            if (href.startsWith("/documentation/")) continue;
            expect(allowed.has(href), `${p.slug}: ${href}`).toBe(true);
          }
        }
      }
    }
  });

  it("makes unique heading ids on every page", () => {
    for (const p of DOC_PAGES) {
      const ids = pageHeadings(p).map((h) => h.id);
      expect(new Set(ids).size, p.slug).toBe(ids.length);
    }
  });

  it("keeps tables rectangular", () => {
    for (const p of DOC_PAGES) {
      for (const b of p.blocks) {
        if (b.t === "table") {
          for (const row of b.rows) {
            expect(row.length, `${p.slug}: ${row[0]}`).toBe(b.head.length);
          }
        }
      }
    }
  });

  it("covers customer tasks", () => {
    const needed = [
      "overview",
      "quick-start",
      "events",
      "guests",
      "invitations",
      "designer",
      "film",
      "rsvp",
      "seating",
      "check-in",
      "team",
      "faq",
      "public-page",
      "reminders",
      "the-day",
      "celebration-pass",
      "ai-helpers",
      "account",
    ];
    for (const slug of needed) expect(getDocPage(slug), slug).toBeDefined();
  });

  it("links neighbours in reading order", () => {
    expect(neighbours(DOC_PAGES[0].slug).prev).toBeNull();
    expect(neighbours(DOC_PAGES.at(-1)!.slug).next).toBeNull();
    expect(neighbours(DOC_PAGES[1].slug).prev?.slug).toBe(DOC_PAGES[0].slug);
  });

  it("builds a search index and plain text without markup", () => {
    const idx = searchIndex();
    expect(idx).toHaveLength(DOC_PAGES.length);
    const text = pageText(getDocPage("rsvp")!);
    expect(text).toContain("personal link");
    expect(text).not.toContain("**");
    expect(slugify("The `entry` **seal**!")).toBe("the-entry-seal");
  });

  it("keeps retired pages and implementation details out of public search", () => {
    const retired = [
      "setup",
      "deployment",
      "architecture",
      "data-model",
      "design-engine",
      "testing",
      "conventions",
      "design-system",
      "decisions",
      "routes",
      "environment",
      "troubleshooting",
      "roadmap",
      "billing",
      "security",
      "email",
      "mcp",
      "connect-ai",
      "privacy-and-data",
    ];
    const index = searchIndex();
    for (const slug of retired) {
      expect(getDocPage(slug), slug).toBeUndefined();
      expect(
        index.some((page) => page.slug === slug),
        slug
      ).toBe(false);
    }
    const all = JSON.stringify(index).toLowerCase();
    for (const detail of [
      "supabase",
      "paystack_secret",
      "hit_rate_limit",
      "timingsafeequal",
      "service_role",
      "pnpm",
      "public/hall3d",
      "cron",
      "rsvp_answers",
      "competitor",
      "rust",
      "rls",
    ]) {
      expect(all, detail).not.toContain(detail);
    }
  });
});

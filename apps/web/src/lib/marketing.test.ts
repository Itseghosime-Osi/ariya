import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CELEBRATION_PASS_AMOUNT_KOBO } from "./paystack";
import { FREE_PLAN_LIMIT } from "./plan";
import { pageMetadata } from "./site-metadata";
const routes = join(process.cwd(), "src/app/(marketing)");
const filmLayout = join(process.cwd(), "src/app/(film)/layout.tsx");
const filmParts = join(process.cwd(), "src/components/film/film-parts.tsx");

describe("public marketing integrity", () => {
  it.each(["about", "product", "pricing"])(
    "%s route carries canonical metadata",
    (page) => {
      // pageMetadata builds the canonical URL from the route path; the
      // layout supplies the site address as metadataBase (src/lib/site-url.ts).
      const metadata = pageMetadata({
        title: page,
        description: page,
        path: `/${page}`,
      });
      expect(metadata.alternates).toEqual({ canonical: `/${page}` });
    }
  );
  it.each(["about", "product", "pricing"])(
    "%s source declares its canonical path and no stale domain",
    (page) => {
      const source = readFileSync(join(routes, page, "page.tsx"), "utf8");
      expect(source).toContain(`path: "/${page}"`);
      expect(source).not.toContain("owambeplan.vercel.app");
    }
  );
  it("has no old /docs page left behind: the manual replaces it", () => {
    expect(existsSync(join(routes, "docs"))).toBe(false);
  });
  it("advertises the actual checkout amount without unsupported SMS reminders", () => {
    const source = readFileSync(join(routes, "pricing/page.tsx"), "utf8");
    const amount = (CELEBRATION_PASS_AMOUNT_KOBO / 100).toLocaleString("en-NG");
    expect(source).toContain(`₦${amount}`);
    expect(source).toContain(`Up to ${FREE_PLAN_LIMIT} guest invitations`);
    expect(source).not.toMatch(/\b20 guest invitations/);
    expect(source).not.toMatch(
      /₦45,000|₦30,000|SMS reminders|Placeholder prices/
    );
  });
});

describe("homepage social metadata and payload", () => {
  const layout = readFileSync(filmLayout, "utf8");
  const parts = readFileSync(filmParts, "utf8");

  it("provides social descriptions, images, locale and a canonical url", () => {
    for (const key of [
      "openGraph",
      "twitter",
      "siteName",
      "locale",
      "images",
      "description",
    ]) {
      expect(layout).toContain(key);
    }
    expect(layout).toContain('canonical: "/"');
    expect(layout).toContain("summary_large_image");
    // There is no official brand X account; do not invent attribution.
    expect(layout).not.toContain("twitter:site");
  });

  it("has one primary heading", () => {
    expect([...parts.matchAll(/<h1(?:\s|>)/g)]).toHaveLength(1);
  });
});

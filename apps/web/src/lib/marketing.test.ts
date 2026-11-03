import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CELEBRATION_PASS_AMOUNT_KOBO } from "./paystack";
import { pageMetadata } from "./site-metadata";
const site = join(process.cwd(), "public/site");
const routes = join(process.cwd(), "src/app/(marketing)");

describe("public marketing integrity", () => {
  it.each(["about", "product", "pricing", "docs"])(
    "%s route carries canonical metadata",
    (page) => {
      // pageMetadata builds the canonical URL from the route path; the
      // layout supplies the https://ariya-two.vercel.app metadataBase.
      const metadata = pageMetadata({
        title: page,
        description: page,
        path: `/${page}`,
      });
      expect(metadata.alternates).toEqual({ canonical: `/${page}` });
    }
  );
  it.each(["about", "product", "pricing", "docs"])(
    "%s source declares its canonical path and no stale domain",
    (page) => {
      const source = readFileSync(
        join(routes, page, page === "docs" ? "page.mdx" : "page.tsx"),
        "utf8"
      );
      expect(source).toContain(`path: "/${page}"`);
      expect(source).not.toContain("owambeplan.vercel.app");
    }
  );
  it("advertises the actual checkout amount without unsupported SMS reminders", () => {
    const source = readFileSync(join(routes, "pricing/page.tsx"), "utf8");
    const amount = (CELEBRATION_PASS_AMOUNT_KOBO / 100).toLocaleString("en-NG");
    expect(source).toContain(`₦${amount}`);
    expect(source).toContain("Up to 20 guest invitations");
    expect(source).not.toMatch(
      /₦45,000|₦30,000|SMS reminders|Placeholder prices/
    );
  });
});

describe("homepage social metadata and payload", () => {
  const html = readFileSync(join(site, "index.html"), "utf8");
  it("provides social descriptions, images, locale and install icons", () => {
    for (const tag of [
      "og:description",
      "og:image",
      "og:url",
      "og:site_name",
      "og:locale",
      "twitter:description",
      "twitter:image",
      "twitter:title",
    ]) {
      expect(html).toMatch(
        new RegExp(`<meta (?:name|property)="${tag}" content="[^"\\n]+"`)
      );
    }
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain('href="/manifest.webmanifest"');
    expect(html).toContain('href="/favicon-32x32.png"');
    expect(html).toContain('href="/favicon-96x96.png"');
    // There is no official brand X account; do not invent attribution.
    expect(html).not.toContain('name="twitter:site"');
  });
  it("has one primary heading and keeps film implementation outside the document", () => {
    expect([...html.matchAll(/<h1(?:\s|>)/g)]).toHaveLength(1);
    expect(Buffer.byteLength(html)).toBeLessThan(100_000);
    expect(html).toMatch(
      /<script src="assets\/the-yes-controls\.[a-f0-9]+\.js"><\/script>/
    );
    expect(html).toMatch(
      /<script type="module" src="assets\/the-yes-scene\.[a-f0-9]+\.js"><\/script>/
    );
  });
});

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CELEBRATION_PASS_AMOUNT_KOBO } from "./paystack";
const site = join(process.cwd(), "public/site");

describe("public marketing integrity", () => {
  it.each(["index", "about", "product", "pricing"])(
    "%s has working local scripts and canonical metadata",
    (page) => {
      const html = readFileSync(join(site, `${page}.html`), "utf8");
      for (const [, src] of html.matchAll(
        /<script[^>]+src="(assets\/[^"?]+)"/g
      ))
        expect(existsSync(join(site, src))).toBe(true);
      expect(html).toContain(
        `rel="canonical" href="https://ariya-two.vercel.app/${page === "index" ? "" : page}"`
      );
      expect(html).not.toContain("owambeplan.vercel.app");
      for (const [, json] of html.matchAll(
        /<script type="application\/ld\+json">(.*?)<\/script>/gs
      ))
        expect(() => JSON.parse(json)).not.toThrow();
    }
  );
  it("advertises the actual checkout amount without unsupported SMS reminders", () => {
    const html = readFileSync(join(site, "pricing.html"), "utf8");
    const amount = (CELEBRATION_PASS_AMOUNT_KOBO / 100).toLocaleString("en-NG");
    expect(html).toContain(`₦${amount}`);
    expect(html).toContain("Up to 20 guest invitations");
    expect(html).not.toMatch(
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

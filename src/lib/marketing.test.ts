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

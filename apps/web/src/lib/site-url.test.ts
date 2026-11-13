import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { SITE_ICONS, SITE_URL, siteUrl } from "./site-url";

describe("the published site address", () => {
  it("is ariyaday.com, not a preview or vercel.app address", () => {
    expect(SITE_URL).toBe("https://www.ariyaday.com");
    expect(SITE_URL).not.toMatch(/vercel\.app|localhost/);
  });

  it("builds absolute URLs from a path with or without a leading slash", () => {
    expect(siteUrl("/product")).toBe("https://www.ariyaday.com/product");
    expect(siteUrl("about")).toBe("https://www.ariyaday.com/about");
    expect(siteUrl()).toBe("https://www.ariyaday.com/");
  });

  it("puts every sitemap entry on that address", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.length).toBeGreaterThan(5);
    expect(urls.every((u) => u.startsWith(`${SITE_URL}/`))).toBe(true);
    expect(urls).toContain(`${SITE_URL}/`);
  });

  it("points robots.txt at the sitemap on that address", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("declares the icons Google, iOS and browsers look for", () => {
    const { icon, apple } = SITE_ICONS as {
      icon: { url: string }[];
      apple: { url: string }[];
    };
    const icons = icon.map((i) => i.url);
    expect(icons).toEqual(
      expect.arrayContaining([
        "/favicon.ico",
        "/favicon-32x32.png",
        "/site/assets/icon.svg",
      ])
    );
    expect(apple[0].url).toBe("/apple-touch-icon.png");
  });
});

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { DOC_PAGES } from "@/lib/docs";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "about",
    "product",
    "pricing",
    "privacy",
    "terms",
    "documentation",
    ...DOC_PAGES.map((p) => `documentation/${p.slug}`),
  ].map((path) => ({
    url: siteUrl(`/${path}`),
  }));
}

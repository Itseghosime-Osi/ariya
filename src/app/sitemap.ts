import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "about", "product", "pricing"].map((path) => ({
    url: `https://ariya-two.vercel.app/${path}`,
  }));
}

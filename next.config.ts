import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/site/index.html",
      },
      {
        source: "/about",
        destination: "/site/about.html",
      },
      {
        source: "/product",
        destination: "/site/product.html",
      },
      {
        source: "/pricing",
        destination: "/site/pricing.html",
      },
      {
        source: "/story",
        destination: "/site/story.html",
      },
      {
        source: "/film",
        destination: "/site/film.html",
      },
      {
        source: "/assets/:path*",
        destination: "/site/assets/:path*",
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);

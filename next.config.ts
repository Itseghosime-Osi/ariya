import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/planner.html",
        destination: "/events",
        permanent: false,
      },
      {
        source: "/rsvp.html",
        destination: "/sign-in",
        permanent: false,
        // TODO: In Phase 4, point /rsvp.html to the real guest route (/i/[token])
      },
    ];
  },
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
        source: "/about.html",
        destination: "/site/about.html",
      },
      {
        source: "/product",
        destination: "/site/product.html",
      },
      {
        source: "/product.html",
        destination: "/site/product.html",
      },
      {
        source: "/pricing",
        destination: "/site/pricing.html",
      },
      {
        source: "/pricing.html",
        destination: "/site/pricing.html",
      },
      {
        source: "/story",
        destination: "/site/story.html",
      },
      {
        source: "/story.html",
        destination: "/site/story.html",
      },
      {
        source: "/film",
        destination: "/site/film.html",
      },
      {
        source: "/film.html",
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

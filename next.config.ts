import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

function getRemotePatterns() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return [];

  try {
    const parsed = new URL(supabaseUrl);
    const protocol = parsed.protocol.replace(":", "") as "http" | "https";
    return [
      {
        protocol,
        hostname: parsed.hostname,
        ...(parsed.port ? { port: parsed.port } : {}),
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: getRemotePatterns(),
  },
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/sign-in",
        permanent: false,
      },
      {
        source: "/signup",
        destination: "/sign-up",
        permanent: false,
      },
      {
        source: "/planner.html",
        destination: "/events",
        permanent: false,
      },
      {
        source: "/rsvp.html",
        has: [
          {
            type: "query",
            key: "token",
            value: "(?<token>.*)",
          },
        ],
        destination: "/i/:token",
        permanent: false,
      },
      {
        source: "/rsvp.html",
        has: [
          {
            type: "query",
            key: "g",
            value: "(?<g>.*)",
          },
        ],
        destination: "/i/:g",
        permanent: false,
      },
      {
        source: "/rsvp.html",
        destination: "/events",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // The film is the home page. It has to be a beforeFiles rewrite: an
    // ordinary (afterFiles) rewrite runs only after the app's own routes, so an
    // app route at "/" would win and visitors would never see the film.
    const beforeFiles = [
      {
        source: "/",
        destination: "/site/index.html",
      },
    ];
    const afterFiles = [
      {
        source: "/rsvp/:token",
        destination: "/i/:token",
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
    return { beforeFiles, afterFiles };
  },
};

export default withBundleAnalyzer(nextConfig);

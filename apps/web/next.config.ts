import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import createMDX from "@next/mdx";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export function parseSupabaseUrl(supabaseUrl?: string): URL | null {
  if (!supabaseUrl) return null;
  try {
    return new URL(supabaseUrl);
  } catch {
    return null;
  }
}

export function shouldAllowLocalIP(supabaseUrl?: string): true | undefined {
  const parsed = parseSupabaseUrl(supabaseUrl);
  if (!parsed) return undefined;

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  const localHostnames = ["localhost", "127.0.0.1", "::1"];

  if (localHostnames.includes(hostname)) {
    return true;
  }

  return undefined;
}

export const getDangerouslyAllowLocalIP = shouldAllowLocalIP;

export function getRemotePatterns(
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
) {
  const parsed = parseSupabaseUrl(supabaseUrl);
  if (!parsed) return [];

  const protocol = parsed.protocol.replace(":", "") as "http" | "https";
  return [
    {
      protocol,
      hostname: parsed.hostname,
      ...(parsed.port ? { port: parsed.port } : {}),
    },
  ];
}

const allowLocalIP = shouldAllowLocalIP(process.env.NEXT_PUBLIC_SUPABASE_URL);

const nextConfig: NextConfig = {
  // One styled 404 for every address that matches no route, whichever layout group it falls in.
  experimental: { globalNotFound: true },
  reactStrictMode: true,
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  images: {
    remotePatterns: getRemotePatterns(),
    ...(allowLocalIP ? { dangerouslyAllowLocalIP: true } : {}),
  },
  async headers() {
    return [
      // The service worker that shows app notifications: never cached, so updates land at once.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      ...[
        "/assets/ariya-render.6d6d4c8adbfd.js",
        "/assets/the-yes-controls.819e8d5cbcae.js",
        "/assets/the-yes-scene.5d2cde94cd5e.js",
        "/site/assets/ariya-render.6d6d4c8adbfd.js",
        "/site/assets/the-yes-controls.819e8d5cbcae.js",
        "/site/assets/the-yes-scene.5d2cde94cd5e.js",
      ].map((source) => ({
        source,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Keep same-origin film embeds, inline scripts and payment integrations working.
          {
            key: "Content-Security-Policy",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
          },
        ],
      },
      {
        source: "/e/:path*",
        has: [{ type: "query", key: "token" }],
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        // The host's own screens tell only this app where a visitor came from, so a page opened from
        // them can offer "Go back"; nothing is sent to other sites.
        source: "/events/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      ...[
        "/i/:path*",
        "/rsvp/:path*",
        "/rsvp.html",
        "/invite/:path*",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
      ].map((source) => ({
        source,
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      })),
    ];
  },
  async redirects() {
    return [
      ...["about", "product", "pricing", "docs", "story", "film"].map(
        (page) => ({
          source: `/${page}.html`,
          destination: page === "film" || page === "story" ? "/" : `/${page}`,
          permanent: true,
        })
      ),
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
    // Legacy asset paths: the marketing pages reference /assets/*, which
    // lives under /site/assets in public.
    return [
      {
        source: "/rsvp/:token",
        destination: "/i/:token",
      },
      {
        source: "/assets/:path*",
        destination: "/site/assets/:path*",
      },
    ];
  },
};

export default withBundleAnalyzer(createMDX()(nextConfig));

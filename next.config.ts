import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

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
  reactStrictMode: true,
  images: {
    remotePatterns: getRemotePatterns(),
    ...(allowLocalIP ? { dangerouslyAllowLocalIP: true } : {}),
  },
  async headers() {
    return [
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
      ...[
        "/i/:path*",
        "/rsvp/:path*",
        "/rsvp.html",
        "/invite/:path*",
        "/events/:path*",
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
      ...["about", "product", "pricing", "story", "film"].map((page) => ({
        source: `/${page}.html`,
        destination: page === "film" || page === "story" ? "/" : `/${page}`,
        permanent: true,
      })),
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

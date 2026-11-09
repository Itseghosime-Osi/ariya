import { NextRequest, NextResponse } from "next/server";

function isPrivateIp(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  ) {
    return true;
  }
  // Disallow common private IP ranges (10.x, 172.16-31.x, 192.168.x)
  const parts = hostname.split(".").map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true; // Link-local
  }
  return false;
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new NextResponse("Unsupported protocol", { status: 400 });
  }

  if (isPrivateIp(parsed.hostname)) {
    return new NextResponse("Forbidden target host", { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Ariya-Design-Studio/1.0",
        Accept: "image/*",
      },
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return new NextResponse(`Upstream error: ${upstream.statusText}`, {
        status: upstream.status,
      });
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      return new NextResponse("Target is not an image", { status: 400 });
    }

    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Proxy fetch error";
    return new NextResponse(message, { status: 502 });
  }
}

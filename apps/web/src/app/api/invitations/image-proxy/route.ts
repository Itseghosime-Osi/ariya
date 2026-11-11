import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Only our uploaded public invitation artwork may be proxied; never arbitrary destinations. */
export async function GET(req: NextRequest) {
  let target: URL;
  try {
    target = new URL(req.nextUrl.searchParams.get("url") ?? "");
    const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (
      target.origin !== storage.origin ||
      target.username ||
      target.password ||
      !["https:", "http:"].includes(target.protocol) ||
      !target.pathname.startsWith("/storage/v1/object/public/event-covers/") ||
      (process.env.NODE_ENV === "production" && target.protocol !== "https:")
    )
      return new NextResponse("Unsupported image source", { status: 403 });
  } catch {
    return new NextResponse("Invalid image source", { status: 400 });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const upstream = await fetch(target.href, {
      signal: controller.signal,
      redirect: "error",
      headers: { Accept: "image/png,image/jpeg,image/webp" },
    });
    if (!upstream.ok)
      return new NextResponse("The image could not be loaded", { status: 502 });
    const type = (upstream.headers.get("content-type") ?? "").split(";")[0];
    if (!IMAGE_TYPES.has(type))
      return new NextResponse("Unsupported image format", { status: 415 });
    if (Number(upstream.headers.get("content-length")) > MAX_BYTES) {
      await upstream.body?.cancel();
      return new NextResponse("Image exceeds 15 MB", { status: 413 });
    }
    const reader = upstream.body?.getReader();
    if (!reader) return new NextResponse("Empty image", { status: 502 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        return new NextResponse("Image exceeds 15 MB", { status: 413 });
      }
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new NextResponse(body, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(
      "The image could not be loaded. Please try again.",
      { status: 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}

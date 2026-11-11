/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
const origin = "https://storage.example.test";
const image = `${origin}/storage/v1/object/public/event-covers/demo/card.png`;
const request = (url: string) =>
  new NextRequest(
    `https://ariya.example.test/api/invitations/image-proxy?url=${encodeURIComponent(url)}`
  );
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", origin);
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("invitation export image proxy", () => {
  it.each([
    "http://127.0.0.1/admin",
    "https://attacker.test/image.png",
    `${origin}/auth/v1/admin/users`,
    `${origin}/storage/v1/object/public/other/card.png`,
    `https://user:password@storage.example.test/storage/v1/object/public/event-covers/card.png`,
  ])("rejects unsupported destination %s without fetching", async (url) => {
    expect((await GET(request(url))).status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects a missing or invalid URL", async () => {
    expect((await GET(request("invalid"))).status).toBe(400);
  });
  it("returns allowed artwork with safe headers and refuses redirects", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "image/png" },
      })
    );
    const response = await GET(request(image));
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3])
    );
    expect(fetch).toHaveBeenCalledWith(
      image,
      expect.objectContaining({ redirect: "error" })
    );
  });
  it("rejects HTML disguised as artwork", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("<html>", { headers: { "Content-Type": "text/html" } })
    );
    expect((await GET(request(image))).status).toBe(415);
  });
  it("rejects an oversized advertised response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("large", {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(16 * 1024 * 1024),
        },
      })
    );
    expect((await GET(request(image))).status).toBe(413);
  });
  it("rejects a streamed oversized response without trusting content-length", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array(16 * 1024 * 1024), {
        headers: { "Content-Type": "image/png" },
      })
    );
    expect((await GET(request(image))).status).toBe(413);
  });
  it("reports upstream failures without exposing response bodies", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("private upstream details"));
    const response = await GET(request(image));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private upstream details");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { proxy } from "./proxy";
import * as supabaseMiddleware from "@/lib/supabase/middleware";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

function mockSession(
  user: Partial<User> | null,
  cookiesToSet?: Array<{
    name: string;
    value: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
  }>
) {
  const dummyResponse = NextResponse.next();
  if (cookiesToSet) {
    cookiesToSet.forEach((c) => {
      dummyResponse.cookies.set(c);
    });
  }
  vi.mocked(supabaseMiddleware.updateSession).mockResolvedValue({
    supabaseResponse: dummyResponse,
    user: user as User | null,
  });
}

describe("proxy route protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated user accessing /events to /sign-in?next=/events", async () => {
    mockSession(null);

    const req = new NextRequest("http://localhost:3000/events?tab=overview");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/sign-in?next=%2Fevents%3Ftab%3Doverview"
    );
  });

  it("copies cookies with options onto redirect responses", async () => {
    mockSession(null, [
      {
        name: "sb-auth-token",
        value: "xyz123",
        path: "/",
        httpOnly: true,
        secure: true,
      },
    ]);

    const req = new NextRequest("http://localhost:3000/events");
    const res = await proxy(req);

    expect(res.status).toBe(307);
    const cookie = res.cookies.get("sb-auth-token");
    expect(cookie?.value).toBe("xyz123");
  });

  it("does NOT call updateSession for /sign-in (public fast-path)", async () => {
    // sign-in is now fully public; the proxy should never touch Supabase for it.
    const req = new NextRequest("http://localhost:3000/sign-in");
    const res = await proxy(req);

    expect(supabaseMiddleware.updateSession).not.toHaveBeenCalled();
    // No redirect from proxy — the page renders normally.
    expect(res.status).not.toBe(307);
  });

  it("does NOT call updateSession for public marketing pages", async () => {
    for (const path of ["/", "/film", "/about", "/pricing"]) {
      vi.clearAllMocks();
      const req = new NextRequest(`http://localhost:3000${path}`);
      await proxy(req);
      expect(supabaseMiddleware.updateSession).not.toHaveBeenCalled();
    }
  });

  it("does NOT call updateSession for public event pages (/e/...)", async () => {
    const req = new NextRequest("http://localhost:3000/e/my-event-slug");
    await proxy(req);
    expect(supabaseMiddleware.updateSession).not.toHaveBeenCalled();
  });

  it("allows authenticated user reaching /reset-password without redirecting away", async () => {
    mockSession({ id: "recovery-user-123" });

    const req = new NextRequest("http://localhost:3000/reset-password");
    // reset-password is NOT in the fast-path list, so updateSession is called.
    const res = await proxy(req);

    // Should not redirect to /events; let the recovery session reach the reset form
    expect(res.status).not.toBe(307);
    expect(res.headers.get("location")).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { middleware } from "./middleware";
import * as supabaseMiddleware from "@/lib/supabase/middleware";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

function mockSession(user: Partial<User> | null) {
  const dummyResponse = NextResponse.next();
  vi.mocked(supabaseMiddleware.updateSession).mockResolvedValue({
    supabaseResponse: dummyResponse,
    user: user as User | null,
  });
}

describe("middleware route protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated user accessing /events to /sign-in?next=/events", async () => {
    mockSession(null);

    const req = new NextRequest("http://localhost:3000/events?tab=overview");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/sign-in?next=%2Fevents%3Ftab%3Doverview"
    );
  });

  it("redirects authenticated user accessing /sign-in to /events", async () => {
    mockSession({ id: "user-123" });

    const req = new NextRequest("http://localhost:3000/sign-in");
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/events");
  });

  it("redirects authenticated user to next parameter if valid internal path", async () => {
    mockSession({ id: "user-123" });

    const req = new NextRequest(
      "http://localhost:3000/sign-in?next=/events/event-abc"
    );
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/events/event-abc"
    );
  });

  it("ignores external next redirect and falls back to /events", async () => {
    mockSession({ id: "user-123" });

    const req = new NextRequest(
      "http://localhost:3000/sign-in?next=https://attacker.com"
    );
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/events");
  });
});

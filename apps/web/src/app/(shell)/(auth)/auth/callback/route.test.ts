import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchange = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: exchange },
  }),
}));

import { GET } from "./route";

const call = (query: string) =>
  GET(new NextRequest(`https://ariyaday.com/auth/callback${query}`));

describe("the auth callback", () => {
  beforeEach(() => exchange.mockClear());

  it("signs the person in and follows a safe next path", async () => {
    exchange.mockResolvedValueOnce({ error: null });
    const res = await call("?code=abc&next=/events/1/guests");
    expect(res.headers.get("location")).toBe(
      "https://ariyaday.com/events/1/guests"
    );
  });

  it("never follows a next path that leaves the app", async () => {
    exchange.mockResolvedValueOnce({ error: null });
    const res = await call("?code=abc&next=https://evil.example");
    expect(res.headers.get("location")).toBe("https://ariyaday.com/events");
  });

  it("tells a person who closed Google's window that it was cancelled", async () => {
    const res = await call("?error=access_denied&error_description=denied");
    expect(res.headers.get("location")).toBe(
      "https://ariyaday.com/sign-in?error=oauth_cancelled"
    );
    expect(exchange).not.toHaveBeenCalled();
  });

  it("reports any other provider error as a failed sign-in", async () => {
    const res = await call("?error=server_error");
    expect(res.headers.get("location")).toBe(
      "https://ariyaday.com/sign-in?error=oauth_failed"
    );
  });

  it("sends an unusable code back to sign-in", async () => {
    exchange.mockResolvedValueOnce({ error: new Error("expired") });
    const res = await call("?code=stale");
    expect(res.headers.get("location")).toBe(
      "https://ariyaday.com/sign-in?error=auth_callback_failed"
    );
  });
});

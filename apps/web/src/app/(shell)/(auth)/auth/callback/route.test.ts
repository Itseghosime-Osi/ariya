import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const exchange = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: exchange },
  }),
}));

import { GET } from "./route";
import { isNewOAuthAccount } from "@/features/auth/new-account";

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

  it("welcomes a brand-new Google account with fireworks", async () => {
    exchange.mockResolvedValueOnce({
      error: null,
      data: {
        user: {
          id: "u1",
          created_at: new Date().toISOString(),
          app_metadata: { provider: "google" },
        },
      },
    });
    const res = await call("?code=abc&next=/events");
    expect(res.headers.get("location")).toBe(
      "https://ariyaday.com/events?welcome=1"
    );
  });

  it("does not replay the welcome for a returning Google account", async () => {
    exchange.mockResolvedValueOnce({
      error: null,
      data: {
        user: {
          id: "u1",
          created_at: "2026-01-01T00:00:00Z",
          app_metadata: { provider: "google" },
        },
      },
    });
    const res = await call("?code=abc&next=/events");
    expect(res.headers.get("location")).toBe("https://ariyaday.com/events");
  });

  it("sends an unusable code back to sign-in", async () => {
    exchange.mockResolvedValueOnce({ error: new Error("expired") });
    const res = await call("?code=stale");
    expect(res.headers.get("location")).toBe(
      "https://ariyaday.com/sign-in?error=auth_callback_failed"
    );
  });
});

describe("isNewOAuthAccount", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  it("counts a provider account made in the last few minutes", () => {
    expect(
      isNewOAuthAccount(
        {
          created_at: "2026-11-16T11:58:00Z",
          app_metadata: { provider: "google" },
        },
        now
      )
    ).toBe(true);
  });
  it("ignores email accounts, old accounts and missing users", () => {
    expect(
      isNewOAuthAccount(
        {
          created_at: "2026-11-16T11:59:00Z",
          app_metadata: { provider: "email" },
        },
        now
      )
    ).toBe(false);
    expect(
      isNewOAuthAccount(
        {
          created_at: "2026-11-16T10:00:00Z",
          app_metadata: { provider: "google" },
        },
        now
      )
    ).toBe(false);
    expect(isNewOAuthAccount(null, now)).toBe(false);
  });
});

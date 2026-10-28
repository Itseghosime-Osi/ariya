import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkRateLimit,
  checkRateLimitByKeyAndIp,
  getClientIpHash,
} from "./rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: (name: string) => {
      if (name.toLowerCase() === "x-forwarded-for")
        return "192.168.1.100, 10.0.0.1";
      return null;
    },
  }),
}));

describe("getClientIpHash", () => {
  it("hashes client IP from x-forwarded-for", async () => {
    const hash = await getClientIpHash();
    expect(hash).toHaveLength(32);
    // Hashing 192.168.1.100
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("checkRateLimit", () => {
  let mockRpc: ReturnType<typeof vi.fn>;
  let mockClient: SupabaseClient<Database>;

  beforeEach(() => {
    mockRpc = vi.fn();
    mockClient = {
      rpc: mockRpc,
    } as unknown as SupabaseClient<Database>;
  });

  it("returns success when allowed by RPC", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          allowed: true,
          remaining: 9,
          reset_at: new Date(Date.now() + 60000).toISOString(),
        },
      ],
      error: null,
    });

    const res = await checkRateLimit("key-1", 10, "1 minute", mockClient);
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(9);
    expect(mockRpc).toHaveBeenCalledWith("hit_rate_limit", {
      p_key: "key-1",
      p_limit: 10,
      p_window: "1 minute",
    });
  });

  it("returns failure when blocked by RPC", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          allowed: false,
          remaining: 0,
          reset_at: new Date(Date.now() + 30000).toISOString(),
        },
      ],
      error: null,
    });

    const res = await checkRateLimit("key-1", 10, "1 minute", mockClient);
    expect(res.success).toBe(false);
    expect(res.remaining).toBe(0);
    expect(res.retryAfter).toBeGreaterThan(0);
  });

  it("handles RPC errors gracefully", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "connection error" },
    });

    const res = await checkRateLimit("key-1", 10, "1 minute", mockClient);
    expect(res.success).toBe(false);
    expect(res.remaining).toBe(0);
  });
});

describe("checkRateLimitByKeyAndIp", () => {
  it("enforces both token and ip rate limits", async () => {
    const mockRpc = vi.fn().mockImplementation((_, args) => {
      if (args.p_key.includes("token:valid-token")) {
        return Promise.resolve({
          data: [
            {
              allowed: true,
              remaining: 8,
              reset_at: new Date(Date.now() + 60000).toISOString(),
            },
          ],
          error: null,
        });
      }
      if (args.p_key.includes("ip:")) {
        return Promise.resolve({
          data: [
            {
              allowed: false,
              remaining: 0,
              reset_at: new Date(Date.now() + 45000).toISOString(),
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const mockClient = { rpc: mockRpc } as unknown as SupabaseClient<Database>;

    const res = await checkRateLimitByKeyAndIp({
      prefix: "submit",
      identifier: "valid-token",
      tokenLimit: 10,
      ipLimit: 30,
      client: mockClient,
    });

    expect(res.success).toBe(false);
    expect(res.remaining).toBe(0);
  });
});

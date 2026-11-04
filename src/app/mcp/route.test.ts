import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { MCP_TOOL_NAMES } from "@/features/mcp/server";
import { GET, MCP_RATE_LIMIT_PER_MINUTE, POST, mcpRateLimitKey } from "./route";

const { verifyAccessTokenMock, checkRateLimitMock, createBearerClientMock } =
  vi.hoisted(() => ({
    verifyAccessTokenMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    createBearerClientMock: vi.fn(),
  }));

vi.mock("@/lib/supabase/bearer", () => ({
  verifyAccessToken: verifyAccessTokenMock,
  createBearerClient: createBearerClientMock,
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: checkRateLimitMock }));

const USER = { id: "user-1", email: "host@example.com" };
const CLIENT_ID = "client-abc";
const TOKEN = "a-valid-token";

function call(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/** No tool body runs when the call is only `tools/list`, so the client is never touched. */
function fakeClient(): SupabaseClient<Database> {
  return {} as SupabaseClient<Database>;
}

beforeEach(() => {
  verifyAccessTokenMock.mockReset();
  checkRateLimitMock.mockReset();
  createBearerClientMock.mockReset();

  verifyAccessTokenMock.mockResolvedValue({ user: USER, clientId: CLIENT_ID });
  checkRateLimitMock.mockResolvedValue({ success: true, remaining: 59 });
  createBearerClientMock.mockReturnValue(fakeClient());
});

describe("POST /mcp authentication", () => {
  it("answers 401 with the resource metadata challenge when there is no header", async () => {
    const response = await POST(
      call({ jsonrpc: "2.0", id: 1, method: "tools/list" })
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource"'
    );
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("answers 401 for a token sent under the wrong scheme", async () => {
    const response = await POST(
      call(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: `Basic ${TOKEN}` }
      )
    );

    expect(response.status).toBe(401);
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });

  it("answers 401 for an invalid or revoked token, without spending the rate limit", async () => {
    verifyAccessTokenMock.mockResolvedValue(null);

    const response = await POST(
      call(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: `Bearer ${TOKEN}` }
      )
    );

    expect(response.status).toBe(401);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(createBearerClientMock).not.toHaveBeenCalled();
  });
});

describe("POST /mcp rate limiting", () => {
  it("meters each host separately at 60 a minute", async () => {
    await POST(
      call(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: `Bearer ${TOKEN}` }
      )
    );

    expect(checkRateLimitMock).toHaveBeenCalledWith(
      mcpRateLimitKey("user-1"),
      MCP_RATE_LIMIT_PER_MINUTE,
      "1 minute"
    );
    expect(MCP_RATE_LIMIT_PER_MINUTE).toBe(60);
  });

  it("answers 429 with Retry-After and builds no client", async () => {
    checkRateLimitMock.mockResolvedValue({ success: false, retryAfter: 42 });

    const response = await POST(
      call(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: `Bearer ${TOKEN}` }
      )
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(createBearerClientMock).not.toHaveBeenCalled();
  });
});

describe("tools/list", () => {
  it("publishes exactly the tools the server registers", async () => {
    const response = await POST(
      call(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: `Bearer ${TOKEN}` }
      )
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      result: { tools: { name: string }[] };
    };

    expect(body.result.tools.map((tool) => tool.name).sort()).toEqual(
      [...MCP_TOOL_NAMES].sort()
    );
  });

  it("hands the tool context the client behind the token", async () => {
    const response = await POST(
      call(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: `Bearer ${TOKEN}` }
      )
    );

    expect(response.status).toBe(200);
    expect(verifyAccessTokenMock).toHaveBeenCalledWith(TOKEN);
    expect(createBearerClientMock).toHaveBeenCalledWith(TOKEN, USER);
  });
});

describe("GET /mcp", () => {
  it("answers 405 with Allow: POST for a caller holding a token", async () => {
    const response = await GET(
      new Request("http://localhost:3000/mcp", {
        headers: { authorization: `Bearer ${TOKEN}` },
      })
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("still answers 401 without a token", async () => {
    const response = await GET(new Request("http://localhost:3000/mcp"));

    expect(response.status).toBe(401);
  });
});

describe("/mcp Origin check", () => {
  it("answers 403 for an Origin that is not allowlisted, before spending a token", async () => {
    const response = await POST(
      call(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: `Bearer ${TOKEN}`, origin: "https://evil.example" }
      )
    );

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("Origin");

    // A rebound page must not even reach token verification or the rate limiter.
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(createBearerClientMock).not.toHaveBeenCalled();
  });

  it("answers 403 on GET for a blocked Origin too", async () => {
    const response = await GET(
      new Request("http://localhost:3000/mcp", {
        headers: {
          authorization: `Bearer ${TOKEN}`,
          origin: "https://evil.example",
        },
      })
    );

    expect(response.status).toBe(403);
    expect(verifyAccessTokenMock).not.toHaveBeenCalled();
  });

  it("lets an allowlisted Origin through", async () => {
    for (const origin of [
      "https://claude.ai",
      "https://chatgpt.com",
      "http://localhost:3000",
      "http://127.0.0.1:57321",
    ]) {
      const response = await POST(
        call(
          { jsonrpc: "2.0", id: 1, method: "tools/list" },
          { authorization: `Bearer ${TOKEN}`, origin }
        )
      );

      expect(response.status).toBe(200);
    }
  });

  it("leaves a request with no Origin header unaffected", async () => {
    const response = await POST(
      call(
        { jsonrpc: "2.0", id: 1, method: "tools/list" },
        { authorization: `Bearer ${TOKEN}` }
      )
    );

    expect(response.status).toBe(200);
    expect(verifyAccessTokenMock).toHaveBeenCalledWith(TOKEN);
  });
});

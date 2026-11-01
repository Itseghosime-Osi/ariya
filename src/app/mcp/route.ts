import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { wwwAuthenticateHeader } from "@/features/mcp/metadata";
import { isAllowedOrigin } from "@/features/mcp/origin";
import { createAriyaMcpServer } from "@/features/mcp/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createBearerClient, verifyAccessToken } from "@/lib/supabase/bearer";
import { withSupabaseClient } from "@/lib/supabase/request-context";

// The request-scoped client rides on node:async_hooks, so this cannot run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = "no-store";

/** One ceiling per host, shared by every app they have connected. */
export const MCP_RATE_LIMIT_PER_MINUTE = 60;
export const MCP_RATE_LIMIT_WINDOW = "1 minute";

export function mcpRateLimitKey(userId: string): string {
  return `mcp:${userId}`;
}

/**
 * DNS-rebinding protection, checked before anything else: a browser whose page is not on the
 * allowlist is refused without its token ever being examined.
 */
function originRefused(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "That Origin is not allowed to call this endpoint.",
      },
      id: null,
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": NO_STORE,
      },
    }
  );
}

function unauthorized(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": NO_STORE,
        // RFC 9728: where the client discovers the authorization server.
        "WWW-Authenticate": wwwAuthenticateHeader(),
      },
    }
  );
}

/** Stateless: there is no SSE stream to subscribe to and no session to tear down. */
function methodNotAllowed(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed." },
      id: null,
    }),
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Content-Type": "application/json",
        "Cache-Control": NO_STORE,
      },
    }
  );
}

/**
 * 429 with the same JSON-RPC envelope the handler uses, so a connector surfaces the reason rather
 * than a bare transport error. Retry-After is what a client is meant to honour.
 */
function rateLimited(retryAfter?: number): Response {
  const seconds = Math.max(1, Math.ceil(retryAfter ?? 60));
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: `Too many requests. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`,
      },
      id: null,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": NO_STORE,
        "Retry-After": String(seconds),
      },
    }
  );
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, ...rest] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;
  return rest.join(" ").trim() || null;
}

export async function POST(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request.headers.get("origin"))) return originRefused();

  const token = bearerToken(request);
  if (!token) return unauthorized();

  const identity = await verifyAccessToken(token);
  if (!identity) return unauthorized();

  const limit = await checkRateLimit(
    mcpRateLimitKey(identity.user.id),
    MCP_RATE_LIMIT_PER_MINUTE,
    MCP_RATE_LIMIT_WINDOW
  );
  if (!limit.success) return rateLimited(limit.retryAfter);

  const client = createBearerClient(token, identity.user);
  const server = createAriyaMcpServer(client, identity.user, identity.clientId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    // No session id: each request stands alone, so nothing survives between calls.
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    // The transport and every reused server action inside it resolve to this client.
    return await withSupabaseClient(client, () =>
      transport.handleRequest(request)
    );
  } finally {
    await server.close();
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!isAllowedOrigin(request.headers.get("origin"))) return originRefused();

  const token = bearerToken(request);
  if (!token) return unauthorized();

  const identity = await verifyAccessToken(token);
  if (!identity) return unauthorized();

  const limit = await checkRateLimit(
    mcpRateLimitKey(identity.user.id),
    MCP_RATE_LIMIT_PER_MINUTE,
    MCP_RATE_LIMIT_WINDOW
  );
  if (!limit.success) return rateLimited(limit.retryAfter);

  return methodNotAllowed();
}

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { wwwAuthenticateHeader } from "@/features/mcp/metadata";
import { createAriyaMcpServer } from "@/features/mcp/server";
import { createBearerClient, verifyAccessToken } from "@/lib/supabase/bearer";
import { withSupabaseClient } from "@/lib/supabase/request-context";

// The request-scoped client rides on node:async_hooks, so this cannot run on Edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = "no-store";

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

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, ...rest] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return null;
  return rest.join(" ").trim() || null;
}

export async function POST(request: Request): Promise<Response> {
  const token = bearerToken(request);
  if (!token) return unauthorized();

  const user = await verifyAccessToken(token);
  if (!user) return unauthorized();

  const client = createBearerClient(token, user);
  const server = createAriyaMcpServer(client, user);
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
  const token = bearerToken(request);
  if (!token) return unauthorized();
  if (!(await verifyAccessToken(token))) return unauthorized();
  return methodNotAllowed();
}

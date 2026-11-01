import { clientEnv } from "@/lib/env/client";

export const MCP_PATH = "/mcp";
export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

/** The app's own origin, without a trailing slash, so paths can be concatenated. */
export function appBaseUrl(): string {
  return clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
}

export function resourceMetadataUrl(): string {
  return `${appBaseUrl()}${RESOURCE_METADATA_PATH}`;
}

export function mcpResourceUrl(): string {
  return `${appBaseUrl()}${MCP_PATH}`;
}

/**
 * RFC 9728 protected resource metadata. The authorization server is the project's Supabase Auth
 * instance, which is what turns a connector's "connect" button into a real OAuth 2.1 flow.
 */
export function protectedResourceMetadata() {
  const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  return {
    resource: mcpResourceUrl(),
    authorization_servers: [`${supabaseUrl}/auth/v1`],
    bearer_methods_supported: ["header"],
    resource_name: "Àríyá",
    resource_documentation: `${appBaseUrl()}/connect-ai`,
  };
}

export function wwwAuthenticateHeader(): string {
  return `Bearer resource_metadata="${resourceMetadataUrl()}"`;
}

/** Served from both `/.well-known/oauth-protected-resource` and its `/mcp` variant. */
export function protectedResourceResponse(): Response {
  return new Response(JSON.stringify(protectedResourceMetadata()), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

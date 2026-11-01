import { protectedResourceResponse } from "@/features/mcp/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** RFC 9728 path-suffixed variant: `/.well-known/oauth-protected-resource/mcp`. */
export function GET(): Response {
  return protectedResourceResponse();
}

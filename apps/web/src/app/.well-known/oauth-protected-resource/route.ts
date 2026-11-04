import { protectedResourceResponse } from "@/features/mcp/metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return protectedResourceResponse();
}

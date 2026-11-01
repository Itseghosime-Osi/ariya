import type { CallToolResult } from "@modelcontextprotocol/sdk/types";

/**
 * Every list tool answers with the same envelope, so a model never has to guess whether it has seen
 * everything: `truncated` is true whenever the caps below returned less than the real total.
 */
export interface Paged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  truncated: boolean;
}

export function paged<T>(
  items: T[],
  page: {
    totalCount: number;
    page: number;
    pageSize: number;
    truncated?: boolean;
  }
): Paged<T> {
  return {
    items,
    totalCount: page.totalCount,
    page: page.page,
    pageSize: page.pageSize,
    truncated: page.truncated ?? items.length < page.totalCount,
  };
}

export function dataResult(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/**
 * Errors never carry a stack trace or a database message: `mapError` has already reduced them to
 * something safe to show a model.
 */
export function errorResult(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/**
 * Runs a tool body and converts anything thrown into a safe tool error, so one bad call cannot take
 * down the request.
 */
export async function runTool(
  body: () => Promise<CallToolResult>
): Promise<CallToolResult> {
  try {
    return await body();
  } catch (error) {
    return errorResult(errorMessage(error));
  }
}

export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return "Something went wrong on Àríyá. Nothing was changed.";
}

export class ToolError extends Error {}

/**
 * Shared by the grants action and the screen that renders it. A `"use server"` module may only
 * export async functions, so the types and the route constant live here instead.
 */

/** The repo's action result: never throws at the boundary, so a form can always render something. */
export type ActionResult<T = void> =
  { ok: true; data: T } | { ok: false; error: string };

export const CONNECT_AI_PATH = "/connect-ai";

/** One OAuth client the host has approved. */
export interface ConnectedApp {
  clientId: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  grantedAt: string;
  scopes: string[];
}

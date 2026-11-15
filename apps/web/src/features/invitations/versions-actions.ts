"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { invitationDesignSchema } from "./schemas";
import type { InvitationDesign } from "./types";
import type { Json } from "@/lib/supabase/database.types";

const MAX_VERSIONS = 30;
/**
 * A connected AI keeps the card as it was before each change, named "Before AI: …". Those
 * backups have their own small allowance, so a busy AI session can never push out the
 * versions the host chose to keep.
 */
export const AI_BACKUP_PREFIX = "Before AI:";
const MAX_AI_BACKUPS = 5;

export type DesignVersion = { id: string; name: string; createdAt: string };
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const UNAVAILABLE = "Saved versions are not available yet.";
const idSchema = z.string().uuid();

type Rows = Record<string, unknown>;
type Builder = PromiseLike<{ data: unknown; error: unknown }> & {
  select: (cols?: string) => Builder;
  insert: (row: Rows) => Builder;
  delete: () => Builder;
  eq: (col: string, value: string) => Builder;
  order: (col: string, opts: { ascending: boolean }) => Builder;
  range: (from: number, to: number) => Builder;
  limit: (n: number) => Builder;
  single: () => Builder;
  maybeSingle: () => Builder;
};
type VersionsClient = { from: (table: string) => Builder };

/** The table is new and not in the generated types, so it is reached through this narrow view. */
async function versions() {
  return (await createClient()) as unknown as VersionsClient;
}

export async function listDesignVersionsAction(
  eventId: string
): Promise<Result<{ versions: DesignVersion[] }>> {
  if (!idSchema.safeParse(eventId).success)
    return { ok: false, error: UNAVAILABLE };
  try {
    const { data, error } = await (
      await versions()
    )
      .from("invitation_versions")
      .select("id, name, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(MAX_VERSIONS + MAX_AI_BACKUPS);
    if (error || !Array.isArray(data)) return { ok: false, error: UNAVAILABLE };
    return {
      ok: true,
      versions: (
        data as { id: string; name: string; created_at: string }[]
      ).map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at })),
    };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

export async function saveDesignVersionAction(
  eventId: string,
  name: string,
  design: unknown
): Promise<Result<{ version: DesignVersion }>> {
  const cleanName = name.trim().slice(0, 60);
  if (!cleanName) return { ok: false, error: "Give this version a name." };
  if (!idSchema.safeParse(eventId).success)
    return { ok: false, error: UNAVAILABLE };
  const parsed = invitationDesignSchema.safeParse(design);
  if (!parsed.success)
    return { ok: false, error: "This design could not be saved as a version." };
  try {
    const db = await versions();
    const { data, error } = await db
      .from("invitation_versions")
      .insert({
        event_id: eventId,
        name: cleanName,
        design: parsed.data as unknown as Json,
      })
      .select("id, name, created_at")
      .single();
    const row = data as { id: string; name: string; created_at: string } | null;
    if (error || !row)
      return { ok: false, error: "The version could not be saved. Try again." };
    // Keep the host's newest MAX_VERSIONS and the AI's newest MAX_AI_BACKUPS, each on its own.
    const { data: all } = await db
      .from("invitation_versions")
      .select("id, name")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .range(0, 299);
    let host = 0;
    let ai = 0;
    for (const old of (all as { id: string; name: string }[] | null) ?? []) {
      const isAi = old.name.startsWith(AI_BACKUP_PREFIX);
      const kept = isAi ? ++ai <= MAX_AI_BACKUPS : ++host <= MAX_VERSIONS;
      if (!kept) await db.from("invitation_versions").delete().eq("id", old.id);
    }
    return {
      ok: true,
      version: { id: row.id, name: row.name, createdAt: row.created_at },
    };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

export async function loadDesignVersionAction(
  eventId: string,
  versionId: string
): Promise<Result<{ design: InvitationDesign }>> {
  if (
    !idSchema.safeParse(eventId).success ||
    !idSchema.safeParse(versionId).success
  )
    return { ok: false, error: UNAVAILABLE };
  try {
    const { data, error } = await (
      await versions()
    )
      .from("invitation_versions")
      .select("design")
      .eq("event_id", eventId)
      .eq("id", versionId)
      .maybeSingle();
    const row = data as { design: unknown } | null;
    if (error || !row)
      return { ok: false, error: "That version was not found." };
    const parsed = invitationDesignSchema.safeParse(row.design);
    if (!parsed.success)
      return { ok: false, error: "That version can no longer be opened." };
    return { ok: true, design: parsed.data };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

export async function deleteDesignVersionAction(
  eventId: string,
  versionId: string
): Promise<{ ok: boolean }> {
  if (
    !idSchema.safeParse(eventId).success ||
    !idSchema.safeParse(versionId).success
  )
    return { ok: false };
  try {
    const { error } = await (
      await versions()
    )
      .from("invitation_versions")
      .delete()
      .eq("event_id", eventId)
      .eq("id", versionId);
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}

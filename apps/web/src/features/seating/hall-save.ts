import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HallLayoutInput } from "./schemas";
import { shareOf, type HallShare } from "./hall/share";

export type { HallShare };

/**
 * Write a hall document without silently overwriting someone else's newer one.
 *
 * Every saved hall carries `rev`, a counter kept inside the JSON (no migration). A studio sends the
 * revision it last loaded; if the stored one has moved on, the write is refused as a conflict and
 * the newer document is handed back so the host can choose. Callers that apply a reviewed change
 * (approvals, restore) pass no base and always win, but still bump `rev`, so an open studio then
 * learns that the hall changed under it.
 *
 * The update itself is conditional on the revision it read, so two saves racing between the read
 * and the write cannot both succeed.
 */
export type HallWriteResult =
  | { ok: true; rev: number }
  | { ok: false; conflict: true; rev: number; layout: unknown }
  | {
      ok: false;
      conflict?: false;
      missing?: boolean;
      error: { code?: string; message?: string };
    };

export function revOf(doc: unknown): number {
  if (!doc || typeof doc !== "object") return 0;
  const r = (doc as { rev?: unknown }).rev;
  return typeof r === "number" && Number.isFinite(r) && r >= 0
    ? Math.floor(r)
    : 0;
}

function isMissingColumn(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /hall_layout/.test(error.message ?? "")
  );
}

export async function writeHallLayout(
  supabase: SupabaseClient,
  eventId: string,
  layout: HallLayoutInput,
  baseRev?: number,
  /**
   * Set or clear the view-only link. Left out, the link already stored is kept: the studio and
   * applied proposals save the hall without knowing about it, and must not drop it.
   */
  share?: HallShare | null
): Promise<HallWriteResult> {
  const read = await supabase
    .from("events")
    .select("hall_layout")
    .eq("id", eventId)
    .maybeSingle();
  if (read.error) {
    return {
      ok: false,
      missing: isMissingColumn(read.error),
      error: read.error,
    };
  }
  const stored =
    (read.data as { hall_layout?: unknown } | null)?.hall_layout ?? null;
  const current = revOf(stored);
  if (baseRev !== undefined && stored !== null && current !== baseRev) {
    return { ok: false, conflict: true, rev: current, layout: stored };
  }

  const next = current + 1;
  const keepShare = share === undefined ? shareOf(stored) : share;
  let write = supabase
    .from("events")
    .update({
      hall_layout: {
        ...layout,
        rev: next,
        ...(keepShare ? { share: keepShare } : {}),
      },
    })
    .eq("id", eventId);
  write =
    stored === null
      ? write.is("hall_layout", null)
      : current === 0
        ? write.is("hall_layout->rev", null)
        : write.eq("hall_layout->>rev", String(current));
  const { data, error } = await write.select("id");
  if (error) return { ok: false, missing: isMissingColumn(error), error };
  if (!data || data.length === 0) {
    // Someone saved between the read and the write. Report what is there now.
    const again = await supabase
      .from("events")
      .select("hall_layout")
      .eq("id", eventId)
      .maybeSingle();
    const now =
      (again.data as { hall_layout?: unknown } | null)?.hall_layout ?? null;
    return { ok: false, conflict: true, rev: revOf(now), layout: now };
  }
  return { ok: true, rev: next };
}

/**
 * Set or clear the view-only link on the stored hall without touching the room itself. The hall
 * was validated when it was saved, so only the `share` key and the revision change, and the write
 * is still conditional on the revision the studio last saw.
 */
export async function writeHallShare(
  supabase: SupabaseClient,
  eventId: string,
  baseRev: number,
  share: HallShare | null
): Promise<
  | { ok: true; rev: number }
  | { ok: false; reason: "no-hall" | "conflict" | "error" }
> {
  const read = await supabase
    .from("events")
    .select("hall_layout")
    .eq("id", eventId)
    .maybeSingle();
  if (read.error) return { ok: false, reason: "error" };
  const stored = (read.data as { hall_layout?: unknown } | null)?.hall_layout;
  if (!stored || typeof stored !== "object" || Array.isArray(stored))
    return { ok: false, reason: "no-hall" };
  const current = revOf(stored);
  if (current !== baseRev) return { ok: false, reason: "conflict" };

  const { share: _old, ...rest } = stored as Record<string, unknown>;
  void _old;
  const next = current + 1;
  let write = supabase
    .from("events")
    .update({
      hall_layout: { ...rest, rev: next, ...(share ? { share } : {}) },
    })
    .eq("id", eventId);
  write =
    current === 0
      ? write.is("hall_layout->rev", null)
      : write.eq("hall_layout->>rev", String(current));
  const { data, error } = await write.select("id");
  if (error) return { ok: false, reason: "error" };
  if (!data || data.length === 0) return { ok: false, reason: "conflict" };
  return { ok: true, rev: next };
}

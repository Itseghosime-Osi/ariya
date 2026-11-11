"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import { randomBytes } from "node:crypto";
import { writeHallLayout, writeHallShare, type HallShare } from "./hall-save";
import {
  createTableSchema,
  updateTableSchema,
  assignSeatInputSchema,
  hallLayoutSchema,
  tablePositionsSchema,
  bulkTablesSchema,
  bulkAssignSchema,
  type CreateTableInput,
  type UpdateTableInput,
} from "./schemas";

export interface ActionResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

const NOT_A_MEMBER = "This celebration could not be found.";

/**
 * RLS already refuses a write from someone outside the event, but it refuses silently — an update
 * that matches no row comes back as success. Check membership first so a caller learns why.
 */
async function memberClient(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_event_member", {
    p_event_id: eventId,
  });
  if (error || !data) return null;
  return supabase;
}

export async function createTableAction(
  eventId: string,
  input: CreateTableInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  const { data, error } = await supabase
    .from("tables")
    .insert({
      event_id: eventId,
      name: parsed.data.name,
      capacity: parsed.data.capacity,
      shape: parsed.data.shape,
      position_x: parsed.data.position_x,
      position_y: parsed.data.position_y,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: mapError(error, "Failed to create table"),
    };
  }

  revalidatePath(`/events/${eventId}/seating`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true, data: { id: data.id } };
}

export async function updateTableAction(
  eventId: string,
  tableId: string,
  input: UpdateTableInput
): Promise<ActionResult> {
  const parsed = updateTableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  const { error } = await supabase
    .from("tables")
    .update({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.capacity !== undefined && {
        capacity: parsed.data.capacity,
      }),
      ...(parsed.data.shape !== undefined && { shape: parsed.data.shape }),
      ...(parsed.data.position_x !== undefined && {
        position_x: parsed.data.position_x,
      }),
      ...(parsed.data.position_y !== undefined && {
        position_y: parsed.data.position_y,
      }),
    })
    .eq("id", tableId)
    .eq("event_id", eventId);

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Failed to update table details"),
    };
  }

  revalidatePath(`/events/${eventId}/seating`);
  return { ok: true };
}

export async function deleteTableAction(
  eventId: string,
  tableId: string
): Promise<ActionResult> {
  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  const { error } = await supabase
    .from("tables")
    .delete()
    .eq("id", tableId)
    .eq("event_id", eventId);

  if (error) {
    return { ok: false, error: mapError(error, "Failed to remove table") };
  }

  revalidatePath(`/events/${eventId}/seating`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function assignSeatAction(
  eventId: string,
  guestId: string,
  tableId: string | null
): Promise<ActionResult<{ seated: boolean; tableId: string | null }>> {
  const parsed = assignSeatInputSchema.safeParse({ guestId, tableId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  const { data, error } = await supabase.rpc("assign_seat", {
    p_guest_id: guestId,
    p_table_id: tableId || undefined,
  });

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Could not assign seating for this guest."),
    };
  }

  const res = data as {
    ok?: boolean;
    seated?: boolean;
    table_id?: string | null;
  };

  revalidatePath(`/events/${eventId}/seating`);
  revalidatePath(`/events/${eventId}`);
  return {
    ok: true,
    data: {
      seated: Boolean(res.seated),
      tableId: res.table_id || null,
    },
  };
}

/**
 * Save the hall studio's room document. When the database has not been migrated yet the column is
 * missing; the studio then keeps the layout on this device and says so (`fallback`).
 */
export async function saveHallLayoutAction(
  eventId: string,
  layout: unknown,
  /**
   * The revision the studio last loaded. When given, a newer stored hall is not overwritten: the
   * result says `conflict` and hands back what is stored. Omit it to apply a reviewed change.
   */
  baseRev?: number
): Promise<
  ActionResult<{
    fallback?: boolean;
    rev?: number;
    conflict?: boolean;
    layout?: unknown;
  }>
> {
  const parsed = hallLayoutSchema.safeParse(layout);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  const res = await writeHallLayout(supabase, eventId, parsed.data, baseRev);
  if (!res.ok) {
    if (res.conflict) {
      return {
        ok: false,
        data: { conflict: true, rev: res.rev, layout: res.layout },
        error: "Someone else changed this hall since you opened it.",
      };
    }
    return {
      ok: false,
      data: res.missing ? { fallback: true } : undefined,
      error: res.missing
        ? "Hall layout saved on this device for now."
        : mapError(res.error, "Could not save the hall layout."),
    };
  }
  // The checklist builds its tasks from the room, so it must not keep a render made before this
  // save; the studio's own page caches the panel it was opened with.
  revalidatePath(`/events/${eventId}/checklist`);
  revalidatePath(`/events/${eventId}/seating`);
  return { ok: true, data: { rev: res.rev } };
}

/** Save where tables stand in the hall (centimetres). No revalidation: only the studio reads these live. */
export async function saveTablePositionsAction(
  eventId: string,
  items: { id: string; x: number; y: number }[]
): Promise<ActionResult> {
  const parsed = tablePositionsSchema.safeParse(items);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  for (let i = 0; i < parsed.data.length; i += 20) {
    const batch = parsed.data.slice(i, i + 20);
    const results = await Promise.all(
      batch.map((t) =>
        supabase
          .from("tables")
          .update({ position_x: t.x, position_y: t.y })
          .eq("id", t.id)
          .eq("event_id", eventId)
      )
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      return {
        ok: false,
        error: mapError(failed.error, "Could not save table positions."),
      };
    }
  }
  return { ok: true };
}

/** Create many tables at once (used by "Fill the hall"). */
export async function createTablesBulkAction(
  eventId: string,
  items: CreateTableInput[]
): Promise<ActionResult<{ id: string; name: string }[]>> {
  const parsed = bulkTablesSchema.safeParse(items);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  const { data, error } = await supabase
    .from("tables")
    .insert(parsed.data.map((t) => ({ ...t, event_id: eventId })))
    .select("id, name");
  if (error || !data) {
    return { ok: false, error: mapError(error, "Could not add the tables.") };
  }
  revalidatePath(`/events/${eventId}/seating`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true, data };
}

/**
 * Seat many guests in one go (used by "Seat everyone"). Each seat still goes through the
 * assign_seat function, so capacity and permissions are checked exactly as for a single drag.
 */
export async function bulkAssignSeatsAction(
  eventId: string,
  pairs: { guestId: string; tableId: string | null }[]
): Promise<ActionResult<{ seated: number; failed: string[] }>> {
  const parsed = bulkAssignSchema.safeParse(pairs);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  let seated = 0;
  const failed: string[] = [];
  // Eight at a time: one round trip per guest made "Seat 144 guests" take about seven seconds.
  // Each call still checks the guest and table on its own, so order between them does not matter.
  const BATCH = 8;
  for (let i = 0; i < parsed.data.length; i += BATCH) {
    const chunk = parsed.data.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map((p) =>
        supabase.rpc("assign_seat", {
          p_guest_id: p.guestId,
          p_table_id: p.tableId || undefined,
        })
      )
    );
    results.forEach(({ error }, j) => {
      if (error) failed.push(chunk[j].guestId);
      else seated++;
    });
  }
  revalidatePath(`/events/${eventId}/seating`);
  revalidatePath(`/events/${eventId}`);
  return { ok: failed.length === 0 || seated > 0, data: { seated, failed } };
}

/**
 * Create, or replace, the view-only link to this hall's floor plan. The link shows the room to
 * scale with its tables and seat counts, and no guest names, so a host can send it to a venue
 * manager or caterer. Members only; the revision check still applies, so a link is never made on
 * top of a hall someone else has just changed.
 */
export async function createHallShareAction(
  eventId: string,
  baseRev: number,
  /** The hall as the studio shows it, saved with the link when nothing is stored yet. */
  layout?: unknown
): Promise<ActionResult<{ token: string; rev: number }>> {
  return setHallShare(
    eventId,
    baseRev,
    {
      token: randomBytes(24).toString("base64url"),
      createdAt: Date.now(),
    },
    layout
  );
}

/** Stop sharing: the old link stops working at once. */
export async function revokeHallShareAction(
  eventId: string,
  baseRev: number
): Promise<ActionResult<{ token: string; rev: number }>> {
  return setHallShare(eventId, baseRev, null);
}

async function setHallShare(
  eventId: string,
  baseRev: number,
  share: HallShare | null,
  layout?: unknown
): Promise<ActionResult<{ token: string; rev: number }>> {
  const supabase = await memberClient(eventId);
  if (!supabase) return { ok: false, error: NOT_A_MEMBER };
  let res = await writeHallShare(supabase, eventId, baseRev, share);
  // A hall the studio shows but has not saved yet (a new celebration shared straight away): save
  // it with the link, through the same checks as any studio save.
  if (!res.ok && res.reason === "no-hall" && share && layout !== undefined) {
    const parsed = hallLayoutSchema.safeParse(layout);
    if (parsed.success) {
      const saved = await writeHallLayout(
        supabase,
        eventId,
        parsed.data,
        baseRev,
        share
      );
      res = saved.ok
        ? { ok: true, rev: saved.rev }
        : { ok: false, reason: saved.conflict ? "conflict" : "error" };
    }
  }
  if (!res.ok) {
    return {
      ok: false,
      error:
        res.reason === "no-hall"
          ? "Lay out the hall first, then share its floor plan."
          : res.reason === "conflict"
            ? "Someone else changed this hall since you opened it. Reload, then try again."
            : "Could not change the share link.",
    };
  }
  revalidatePath(`/events/${eventId}/seating`);
  return { ok: true, data: { token: share?.token ?? "", rev: res.rev } };
}

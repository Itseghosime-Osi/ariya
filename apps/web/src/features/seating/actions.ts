"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
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

export async function createTableAction(
  eventId: string,
  input: CreateTableInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createTableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
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

  const supabase = await createClient();
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
  const supabase = await createClient();
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

  const supabase = await createClient();
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
  layout: unknown
): Promise<ActionResult<{ fallback?: boolean }>> {
  const parsed = hallLayoutSchema.safeParse(layout);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ hall_layout: parsed.data })
    .eq("id", eventId);
  if (error) {
    const missing =
      error.code === "42703" ||
      error.code === "PGRST204" ||
      /hall_layout/.test(error.message ?? "");
    return {
      ok: false,
      data: missing ? { fallback: true } : undefined,
      error: missing
        ? "Hall layout saved on this device for now."
        : mapError(error, "Could not save the hall layout."),
    };
  }
  return { ok: true };
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
  const supabase = await createClient();
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
  const supabase = await createClient();
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
  const supabase = await createClient();
  let seated = 0;
  const failed: string[] = [];
  for (const p of parsed.data) {
    const { error } = await supabase.rpc("assign_seat", {
      p_guest_id: p.guestId,
      p_table_id: p.tableId || undefined,
    });
    if (error) failed.push(p.guestId);
    else seated++;
  }
  revalidatePath(`/events/${eventId}/seating`);
  revalidatePath(`/events/${eventId}`);
  return { ok: failed.length === 0 || seated > 0, data: { seated, failed } };
}

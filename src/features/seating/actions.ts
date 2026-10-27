"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import {
  createTableSchema,
  updateTableSchema,
  assignSeatInputSchema,
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
      error: mapError(error, "Failed to create banquet table"),
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

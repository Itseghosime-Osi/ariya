"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import type { Json } from "@/lib/supabase/database.types";
import { MAX_IMPORT_ROWS } from "./csv-parser";
import { guestRowSchema, type ValidatedGuestRow } from "./schemas";
import type { Guest } from "./types";

export type ActionResult<T = void> =
  { ok: true; data?: T } | { ok: false; error: string };

export async function createGuestAction(
  eventId: string,
  rawInput: Record<string, unknown>
): Promise<ActionResult<Guest>> {
  const parsed = guestRowSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0]?.message ?? "Invalid guest data";
    return { ok: false, error: firstErr };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .insert({
      event_id: eventId,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone,
      email: parsed.data.email,
      side: parsed.data.side,
      group_name: parsed.data.group_name,
      party_size: parsed.data.party_size,
      plus_ones_allowed: parsed.data.plus_ones_allowed,
      is_vip: parsed.data.is_vip,
      notes: parsed.data.notes,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: mapError(error, "Failed to create guest") };
  }

  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true, data };
}

export async function updateGuestAction(
  guestId: string,
  eventId: string,
  rawInput: Record<string, unknown>
): Promise<ActionResult<Guest>> {
  const parsed = guestRowSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0]?.message ?? "Invalid guest data";
    return { ok: false, error: firstErr };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .update({
      name: parsed.data.name.trim(),
      phone: parsed.data.phone,
      email: parsed.data.email,
      side: parsed.data.side,
      group_name: parsed.data.group_name,
      party_size: parsed.data.party_size,
      plus_ones_allowed: parsed.data.plus_ones_allowed,
      is_vip: parsed.data.is_vip,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestId)
    .eq("event_id", eventId)
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: mapError(error, "Failed to update guest") };
  }

  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true, data };
}

export async function deleteGuestAction(
  guestId: string,
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("id", guestId)
    .eq("event_id", eventId);

  if (error) {
    return { ok: false, error: mapError(error, "Failed to remove guest") };
  }

  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function regenerateTokenAction(
  guestId: string,
  eventId: string
): Promise<ActionResult<{ newToken: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("regenerate_guest_token", {
    p_guest_id: guestId,
  });

  if (error || !data) {
    return {
      ok: false,
      error: mapError(error, "Failed to regenerate invitation link"),
    };
  }

  revalidatePath(`/events/${eventId}/guests`);
  return { ok: true, data: { newToken: data } };
}

export async function importGuestsAction(
  eventId: string,
  rawRows: unknown[]
): Promise<ActionResult<{ count: number }>> {
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { ok: false, error: "No guest rows provided for import" };
  }

  if (rawRows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Import exceeds maximum limit of ${MAX_IMPORT_ROWS} guests`,
    };
  }

  const validPayload: ValidatedGuestRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const validated = guestRowSchema.safeParse(rawRows[i]);
    if (!validated.success) {
      const err = validated.error.issues[0]?.message ?? "Invalid row";
      return { ok: false, error: `Row ${i + 1}: ${err}` };
    }
    validPayload.push({
      ...validated.data,
      name: validated.data.name.trim(),
      side: validated.data.side,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_guests", {
    p_event_id: eventId,
    p_guests: JSON.parse(JSON.stringify(validPayload)) as Json,
  });

  if (error || !data) {
    return { ok: false, error: mapError(error, "Failed to import guests") };
  }

  const resultObj = data as { ok: boolean; imported_count: number };
  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true, data: { count: resultObj.imported_count } };
}

export async function findImportDuplicatesAction(
  eventId: string,
  rows: { name: string; phone?: string | null; email?: string | null }[]
): Promise<
  ActionResult<
    {
      rowIndex: number;
      matchType: "phone" | "email" | "name";
      duplicateWith: string;
    }[]
  >
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("find_import_duplicates", {
    p_event_id: eventId,
    p_rows: rows,
  });

  if (error || !data) {
    return {
      ok: false,
      error: mapError(error, "Failed to check duplicates at scale"),
    };
  }

  const results = (
    data as { row_index: number; match_type: string; duplicate_with: string }[]
  ).map((d) => ({
    rowIndex: d.row_index,
    matchType: d.match_type as "phone" | "email" | "name",
    duplicateWith: d.duplicate_with,
  }));

  return { ok: true, data: results };
}

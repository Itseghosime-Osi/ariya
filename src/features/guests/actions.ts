"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateToken } from "@/lib/tokens";
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
    const firstErr = parsed.error.errors[0]?.message ?? "Invalid guest data";
    return { ok: false, error: firstErr };
  }

  const token = generateToken(22);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .insert({
      event_id: eventId,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      side: parsed.data.side,
      group_name: parsed.data.group_name,
      party_size: parsed.data.party_size,
      plus_ones_allowed: parsed.data.plus_ones_allowed,
      is_vip: parsed.data.is_vip,
      notes: parsed.data.notes,
      rsvp_token: token,
    })
    .select()
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create guest" };
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
    const firstErr = parsed.error.errors[0]?.message ?? "Invalid guest data";
    return { ok: false, error: firstErr };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .update({
      name: parsed.data.name,
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
    return { ok: false, error: error?.message ?? "Failed to update guest" };
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
    return { ok: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function regenerateTokenAction(
  guestId: string,
  eventId: string
): Promise<ActionResult<{ newToken: string }>> {
  const newToken = generateToken(22);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("regenerate_guest_token", {
    p_guest_id: guestId,
    p_new_token: newToken,
  });

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Failed to regenerate invitation link",
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

  const validPayload: (ValidatedGuestRow & { rsvp_token: string })[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const validated = guestRowSchema.safeParse(rawRows[i]);
    if (!validated.success) {
      const err = validated.error.errors[0]?.message ?? "Invalid row";
      return { ok: false, error: `Row ${i + 1}: ${err}` };
    }
    const token = generateToken(22);
    validPayload.push({
      ...validated.data,
      rsvp_token: token,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_guests", {
    p_event_id: eventId,
    p_guests: JSON.parse(JSON.stringify(validPayload)) as Json,
  });

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to import guests" };
  }

  const resultObj = data as { ok: boolean; imported_count: number };
  revalidatePath(`/events/${eventId}/guests`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true, data: { count: resultObj.imported_count } };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseWatDateToUtc } from "@/lib/format";
import { mapError } from "@/lib/errors";
import { eventEndedError } from "./expiry";

export interface ActionResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface UpdateSettingsInput {
  title: string;
  couple: string;
  slug: string;
  venue: string;
  area?: string;
  date: string;
  dressCode?: string;
  isPublic: boolean;
}

export async function updateEventSettingsAction(
  eventId: string,
  input: UpdateSettingsInput
): Promise<ActionResult> {
  const supabase = await createClient();
  const ended = await eventEndedError(supabase, eventId);
  if (ended) return { ok: false, error: ended };
  const cleanSlug = input.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  if (!cleanSlug || cleanSlug.length < 3) {
    return {
      ok: false,
      error: "Celebration URL slug must be at least 3 characters",
    };
  }

  const { data, error } = await supabase
    .from("events")
    .update({
      title: input.title.trim(),
      couple: input.couple.trim(),
      slug: cleanSlug,
      venue: input.venue.trim(),
      area: input.area?.trim() || null,
      date: parseWatDateToUtc(input.date),
      dress_code: input.dressCode?.trim() || null,
      is_public: input.isPublic,
    })
    .eq("id", eventId)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "This celebration URL slug is already taken.",
      };
    }
    return {
      ok: false,
      error: mapError(error, "Failed to update celebration settings"),
    };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "Event not found or insufficient permissions" };
  }

  revalidatePath(`/events/${eventId}/settings`);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { ok: true };
}

/** Files a celebration away. It leaves your celebrations and appears only in the archive. */
export async function archiveEventAction(
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ status: "archived" })
    .eq("id", eventId)
    .select("id");

  if (error || !data || data.length === 0) {
    return {
      ok: false,
      error: error
        ? mapError(error, "Failed to archive event")
        : "Unauthorized",
    };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/profile");
  revalidatePath("/profile/archive");
  return { ok: true };
}

/** Brings an archived celebration back to your celebrations. */
export async function restoreEventAction(
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ status: "active" })
    .eq("id", eventId)
    .eq("status", "archived")
    .select("id");

  if (error || !data || data.length === 0) {
    return {
      ok: false,
      error: error
        ? mapError(error, "Failed to restore the celebration")
        : "Unauthorized",
    };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  revalidatePath("/profile");
  revalidatePath("/profile/archive");
  return { ok: true };
}

/**
 * Deletes a celebration for good, with everything in it. The caller must type the celebration's name
 * exactly; it is checked here too, so a doctored request cannot skip the confirmation. Only owners can
 * delete (the database refuses anyone else).
 */
export async function deleteEventAction(
  eventId: string,
  confirmName: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return { ok: false, error: "Celebration not found." };
  }
  if (confirmName.trim() !== event.title.trim()) {
    return {
      ok: false,
      error: "The name you typed does not match this celebration.",
    };
  }

  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: mapError(
        error,
        "Failed to delete event. Only owners can delete events."
      ),
    };
  }
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "Only the owner of a celebration can delete it.",
    };
  }

  revalidatePath("/events");
  revalidatePath("/profile");
  revalidatePath("/profile/archive");
  return { ok: true };
}

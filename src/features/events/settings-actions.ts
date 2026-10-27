"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";

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
      date: new Date(input.date).toISOString(),
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
  return { ok: true };
}

export async function deleteEventAction(
  eventId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);

  if (error) {
    return {
      ok: false,
      error: mapError(
        error,
        "Failed to delete event. Only owners can delete events."
      ),
    };
  }

  revalidatePath("/events");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateToken } from "@/lib/tokens";
import { mapError } from "@/lib/errors";
import { parseWatDateToUtc } from "@/lib/format";
import {
  createEventSchema,
  updateEventSchema,
  type CreateEventInput,
  type UpdateEventInput,
} from "./schemas";
import type { EventUpdate } from "./types";

export type ActionResult<T = void> =
  { ok: true; data?: T } | { ok: false; error: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

export async function createEventAction(
  input: CreateEventInput
): Promise<ActionResult<{ eventId: string; slug: string }>> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Invalid celebration input";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required to create event" };
  }

  const baseSlug = slugify(parsed.data.title);
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const slug =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    const registryCode = generateToken(22);

    const { data, error } = await supabase.rpc("create_event", {
      p_title: parsed.data.title,
      p_couple: parsed.data.couple,
      p_date: parseWatDateToUtc(parsed.data.date),
      p_venue: parsed.data.venue,
      p_area: parsed.data.area,
      p_dress_code:
        parsed.data.dressCode || "Aṣọ-Ẹbí: Burgundy velvet and champagne gold",
      p_slug: slug,
      p_registry_code: registryCode,
      p_rsvp_by: parsed.data.rsvpBy
        ? parseWatDateToUtc(parsed.data.rsvpBy)
        : undefined,
    });

    if (!error && data) {
      const res = data as { id?: string; slug?: string };
      if (res.id && res.slug) {
        revalidatePath("/events");
        return { ok: true, data: { eventId: res.id, slug: res.slug } };
      }
    }

    if (error) {
      if (error.code === "23505") {
        continue;
      }
      console.error(
        `[createEventAction] Failed to create event: code=${error.code} message=${error.message}`
      );
      return {
        ok: false,
        error: mapError(error, "Failed to create celebration"),
      };
    }
  }

  return {
    ok: false,
    error:
      "Could not generate a unique celebration URL. Please adjust the title and try again.",
  };
}

export async function updateEventAction(
  eventId: string,
  input: UpdateEventInput
): Promise<ActionResult> {
  const parsed = updateEventSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Invalid update input";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required to modify event" };
  }

  const updateData: EventUpdate = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.couple !== undefined) updateData.couple = parsed.data.couple;
  if (parsed.data.date !== undefined)
    updateData.date = parseWatDateToUtc(parsed.data.date);
  if (parsed.data.venue !== undefined) updateData.venue = parsed.data.venue;
  if (parsed.data.area !== undefined) updateData.area = parsed.data.area;
  if (parsed.data.dressCode !== undefined)
    updateData.dress_code = parsed.data.dressCode;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.isPublic !== undefined)
    updateData.is_public = parsed.data.isPublic;
  if (parsed.data.description !== undefined)
    updateData.description = parsed.data.description;
  if (parsed.data.coverImageUrl !== undefined)
    updateData.cover_image_url = parsed.data.coverImageUrl;
  if (parsed.data.schedule !== undefined)
    updateData.schedule = parsed.data.schedule;
  if (parsed.data.rsvpBy !== undefined)
    updateData.rsvp_by = parsed.data.rsvpBy
      ? parseWatDateToUtc(parsed.data.rsvpBy)
      : null;

  const { data, error } = await supabase
    .from("events")
    .update(updateData)
    .eq("id", eventId)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Unable to save celebration updates"),
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        "Celebration not found or you do not have permission to modify it.",
    };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { ok: true };
}

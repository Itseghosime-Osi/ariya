"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateToken } from "@/lib/tokens";
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

function mapDatabaseError(
  errorMessage: string,
  defaultMessage: string
): string {
  if (
    errorMessage.includes("permission denied") ||
    errorMessage.includes("violates row-level security") ||
    errorMessage.includes("P0001")
  ) {
    return "You do not have permission to perform this action.";
  }
  if (
    errorMessage.includes("unique constraint") ||
    errorMessage.includes("23505")
  ) {
    return "A celebration with these details already exists.";
  }
  if (errorMessage.includes("foreign key") || errorMessage.includes("23503")) {
    return "The referenced item could not be found.";
  }
  if (errorMessage.includes("invalid input syntax")) {
    return "Invalid input format provided.";
  }
  return defaultMessage;
}

export async function createEventAction(
  input: CreateEventInput
): Promise<ActionResult<{ eventId: string; slug: string }>> {
  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    const firstError =
      parsed.error.errors[0]?.message ?? "Invalid celebration input";
    return { ok: false, error: firstError };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Authentication required to create an event" };
  }

  const baseSlug =
    slugify(parsed.data.couple || parsed.data.title) || "celebration";

  // Slug collision retry: retry up to 3 times on unique constraint collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const fullToken = generateToken();
    const token = fullToken.slice(0, 8).toLowerCase();
    const slug = `${baseSlug}-${token}`;
    const registryCode =
      parsed.data.registryCode ||
      `LOS-${new Date().getFullYear()}-${token.toUpperCase()}`;

    const { data, error } = await supabase.rpc("create_event", {
      p_title: parsed.data.title,
      p_couple: parsed.data.couple,
      p_date: new Date(parsed.data.date).toISOString(),
      p_venue: parsed.data.venue,
      p_area: parsed.data.area || "Victoria Island, Lagos",
      p_dress_code:
        parsed.data.dressCode || "Aṣọ-Ẹbí: Burgundy velvet and champagne gold",
      p_slug: slug,
      p_registry_code: registryCode,
      p_rsvp_by: parsed.data.rsvpBy
        ? new Date(parsed.data.rsvpBy).toISOString()
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
      if (
        error.code === "23505" ||
        error.message.includes("unique") ||
        error.message.includes("duplicate key")
      ) {
        continue;
      }
      return {
        ok: false,
        error: mapDatabaseError(error.message, "Failed to create celebration"),
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
      parsed.error.errors[0]?.message ?? "Invalid update input";
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
    updateData.date = new Date(parsed.data.date).toISOString();
  if (parsed.data.venue !== undefined) updateData.venue = parsed.data.venue;
  if (parsed.data.area !== undefined) updateData.area = parsed.data.area;
  if (parsed.data.dressCode !== undefined)
    updateData.dress_code = parsed.data.dressCode;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.rsvpBy !== undefined)
    updateData.rsvp_by = parsed.data.rsvpBy
      ? new Date(parsed.data.rsvpBy).toISOString()
      : null;

  const { data, error } = await supabase
    .from("events")
    .update(updateData)
    .eq("id", eventId)
    .select("id");

  if (error) {
    return {
      ok: false,
      error: mapDatabaseError(
        error.message,
        "Unable to save celebration updates"
      ),
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

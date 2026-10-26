"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createEventSchema,
  updateEventSchema,
  type CreateEventInput,
  type UpdateEventInput,
} from "./schemas";
import type { EventInsert, EventUpdate } from "./types";

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

  const baseSlug = slugify(parsed.data.couple || parsed.data.title);
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const uniqueSlug = `${baseSlug}-${randomSuffix}`;
  const registryCode =
    parsed.data.registryCode ||
    `LOS-${new Date().getFullYear()}-${randomSuffix.toUpperCase()}`;

  const insertPayload: EventInsert = {
    title: parsed.data.title,
    couple: parsed.data.couple,
    date: new Date(parsed.data.date).toISOString(),
    venue: parsed.data.venue,
    area: parsed.data.area || "Victoria Island, Lagos",
    dress_code:
      parsed.data.dressCode || "Aṣọ-Ẹbí: Burgundy velvet and champagne gold",
    slug: uniqueSlug,
    status: "active",
    registry_code: registryCode,
    rsvp_by: parsed.data.rsvpBy
      ? new Date(parsed.data.rsvpBy).toISOString()
      : null,
  };

  const { data: newEvent, error: insertError } = await supabase
    .from("events")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError || !newEvent) {
    return {
      ok: false,
      error: insertError?.message ?? "Failed to create celebration",
    };
  }

  // Ensure user is registered as owner in event_members
  await supabase.from("event_members").upsert(
    {
      event_id: newEvent.id,
      user_id: user.id,
      role: "owner",
    },
    { onConflict: "event_id,user_id" }
  );

  revalidatePath("/events");
  return { ok: true, data: { eventId: newEvent.id, slug: newEvent.slug } };
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
  if (parsed.data.title) updateData.title = parsed.data.title;
  if (parsed.data.couple) updateData.couple = parsed.data.couple;
  if (parsed.data.date)
    updateData.date = new Date(parsed.data.date).toISOString();
  if (parsed.data.venue) updateData.venue = parsed.data.venue;
  if (parsed.data.area) updateData.area = parsed.data.area;
  if (parsed.data.dressCode) updateData.dress_code = parsed.data.dressCode;
  if (parsed.data.status) updateData.status = parsed.data.status;
  if (parsed.data.rsvpBy)
    updateData.rsvp_by = new Date(parsed.data.rsvpBy).toISOString();

  const { error } = await supabase
    .from("events")
    .update(updateData)
    .eq("id", eventId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  return { ok: true };
}

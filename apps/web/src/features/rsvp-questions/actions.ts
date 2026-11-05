"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import { eventEndedError } from "@/features/events/expiry";
import type { Json } from "@/lib/supabase/database.types";
import { questionsSchema } from "./model";

type Result = { ok: true } | { ok: false; error: string };

/** Saves the questions guests answer when they confirm, and whether each accepted guest gets an access card. */
export async function saveRsvpSettingsAction(
  eventId: string,
  settings: { questions: unknown; requireAccessCard: boolean }
): Promise<Result> {
  const parsed = questionsSchema.safeParse(settings.questions);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Those questions are not valid",
    };
  }

  const supabase = await createClient();
  const ended = await eventEndedError(supabase, eventId);
  if (ended) return { ok: false, error: ended };

  const { data, error } = await supabase
    .from("events")
    .update({
      rsvp_questions: parsed.data as unknown as NonNullable<Json>,
      require_access_card: Boolean(settings.requireAccessCard),
    })
    .eq("id", eventId)
    .select("slug");

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Could not save the questions"),
    };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Celebration not found or not yours to edit" };
  }

  revalidatePath(`/events/${eventId}/page-editor`);
  revalidatePath(`/events/${eventId}/guests`);
  return { ok: true };
}

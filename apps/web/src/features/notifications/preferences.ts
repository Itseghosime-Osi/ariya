"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
} from "./preference-types";

/**
 * The weekly-digest setting and quiet hours (6.4.2).
 *
 * "Weekly by default" is the decision, so a person with no row still gets the digest: the read
 * returns the defaults rather than null, and the write upserts. Turning reminders off is a stored
 * `off`, not a deleted row, so a host keeps their quiet hours when they switch back on.
 *
 * Only async functions may live in this file — it is `"use server"`. The types and defaults are in
 * `preference-types.ts` for that reason.
 */

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const preferencesSchema = z.object({
  digest: z.enum(["weekly", "off"]),
  quietFrom: z.string().regex(timePattern, "Pick a time, like 21:00"),
  quietTo: z.string().regex(timePattern, "Pick a time, like 07:00"),
});

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_PREFERENCES;

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("digest, quiet_from, quiet_to")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[getNotificationPreferences] load failed:", error);
    return DEFAULT_PREFERENCES;
  }
  if (!data) return DEFAULT_PREFERENCES;

  return {
    digest: data.digest === "off" ? "off" : "weekly",
    // `time` columns come back as `HH:MM:SS`; the UI edits hours and minutes.
    quietFrom: data.quiet_from.slice(0, 5),
    quietTo: data.quiet_to.slice(0, 5),
  };
}

export async function saveNotificationPreferences(
  input: NotificationPreferences
): Promise<{
  success?: boolean;
  error?: string;
  preferences?: NotificationPreferences;
}> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "That is not a valid setting.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session has ended. Sign in again." };

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      digest: parsed.data.digest,
      quiet_from: parsed.data.quietFrom,
      quiet_to: parsed.data.quietTo,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[saveNotificationPreferences] save failed:", error);
    return { error: `Could not save that: ${error.message}` };
  }

  return { success: true, preferences: parsed.data };
}

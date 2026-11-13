"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getFirstStepsStatus } from "./queries";
import {
  mergeOnboarding,
  readOnboarding,
  type FirstStepsStatus,
  type Onboarding,
} from "./state";

export type OnboardingResult = { ok: true } | { ok: false; error: string };

const patchSchema = z
  .object({
    welcomed: z.literal(true).optional(),
    tour: z.enum(["done", "skipped"]).optional(),
    firstStepsHidden: z.literal(true).optional(),
    tips: z
      .array(z.string().regex(/^[a-z0-9-]{1,40}$/))
      .max(5)
      .optional(),
  })
  .strict();

/**
 * Record what the host has seen. The flags only ever move forward (seen, done, hidden), so two tabs
 * writing at once can only both agree. Kept on the sign-in's own metadata, not in a table.
 */
export async function updateOnboardingAction(
  patch: Onboarding
): Promise<OnboardingResult> {
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Not a valid change." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const next = mergeOnboarding(readOnboarding(user.user_metadata), parsed.data);
  const { error } = await supabase.auth.updateUser({
    data: { onboarding: next },
  });
  if (error) return { ok: false, error: "Could not save that just now." };
  return { ok: true };
}

/** The welcome card's answer: planning their own celebration, or someone else's. */
export async function setHostRoleAction(
  role: "couple" | "planner"
): Promise<OnboardingResult> {
  if (role !== "couple" && role !== "planner")
    return { ok: false, error: "Not a valid choice." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { error } = await supabase.auth.updateUser({ data: { role } });
  if (error) return { ok: false, error: "Could not save that just now." };
  return { ok: true };
}

/** First steps for one celebration, for the pill on its other pages. */
export async function getFirstStepsAction(
  eventId: string
): Promise<FirstStepsStatus | null> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (error) return null;
  return getFirstStepsStatus(eventId, count ?? 0);
}

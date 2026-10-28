"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkInInputSchema, type CheckInInput } from "./schemas";
import type { CheckInResult } from "./types";

export type CheckInActionResult = {
  ok: boolean;
  result?: CheckInResult;
  error?: string;
};

export async function performCheckInAction(
  eventId: string,
  input: CheckInInput
): Promise<CheckInActionResult> {
  const parsed = checkInInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "Invalid check-in input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      error: "Authentication required to access check-in desk",
    };
  }

  // Call check_in RPC strictly
  const { data, error } = await supabase.rpc("check_in", {
    p_event_id: eventId,
    p_code: parsed.data.code,
    p_count: parsed.data.count,
  });

  if (error || !data) {
    return {
      ok: false,
      error: error?.message || "Failed to process check-in",
    };
  }

  const result = data as unknown as CheckInResult;

  revalidatePath(`/events/${eventId}/check-in`);
  return { ok: true, result };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkInInputSchema, type CheckInInput } from "./schemas";
import type { CheckInMatch, CheckInResult } from "./types";

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

/** Looks a pass up without admitting anyone: the desk shows who it is, then the door staff taps Admit. */
export async function verifyCheckInAction(
  eventId: string,
  code: string
): Promise<CheckInActionResult> {
  const parsed = checkInInputSchema.safeParse({ code, count: 1 });
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

  const { data, error } = await supabase.rpc("verify_check_in", {
    p_event_id: eventId,
    p_code: parsed.data.code,
  });
  if (error || !data) {
    return { ok: false, error: error?.message || "Could not verify that pass" };
  }
  return { ok: true, result: data as unknown as CheckInResult };
}

/** Finds guests who have accepted by part of their name, for a seal that will not scan. */
export async function searchCheckInGuestsAction(
  eventId: string,
  query: string
): Promise<{ ok: boolean; guests: CheckInMatch[]; error?: string }> {
  const text = query.trim().slice(0, 60);
  if (text.length < 2) return { ok: true, guests: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      guests: [],
      error: "Authentication required to access check-in desk",
    };
  }

  const { data, error } = await supabase.rpc("search_check_in_guests", {
    p_event_id: eventId,
    p_query: text,
  });
  if (error) {
    return { ok: false, guests: [], error: "Could not search the guest list" };
  }
  return {
    ok: true,
    guests: Array.isArray(data) ? (data as unknown as CheckInMatch[]) : [],
  };
}

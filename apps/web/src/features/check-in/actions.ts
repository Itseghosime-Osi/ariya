"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkInInputSchema, type CheckInInput } from "./schemas";
import type { CheckInMatch, CheckInResult } from "./types";
import type { CheckInSnapshot, OfflineGuest } from "./offline";

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

/**
 * The guest list the desk keeps on the phone for when the signal drops: every guest with a pass,
 * their reply, party size, table and how many are already in. Only for the people who can admit
 * guests (owner, planner and door staff), the same as check_in itself.
 */
export async function getCheckInSnapshotAction(
  eventId: string
): Promise<{ ok: boolean; snapshot?: CheckInSnapshot; error?: string }> {
  const cleanId = eventId?.trim();
  if (!cleanId || !/^[0-9a-f-]{36}$/i.test(cleanId)) {
    return { ok: false, error: "Not a celebration" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: allowed } = await supabase.rpc("has_event_role", {
    p_event_id: cleanId,
    p_roles: ["owner", "planner", "staff"],
  });
  if (!allowed) {
    return { ok: false, error: "Only the check-in team keeps the list." };
  }

  // A page at a time: the API returns at most a thousand rows per request, and a big wedding has more
  // guests and check-ins than that.
  const PAGE = 1000;
  async function all<T>(
    page: (
      from: number,
      to: number
    ) => PromiseLike<{ data: T[] | null; error: unknown }>
  ): Promise<T[] | null> {
    const out: T[] = [];
    for (let from = 0; from < 50_000; from += PAGE) {
      const { data, error } = await page(from, from + PAGE - 1);
      if (error) return null;
      out.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    return out;
  }

  const [eventRes, guestRows, checkInRows, seatsRes] = await Promise.all([
    supabase.from("events").select("date").eq("id", cleanId).maybeSingle(),
    all((from, to) =>
      supabase
        .from("guests")
        .select("id, name, check_in_code, rsvps (status, attending_count)")
        .eq("event_id", cleanId)
        .not("check_in_code", "is", null)
        .order("id")
        .range(from, to)
    ),
    all((from, to) =>
      supabase
        .from("check_ins")
        .select("guest_id, checked_in_count, checked_in_at")
        .eq("event_id", cleanId)
        .order("id")
        .range(from, to)
    ),
    supabase
      .from("seat_assignments")
      .select("guest_id, tables!inner(name, event_id)")
      .eq("tables.event_id", cleanId)
      .limit(5000),
  ]);
  if (!guestRows || !checkInRows) {
    return { ok: false, error: "Could not copy the guest list." };
  }

  const inByGuest = new Map<
    string,
    { n: number; first: string; last: string }
  >();
  for (const c of checkInRows) {
    const cur = inByGuest.get(c.guest_id);
    const at = c.checked_in_at;
    if (!cur) {
      inByGuest.set(c.guest_id, {
        n: c.checked_in_count || 1,
        first: at,
        last: at,
      });
    } else {
      cur.n += c.checked_in_count || 1;
      if (at < cur.first) cur.first = at;
      if (at > cur.last) cur.last = at;
    }
  }
  const tableByGuest = new Map<string, string>();
  for (const s of (seatsRes.data ?? []) as unknown as Array<{
    guest_id: string;
    tables: { name: string } | null;
  }>) {
    if (s.tables?.name) tableByGuest.set(s.guest_id, s.tables.name);
  }

  const guests: OfflineGuest[] = guestRows.map((g) => {
    const r = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const seen = inByGuest.get(g.id);
    return {
      id: g.id,
      name: g.name,
      code: (g.check_in_code ?? "").trim().toUpperCase(),
      rsvp: r?.status ?? "pending",
      attending: r?.attending_count ?? 0,
      checkedIn: seen?.n ?? 0,
      table: tableByGuest.get(g.id) ?? null,
      firstCheckedInAt: seen?.first ?? null,
      lastCheckedInAt: seen?.last ?? null,
    };
  });

  return {
    ok: true,
    snapshot: {
      eventId: cleanId,
      takenAt: new Date().toISOString(),
      eventDate: eventRes.data?.date ?? null,
      guests,
    },
  };
}

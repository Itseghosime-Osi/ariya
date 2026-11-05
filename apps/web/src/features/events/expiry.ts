import "server-only";
import { createClient } from "@/lib/supabase/server";
import { EVENT_ENDED_MESSAGE, isEventExpired } from "@/lib/event-expiry";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The message to stop with when this celebration's day has passed, otherwise null. Server actions ask
 * this before touching an event so the host gets a plain answer; the database refuses the write too.
 */
export async function eventEndedError(
  supabase: Supabase,
  eventId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("events")
    .select("date")
    .eq("id", eventId)
    .maybeSingle();
  return data && isEventExpired(data.date) ? EVENT_ENDED_MESSAGE : null;
}

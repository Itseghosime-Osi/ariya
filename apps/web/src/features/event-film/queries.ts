import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Is the signed-in visitor on this celebration's team? Events are only readable by their members, so
 * finding the row is the answer. Used to let a host open their own invitation while it is in test mode.
 */
export const isEventTeamMember = cache(
  async (eventId: string): Promise<boolean> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    return Boolean(data);
  }
);

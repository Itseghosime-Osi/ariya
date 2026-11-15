"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { designFromEvent } from "./design";
import { AI_BACKUP_PREFIX } from "./versions-actions";
import type { InvitationDesign } from "./types";

const idSchema = z.string().uuid();

const UNAVAILABLE = "The latest design is not available right now.";

/**
 * What the studio compares against its open copy: the saved design, its revision, and — when the
 * save came from a connected AI — the short human summary from that change's "Before AI: …"
 * backup row. The backup is trusted only when it was written within five minutes of the save, so
 * a stale row from an earlier session can never label a host's own edit as the AI's.
 */
export async function getLatestInvitationStateAction(eventId: string): Promise<
  | {
      ok: true;
      revision: string;
      design: InvitationDesign;
      aiSummary: string | null;
    }
  | { ok: false; error: string }
> {
  if (!idSchema.safeParse(eventId).success)
    return { ok: false, error: UNAVAILABLE };
  try {
    const supabase = await createClient();
    const { data: event, error } = await supabase
      .from("events")
      .select(
        "title, couple, date, venue, area, dress_code, rsvp_by, invitation_theme, invitation_headline, invitation_subheadline, invitation_message, invitation_design, updated_at"
      )
      .eq("id", eventId)
      .maybeSingle();
    if (error || !event || !event.updated_at)
      return { ok: false, error: UNAVAILABLE };

    let aiSummary: string | null = null;
    const savedAt = Date.parse(event.updated_at);
    if (Number.isFinite(savedAt)) {
      const { data: backups } = await supabase
        .from("invitation_versions")
        .select("name, created_at")
        .eq("event_id", eventId)
        .like("name", `${AI_BACKUP_PREFIX}%`)
        .gte("created_at", new Date(savedAt - 5 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      const name = backups?.[0]?.name;
      if (typeof name === "string") {
        const short = name.slice(AI_BACKUP_PREFIX.length).trim();
        if (short) aiSummary = short;
      }
    }

    return {
      ok: true,
      revision: event.updated_at,
      design: designFromEvent({
        title: event.title,
        couple: event.couple,
        date: event.date,
        venue: event.venue,
        area: event.area,
        dressCode: event.dress_code,
        rsvpBy: event.rsvp_by,
        theme: event.invitation_theme,
        headline: event.invitation_headline,
        subheadline: event.invitation_subheadline,
        message: event.invitation_message,
        design: event.invitation_design,
      }),
      aiSummary,
    };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

/**
 * A cheap fingerprint of the tables a page renders, for the polling fallback when realtime is not
 * subscribed: if any stamp moved, the page re-reads itself. Guests carry their RSVPs with them on
 * the guest list, and seat assignments ride with the seating desk's own query, so polling guests
 * and tables covers every place the AI writes today. Nulls mean "could not read" and never match.
 */
export async function getEventTablesFingerprintAction(eventId: string): Promise<
  | {
      ok: true;
      eventsRev: string | null;
      guestsRev: string | null;
      tablesRev: string | null;
    }
  | { ok: false; error: string }
> {
  if (!idSchema.safeParse(eventId).success)
    return { ok: false, error: UNAVAILABLE };
  try {
    const supabase = await createClient();
    const [eventRes, guestsRes, tablesRes] = await Promise.all([
      supabase
        .from("events")
        .select("updated_at")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("guests")
        .select("updated_at")
        .eq("event_id", eventId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("tables")
        .select("updated_at")
        .eq("event_id", eventId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (eventRes.error || !eventRes.data)
      return { ok: false, error: UNAVAILABLE };
    return {
      ok: true,
      eventsRev: (eventRes.data.updated_at as string | null) ?? null,
      guestsRev:
        (guestsRes.data?.updated_at as string | null | undefined) ?? null,
      tablesRev:
        (tablesRes.data?.updated_at as string | null | undefined) ?? null,
    };
  } catch {
    return { ok: false, error: UNAVAILABLE };
  }
}

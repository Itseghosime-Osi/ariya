import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getPartyDisplaySeats } from "@/lib/metrics";
import type {
  InvitationDeskData,
  InvitationGuest,
  InvitationDesign,
} from "./types";

export async function getInvitationDeskData(
  eventId: string
): Promise<InvitationDeskData | null> {
  const cleanId = eventId?.trim();
  if (!cleanId || cleanId === "default") {
    return null;
  }

  const supabase = await createClient();

  // 1. Fetch event
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select(
      "id, title, couple, date, venue, dress_code, paid_at, invitation_theme, invitation_headline, invitation_subheadline, invitation_message"
    )
    .eq("id", cleanId)
    .maybeSingle();

  if (eventErr) {
    console.error("[getInvitationDeskData] Database error loading event:", {
      code: eventErr.code,
      message: eventErr.message,
    });
    throw new Error(`Database error loading event: ${eventErr.message}`);
  }

  if (!event) return null;

  // 2. Fetch guests with RSVPs
  const { data: rawGuests, error: guestErr } = await supabase
    .from("guests")
    .select(
      `
      id,
      name,
      email,
      phone,
      side,
      group_name,
      party_size,
      is_vip,
      rsvp_token,
      invited_at,
      rsvps (status, attending_count)
    `
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (guestErr) {
    console.error("[getInvitationDeskData] Database error loading guests:", {
      code: guestErr.code,
      message: guestErr.message,
    });
    throw new Error(`Database error loading guests: ${guestErr.message}`);
  }

  if (!rawGuests) return null;

  const guests: InvitationGuest[] = rawGuests.map((g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const displaySeats = getPartyDisplaySeats({
      party_size: g.party_size,
      rsvp: rsvp
        ? {
            status: rsvp.status,
            attending_count: rsvp.attending_count,
          }
        : null,
    });
    return {
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      side: g.side,
      groupName: g.group_name,
      partySize: g.party_size,
      displaySeats,
      isVip: g.is_vip,
      rsvpToken: g.rsvp_token,
      invitedAt: g.invited_at,
      rsvpStatus:
        (rsvp?.status as "pending" | "accepted" | "declined") || "pending",
    };
  });

  const invitedGuestsCount = guests.filter((g) => !!g.invitedAt).length;
  const uninvitedGuestsCount = guests.length - invitedGuestsCount;

  const rawEvent = event as Record<string, unknown>;
  const rawTheme = rawEvent.invitation_theme as string | null;
  const themeKey =
    (rawTheme?.replace("-", "_") as InvitationDesign["theme"]) || "royal_gold";

  const design: InvitationDesign = {
    theme: themeKey,
    headline:
      (rawEvent.invitation_headline as string | null) ||
      `The Wedding Celebration of ${event.couple}`,
    subheadline:
      (rawEvent.invitation_subheadline as string | null) ||
      "Joyfully request the honor of your presence",
    attireNote:
      event.dress_code ||
      "Aso-Ebi Colour Code: Champagne Gold & Emerald Velvet",
    customMessage:
      (rawEvent.invitation_message as string | null) ||
      "Dinner and dancing to follow ceremony.",
  };

  return {
    eventId: event.id,
    eventTitle: event.title,
    coupleName: event.couple,
    eventDate: event.date,
    venueName: event.venue,
    isPaid: !!event.paid_at,
    totalGuests: guests.length,
    invitedGuestsCount,
    uninvitedGuestsCount,
    guests,
    design,
  };
}

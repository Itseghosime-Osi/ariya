import "server-only";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, title, couple, date, venue, dress_code, paid_at")
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
      rsvps (status)
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
    return {
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      side: g.side,
      groupName: g.group_name,
      partySize: g.party_size,
      isVip: g.is_vip,
      rsvpToken: g.rsvp_token,
      invitedAt: g.invited_at,
      rsvpStatus:
        (rsvp?.status as "pending" | "accepted" | "declined") || "pending",
    };
  });

  const invitedGuestsCount = guests.filter((g) => !!g.invitedAt).length;
  const uninvitedGuestsCount = guests.length - invitedGuestsCount;

  const design: InvitationDesign = {
    theme: "royal_gold",
    headline: `The Wedding Celebration of ${event.couple}`,
    subheadline: "Joyfully request the honor of your presence",
    attireNote:
      event.dress_code ||
      "Aso-Ebi Colour Code: Champagne Gold & Emerald Velvet",
    customMessage: "Dinner, dancing, and grand merriment to follow ceremony.",
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

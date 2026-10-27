import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ReminderDeskData, ReminderRecipient } from "./types";

export async function getReminderDeskData(
  eventId: string
): Promise<ReminderDeskData | null> {
  const supabase = await createClient();

  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, title, couple, date, venue, paid_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr) {
    console.error("[getReminderDeskData] Database error loading event:", {
      code: eventErr.code,
      message: eventErr.message,
    });
    throw new Error(`Database error loading event: ${eventErr.message}`);
  }

  if (!event) return null;

  const { data: rawGuests, error: guestErr } = await supabase
    .from("guests")
    .select(
      `
      id,
      name,
      email,
      phone,
      party_size,
      rsvps (status),
      email_log (sent_at, template_type)
    `
    )
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  if (guestErr) {
    console.error("[getReminderDeskData] Database error loading guests:", {
      code: guestErr.code,
      message: guestErr.message,
    });
    throw new Error(`Database error loading guests: ${guestErr.message}`);
  }

  if (!rawGuests) return null;

  const recipients: ReminderRecipient[] = rawGuests.map((g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const logs = Array.isArray(g.email_log) ? g.email_log : [];
    const reminderLogs = logs.filter((l) => l.template_type === "reminder");
    const lastReminder = reminderLogs.sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    )[0];

    const status =
      (rsvp?.status as "pending" | "accepted" | "declined") || "pending";

    return {
      guestId: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      partySize: g.party_size,
      rsvpStatus: status,
      lastSentAt: lastReminder ? lastReminder.sent_at : null,
      isEligibleForEmail: !!g.email,
    };
  });

  const awaitingCount = recipients.filter(
    (r) => r.rsvpStatus === "pending"
  ).length;

  return {
    eventId: event.id,
    eventTitle: event.title,
    coupleName: event.couple,
    eventDate: event.date,
    venueName: event.venue,
    isPaid: !!event.paid_at,
    totalGuests: recipients.length,
    awaitingCount,
    recipients,
  };
}

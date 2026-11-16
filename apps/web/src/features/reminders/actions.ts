"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import { dispatchRsvpEmail } from "@/lib/email/dispatcher";
import { reminderEmail } from "@/lib/email/templates";
import { formatLagosDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site-url";
import { sendBatchReminderSchema } from "./schemas";

export interface BatchReminderResult {
  success?: boolean;
  error?: string;
  sentCount?: number;
  skippedCount?: number;
}

export async function sendBatchReminderAction(
  eventId: string,
  formData: FormData
): Promise<BatchReminderResult> {
  const selectedIds = formData.getAll("guestIds").map(String);
  const parsed = sendBatchReminderSchema.safeParse({
    filter: formData.get("filter"),
    subject: formData.get("subject"),
    customMessage: formData.get("customMessage"),
    selectedGuestIds: selectedIds.length > 0 ? selectedIds : undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid reminder payload",
    };
  }

  const supabase = await createClient();

  // 1. Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("title, couple, date, venue, paid_at")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Event not found" };

  // 2. Fetch target guests
  let query = supabase
    .from("guests")
    .select("id, name, email, rsvp_token, rsvps (status)")
    .eq("event_id", eventId)
    .not("email", "is", null);

  if (parsed.data.selectedGuestIds && parsed.data.selectedGuestIds.length > 0) {
    query = query.in("id", parsed.data.selectedGuestIds);
  }

  const { data: guests, error: guestErr } = await query;
  if (guestErr || !guests || guests.length === 0) {
    return { error: "No eligible recipients with email addresses found" };
  }

  // Filter based on RSVP status
  const targetGuests = guests.filter((g) => {
    const rsvp = Array.isArray(g.rsvps) ? g.rsvps[0] : g.rsvps;
    const status = rsvp?.status ?? "pending";
    if (parsed.data.filter === "awaiting") return status === "pending";
    return true;
  });

  if (targetGuests.length === 0) {
    return { error: "No guests match the selected reminder criteria" };
  }

  // 3. Check quota against free tier limit
  const { error: quotaError } = await supabase.rpc("check_invitation_quota", {
    p_event_id: eventId,
    p_recipient_count: targetGuests.length,
  });

  if (quotaError) {
    return { error: mapError(quotaError) };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let sentCount = 0;
  let skippedCount = 0;

  // 4. Batch dispatch with email cap enforcement
  for (const guest of targetGuests) {
    if (!guest.email) {
      skippedCount++;
      continue;
    }

    // Check 24-hour cap in email_log (max 5 emails per recipient per 24 hours)
    const { count: dailyCount } = await supabase
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("guest_id", guest.id)
      .gte("sent_at", oneDayAgo);

    if (dailyCount && dailyCount >= 5) {
      skippedCount++;
      continue;
    }

    const rsvpUrl = `${origin}/i/${guest.rsvp_token}`;
    const reminder = reminderEmail({
      guestName: guest.name,
      couple: event.couple,
      title: event.title,
      date: formatLagosDate(event.date),
      venue: event.venue,
      subject: parsed.data.subject,
      message: parsed.data.customMessage,
      rsvpUrl,
      siteUrl: SITE_URL,
    });
    const emailRes = await dispatchRsvpEmail({
      eventId,
      guestId: guest.id,
      recipientEmail: guest.email,
      subject: reminder.subject,
      templateType: "reminder",
      html: reminder.html,
      text: reminder.text,
    });

    if (emailRes.success) {
      sentCount++;
    } else {
      skippedCount++;
    }
  }

  revalidatePath(`/events/${eventId}/reminders`);
  return { success: true, sentCount, skippedCount };
}

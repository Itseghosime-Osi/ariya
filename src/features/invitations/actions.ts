"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import { dispatchRsvpEmail } from "@/lib/email/dispatcher";
import { trackInvitationsSchema, invitationDesignSchema } from "./schemas";

export async function trackGuestInvitationsAction(
  eventId: string,
  guestIds: string[]
): Promise<{ success?: boolean; error?: string }> {
  const parsed = trackInvitationsSchema.safeParse({ guestIds });
  if (!parsed.success) {
    return { error: "Invalid guest IDs" };
  }

  const supabase = await createClient();

  // Check quota
  const { error: quotaError } = await supabase.rpc("check_invitation_quota", {
    p_event_id: eventId,
    p_recipient_count: parsed.data.guestIds.length,
  });

  if (quotaError) {
    return { error: mapError(quotaError) };
  }

  const { error } = await supabase.rpc("track_invitations_sent", {
    p_guest_ids: parsed.data.guestIds,
  });

  if (error) {
    return { error: mapError(error) };
  }

  revalidatePath(`/events/${eventId}/invitations`);
  return { success: true };
}

export async function updateInvitationDesignAction(
  eventId: string,
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const parsed = invitationDesignSchema.safeParse({
    theme: formData.get("theme"),
    headline: formData.get("headline"),
    subheadline: formData.get("subheadline"),
    attireNote: formData.get("attireNote"),
    customMessage: formData.get("customMessage"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid design options",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ dress_code: parsed.data.attireNote || null })
    .eq("id", eventId);

  if (error) {
    return { error: mapError(error) };
  }

  revalidatePath(`/events/${eventId}/invitations`);
  return { success: true };
}

export async function sendGuestInvitationEmailAction(
  eventId: string,
  guestId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Check quota
  const { error: quotaError } = await supabase.rpc("check_invitation_quota", {
    p_event_id: eventId,
    p_recipient_count: 1,
  });

  if (quotaError) {
    return { error: mapError(quotaError) };
  }

  // 2. Query guest & event
  const { data: guest } = await supabase
    .from("guests")
    .select("name, email, rsvp_token")
    .eq("id", guestId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!guest || !guest.email) {
    return { error: "Guest has no registered email address on file" };
  }

  const { data: event } = await supabase
    .from("events")
    .select("title, couple, date, venue")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Event not found" };

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const rsvpUrl = `${origin}/i/${guest.rsvp_token}`;

  // 3. Dispatch Email
  const emailRes = await dispatchRsvpEmail({
    eventId,
    guestId,
    recipientEmail: guest.email,
    subject: `You are cordially invited: ${event.title}`,
    templateType: "reminder",
    html: `<p>Hello ${guest.name},</p><p>You are joyfully invited to celebrate the union of <strong>${event.couple}</strong>.</p><p>Date: ${event.date}<br/>Venue: ${event.venue}</p><p><a href="${rsvpUrl}">Please honour us with your RSVP here</a></p>`,
  });

  if (!emailRes.success) {
    return { error: "Failed to dispatch email. Please retry." };
  }

  // 4. Track guest invited
  await supabase.rpc("track_invitations_sent", {
    p_guest_ids: [guestId],
  });

  revalidatePath(`/events/${eventId}/invitations`);
  return { success: true };
}

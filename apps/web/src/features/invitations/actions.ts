"use server";

import { eventEndedError } from "@/features/events/expiry";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { mapError } from "@/lib/errors";
import { dispatchRsvpEmail } from "@/lib/email/dispatcher";
import { isValidCoverImage } from "@/features/events/validate-cover";
import { designColumns } from "./design";
import { formatLagosDate } from "@/lib/format";
import {
  buildInvitationEmail,
  describeEmailError,
  invitationEmailSubject,
} from "./email";
import { invitationDesignSchema, trackInvitationsSchema } from "./schemas";
import type { InvitationDesign } from "./types";

const ART_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ART_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

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

/**
 * Saves the whole design document and the legacy columns every other screen reads, so the overview,
 * the studio and the guest pass can never disagree about the same invitation.
 */
export async function saveInvitationDesignAction(
  eventId: string,
  design: unknown
): Promise<
  { ok: true; design: InvitationDesign } | { ok: false; error: string }
> {
  const parsed = invitationDesignSchema.safeParse(design);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid design options",
    };
  }

  const supabase = await createClient();
  const ended = await eventEndedError(supabase, eventId);
  if (ended) return { ok: false, error: ended };
  const { error } = await supabase
    .from("events")
    .update({
      invitation_design: parsed.data as unknown as Json,
      ...designColumns(parsed.data),
    })
    .eq("id", eventId);

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Failed to save the invitation design"),
    };
  }

  revalidatePath(`/events/${eventId}/invitations`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true, design: parsed.data };
}

/**
 * Stores an imported invitation image in the event's public art folder. The studio puts the
 * returned URL on the design's background and saves the document separately.
 */
export async function uploadInvitationArtAction(
  eventId: string,
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { ok: false, error: "Please choose an image to import" };
  }
  if (!ART_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: "Invitation art must be a JPEG, PNG or WebP image",
    };
  }
  if (file.size > MAX_ART_FILE_SIZE) {
    return { ok: false, error: "Invitation art must not exceed 5 MB" };
  }

  const supabase = await createClient();
  const ended = await eventEndedError(supabase, eventId);
  if (ended) return { ok: false, error: ended };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Authentication required to import art" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!(await isValidCoverImage(buffer, file.type))) {
    return {
      ok: false,
      error:
        "Please import a valid JPEG, PNG or WebP image (up to 40 megapixels).",
    };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${eventId}/invitation-art.${ext}`;
  const { data, error } = await supabase.storage
    .from("event-covers")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Failed to import the invitation art"),
    };
  }

  const { data: publicUrlData } = supabase.storage
    .from("event-covers")
    .getPublicUrl(data.path);
  return { ok: true, url: publicUrlData.publicUrl };
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
    .select("title, couple, date, venue, area, dress_code")
    .eq("id", eventId)
    .single();

  if (!event) return { error: "Event not found" };

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const rsvpUrl = `${origin.replace(/\/$/, "")}/i/${guest.rsvp_token}`;

  // 3. Dispatch Email
  const { html, text } = buildInvitationEmail({
    guestName: guest.name,
    couple: event.couple,
    title: event.title,
    dateLabel: formatLagosDate(event.date),
    venue: event.venue,
    area: event.area,
    dressCode: event.dress_code,
    rsvpUrl,
  });
  const emailRes = await dispatchRsvpEmail({
    eventId,
    guestId,
    recipientEmail: guest.email,
    subject: invitationEmailSubject(event.title),
    templateType: "reminder",
    html,
    text,
  });

  if (!emailRes.success) {
    return { error: describeEmailError(emailRes.error) };
  }

  // 4. Track guest invited
  await supabase.rpc("track_invitations_sent", {
    p_guest_ids: [guestId],
  });

  revalidatePath(`/events/${eventId}/invitations`);
  return { success: true };
}

/** One call emails a small batch; the screen sends a long list as several, so no call runs long. */
const MAX_BULK_INVITATION_EMAILS = 10;

/**
 * Emails every chosen guest their personal link, one after another, and says who it did not reach.
 * Each send runs the same quota check, email log and "invited" mark as a single send does.
 */
export async function sendBulkInvitationEmailsAction(
  eventId: string,
  guestIds: string[]
): Promise<{
  sent: number;
  failed: { guestId: string; error: string }[];
  error?: string;
}> {
  const ids = [...new Set(guestIds)];
  if (ids.length === 0) return { sent: 0, failed: [] };
  if (ids.length > MAX_BULK_INVITATION_EMAILS) {
    return {
      sent: 0,
      failed: [],
      error: `Send to at most ${MAX_BULK_INVITATION_EMAILS} guests at a time.`,
    };
  }

  let sent = 0;
  const failed: { guestId: string; error: string }[] = [];
  for (const [i, guestId] of ids.entries()) {
    // The provider allows a couple of sends a second; a short pause keeps a batch under it.
    if (i > 0) await new Promise((r) => setTimeout(r, 600));
    const res = await sendGuestInvitationEmailAction(eventId, guestId);
    if (res.success) sent += 1;
    else failed.push({ guestId, error: res.error ?? "Could not send" });
    // A full quota will not clear halfway through; stop instead of failing every guest.
    if (res.error && /limit|quota|not fully set up|key/i.test(res.error)) {
      for (const rest of ids.slice(i + 1))
        failed.push({ guestId: rest, error: res.error });
      break;
    }
  }
  return { sent, failed };
}

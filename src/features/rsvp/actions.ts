"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/components";
import { createClient } from "@/lib/supabase/server";
import { mapError } from "@/lib/errors";
import { checkRateLimitByKeyAndIp } from "@/lib/rate-limit";
import { dispatchRsvpEmail } from "@/lib/email/dispatcher";
import { formatLagosDate } from "@/lib/format";
import { clientEnv } from "@/lib/env/client";
import { RsvpAcceptedEmail } from "@/emails/RsvpAcceptedEmail";
import { RsvpDeclinedEmail } from "@/emails/RsvpDeclinedEmail";
import { RsvpRevisedEmail } from "@/emails/RsvpRevisedEmail";
import {
  contactEmailSchema,
  invitationDataSchema,
  submitRsvpRpcResultSchema,
} from "./schemas";
import type { InvitationData } from "./types";

export interface SubmitRsvpActionResult {
  ok: boolean;
  error?: string;
}

export async function submitRsvpAction(
  prevState: SubmitRsvpActionResult | null,
  formData: FormData
): Promise<SubmitRsvpActionResult> {
  const token = String(formData.get("token") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const attendingCount = Number(formData.get("attendingCount") || 0);
  const plusOneName = String(formData.get("plusOneName") || "").trim() || null;
  const dietary = String(formData.get("dietary") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  const rawEmail = String(formData.get("email") || "").trim() || null;

  if (!token) {
    return { ok: false, error: "Invitation pass token is missing." };
  }

  if (status !== "accepted" && status !== "declined") {
    return {
      ok: false,
      error: "Please indicate whether you are accepting or declining.",
    };
  }

  let validatedContactEmail: string | null = null;
  if (rawEmail) {
    const emailResult = contactEmailSchema.safeParse(rawEmail);
    if (!emailResult.success) {
      return { ok: false, error: emailResult.error.issues[0]?.message };
    }
    validatedContactEmail = emailResult.data;
  }

  const supabase = await createClient();

  // Rate limit submissions keyed by token AND hashed client IP
  const rateLimit = await checkRateLimitByKeyAndIp({
    prefix: "submit",
    identifier: token,
    tokenLimit: 10,
    ipLimit: 30,
    client: supabase,
  });

  if (!rateLimit.success) {
    return {
      ok: false,
      error: `Too many submissions. Please wait ${rateLimit.retryAfter ?? 30} seconds and try again.`,
    };
  }

  const { data: invData } = await supabase.rpc("get_invitation", {
    p_token: token,
  });

  const parsedInv = invitationDataSchema.safeParse(invData);
  if (!parsedInv.success) {
    return { ok: false, error: "Invalid invitation pass." };
  }

  const invitation: InvitationData = parsedInv.data;
  const isRevision = Boolean(invitation.rsvp?.responded_at);

  // Call submit_rsvp RPC strictly with optional contact email
  const { data: submitData, error } = await supabase.rpc("submit_rsvp", {
    p_token: token,
    p_status: status,
    p_attending_count: status === "accepted" ? attendingCount : 0,
    p_plus_one_name: plusOneName || undefined,
    p_dietary: dietary || undefined,
    p_note: note || undefined,
    p_contact_email: validatedContactEmail || undefined,
  });

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Failed to submit ceremonial RSVP."),
    };
  }

  const parsedSubmit = submitRsvpRpcResultSchema.safeParse(submitData);
  const delivery = parsedSubmit.success
    ? parsedSubmit.data.email_delivery
    : undefined;

  // Dispatch confirmation email if permitted by DB cap and email exists
  if (delivery?.can_send && delivery.target_email) {
    await sendConfirmationEmail({
      invitation,
      token,
      targetEmail: delivery.target_email,
      status,
      attendingCount,
      dietary,
      isRevision,
    });
  }

  revalidatePath(`/i/${token}`);
  if (invitation.event.id) {
    revalidatePath(`/events/${invitation.event.id}`);
    revalidatePath(`/events/${invitation.event.id}/guests`);
  }

  return { ok: true };
}

async function sendConfirmationEmail({
  invitation,
  token,
  targetEmail,
  status,
  attendingCount,
  dietary,
  isRevision,
}: {
  invitation: InvitationData;
  token: string;
  targetEmail: string;
  status: "accepted" | "declined";
  attendingCount: number;
  dietary: string | null;
  isRevision: boolean;
}): Promise<void> {
  try {
    const origin = clientEnv.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const passUrl = `${origin}/i/${token}`;
    let emailHtml = "";
    let subject = "";

    if (isRevision) {
      subject = `Updated RSVP: ${invitation.event.title}`;
      emailHtml = await render(
        RsvpRevisedEmail({
          guestName: invitation.guest.display_name,
          couple: invitation.event.couple,
          title: invitation.event.title,
          status,
          attendingCount: status === "accepted" ? attendingCount : 0,
          dietary,
          passUrl,
        })
      );
    } else if (status === "accepted") {
      subject = `Your Seat is Reserved: ${invitation.event.title}`;
      emailHtml = await render(
        RsvpAcceptedEmail({
          guestName: invitation.guest.display_name,
          couple: invitation.event.couple,
          title: invitation.event.title,
          date: formatLagosDate(invitation.event.date),
          venue: invitation.event.venue,
          attendingCount,
          dressCode: invitation.event.dress_code,
          tableName: invitation.table_name,
          passUrl,
        })
      );
    } else {
      subject = `Invitation Regrets: ${invitation.event.title}`;
      emailHtml = await render(
        RsvpDeclinedEmail({
          guestName: invitation.guest.display_name,
          couple: invitation.event.couple,
          title: invitation.event.title,
          passUrl,
        })
      );
    }

    await dispatchRsvpEmail({
      eventId: invitation.event.id,
      guestId: invitation.guest.id,
      recipientEmail: targetEmail,
      subject,
      templateType: isRevision ? "revised" : status,
      html: emailHtml,
    });
  } catch (err) {
    console.error("Email dispatch error in submitRsvpAction:", err);
  }
}

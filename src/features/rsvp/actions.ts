"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { render } from "@react-email/components";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { dispatchRsvpEmail } from "@/lib/email/dispatcher";
import { formatLagosDate } from "@/lib/format";
import { RsvpAcceptedEmail } from "@/emails/RsvpAcceptedEmail";
import { RsvpDeclinedEmail } from "@/emails/RsvpDeclinedEmail";
import { RsvpRevisedEmail } from "@/emails/RsvpRevisedEmail";
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
  const status = String(formData.get("status") || "").trim() as
    "accepted" | "declined";
  const attendingCount = Number(formData.get("attendingCount") || 0);
  const plusOneName = String(formData.get("plusOneName") || "").trim() || null;
  const dietary = String(formData.get("dietary") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  const guestEmail = String(formData.get("email") || "").trim() || null;

  if (!token) {
    return { ok: false, error: "Invitation pass token is missing." };
  }

  if (status !== "accepted" && status !== "declined") {
    return {
      ok: false,
      error: "Please indicate whether you are accepting or declining.",
    };
  }

  // Rate limit submissions: max 10 submissions per minute per token
  const rateLimit = checkRateLimit(`rsvp_submit:${token}`, 10);
  if (!rateLimit.success) {
    return {
      ok: false,
      error: `Too many submissions. Please wait ${rateLimit.retryAfter ?? 30} seconds and try again.`,
    };
  }

  const supabase = await createClient();
  const { data: invData } = await supabase.rpc("get_invitation", {
    p_token: token,
  });

  const invitation = invData as unknown as InvitationData | null;
  const isRevision = Boolean(invitation?.rsvp?.responded_at);

  // Call submit_rsvp RPC strictly (never direct table access)
  const { error } = await supabase.rpc("submit_rsvp", {
    p_token: token,
    p_status: status,
    p_attending_count: status === "accepted" ? attendingCount : 0,
    p_plus_one_name: plusOneName || undefined,
    p_dietary: dietary || undefined,
    p_note: note || undefined,
  });

  if (error) {
    return {
      ok: false,
      error: mapError(error, "Failed to submit ceremonial RSVP."),
    };
  }

  // If email was provided, also save it on the guest record using admin client
  if (guestEmail && invitation?.guest?.id) {
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("guests")
        .update({ email: guestEmail })
        .eq("id", invitation.guest.id);
    } catch {
      // non-fatal
    }
  }

  // Send confirmation email via Resend / Mailpit
  const targetEmail =
    guestEmail || (invitation?.guest as { email?: string })?.email;
  if (targetEmail && invitation?.event) {
    try {
      const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
    } catch {
      // Email dispatch failure should not block RSVP submission
    }
  }

  revalidatePath(`/i/${token}`);
  if (invitation?.event?.id) {
    revalidatePath(`/events/${invitation.event.id}`);
    revalidatePath(`/events/${invitation.event.id}/guests`);
  }

  return { ok: true };
}

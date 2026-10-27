import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface DispatchEmailParams {
  eventId: string;
  guestId?: string | null;
  recipientEmail: string;
  subject: string;
  templateType: "accepted" | "declined" | "revised" | "reminder";
  html: string;
}

export interface EmailDispatchResult {
  success: boolean;
  providerId?: string;
  error?: string;
}

export async function dispatchRsvpEmail({
  eventId,
  guestId = null,
  recipientEmail,
  subject,
  templateType,
  html,
}: DispatchEmailParams): Promise<EmailDispatchResult> {
  let providerId: string | undefined;
  let status: "sent" | "failed" = "sent";

  const isRealApiKey =
    serverEnv.RESEND_API_KEY &&
    !serverEnv.RESEND_API_KEY.startsWith("re_sample") &&
    !serverEnv.RESEND_API_KEY.startsWith("re_placeholder");

  try {
    if (isRealApiKey) {
      const resend = new Resend(serverEnv.RESEND_API_KEY);
      const res = await resend.emails.send({
        from: `Àríyá Celebrations <${serverEnv.RESEND_FROM_EMAIL}>`,
        to: recipientEmail,
        subject,
        html,
      });

      if (res.error) {
        status = "failed";
      } else {
        providerId = res.data?.id;
      }
    } else {
      // Local dev & test fallback: Dispatch directly to Mailpit HTTP API
      const mailpitUrl = "http://localhost:57324/api/v1/send";
      const mailpitRes = await fetch(mailpitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: {
            Name: "Àríyá Celebrations",
            Address: serverEnv.RESEND_FROM_EMAIL || "rsvps@owambeplan.com",
          },
          To: [{ Address: recipientEmail }],
          Subject: subject,
          HTML: html,
        }),
      });

      if (mailpitRes.ok) {
        const body = (await mailpitRes.json()) as { ID?: string };
        providerId = body.ID ?? "mailpit-local-id";
      } else {
        providerId = "local-dev-mock-id";
      }
    }
  } catch {
    status = "failed";
  }

  // Always log the email into public.email_log using the service role admin client
  try {
    const adminClient = createAdminClient();
    await adminClient.from("email_log").insert({
      event_id: eventId,
      guest_id: guestId,
      recipient_email: recipientEmail,
      subject,
      template_type: templateType,
      status,
      provider_id: providerId ?? null,
      sent_at: new Date().toISOString(),
    });
  } catch {
    // Logging failure should not crash the flow
  }

  return {
    success: status === "sent",
    providerId,
  };
}

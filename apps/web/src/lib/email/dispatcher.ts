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
  let errorClass: string | undefined;

  try {
    if (serverEnv.EMAIL_TRANSPORT === "resend") {
      const resend = new Resend(serverEnv.RESEND_API_KEY);
      const res = await resend.emails.send({
        from: `Àríyá Celebrations <${serverEnv.RESEND_FROM_EMAIL}>`,
        to: recipientEmail,
        subject,
        html,
      });

      if (res.error) {
        status = "failed";
        errorClass = res.error.name || "ResendApiError";
      } else {
        providerId = res.data?.id;
      }
    } else {
      // Mailpit transport configured via validated environment variable
      const mailpitUrl = `${serverEnv.MAILPIT_URL.replace(/\/$/, "")}/api/v1/send`;
      const mailpitRes = await fetch(mailpitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: {
            Name: "Àríyá Celebrations",
            Address: serverEnv.RESEND_FROM_EMAIL,
          },
          To: [{ Address: recipientEmail }],
          Subject: subject,
          HTML: html,
        }),
      });

      if (!mailpitRes.ok) {
        status = "failed";
        errorClass = `MailpitHttpError_${mailpitRes.status}`;
      } else {
        const body = (await mailpitRes.json()) as { ID?: string };
        providerId = body.ID;
      }
    }
  } catch (err) {
    status = "failed";
    errorClass = err instanceof Error ? err.constructor.name : "UnknownError";
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
      provider_id: status === "sent" ? (providerId ?? null) : null,
      error_class: status === "failed" ? (errorClass ?? "UnknownError") : null,
      sent_at: new Date().toISOString(),
    });
  } catch {
    // Logging failure should not crash the flow
  }

  return {
    success: status === "sent",
    providerId: status === "sent" ? providerId : undefined,
    error: status === "failed" ? errorClass : undefined,
  };
}

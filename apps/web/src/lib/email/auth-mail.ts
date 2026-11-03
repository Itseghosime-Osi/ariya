import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env/server";

/**
 * Sends an account email (confirm sign-up, reset passcode) through the app's own email provider.
 * Supabase's built-in mailer only delivers to the project's own team, so account emails go out
 * the same way as RSVP emails. Returns whether the provider accepted it.
 */
export async function sendAuthEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    if (serverEnv.EMAIL_TRANSPORT === "resend") {
      const resend = new Resend(serverEnv.RESEND_API_KEY);
      const res = await resend.emails.send({
        from: `Àríyá <${serverEnv.RESEND_FROM_EMAIL}>`,
        to,
        subject,
        html,
      });
      if (res.error) {
        console.error("Auth email rejected by Resend:", res.error.name);
        return false;
      }
      return true;
    }
    const mailpitRes = await fetch(
      `${serverEnv.MAILPIT_URL.replace(/\/$/, "")}/api/v1/send`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Name: "Àríyá", Address: serverEnv.RESEND_FROM_EMAIL },
          To: [{ Address: to }],
          Subject: subject,
          HTML: html,
        }),
      }
    );
    return mailpitRes.ok;
  } catch (err) {
    console.error(
      "Auth email failed:",
      err instanceof Error ? err.constructor.name : "UnknownError"
    );
    return false;
  }
}

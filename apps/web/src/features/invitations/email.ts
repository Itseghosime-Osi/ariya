/** The invitation email: one personal link, in the celebration's own colours. Pure, so it is testable. */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface InvitationEmailInput {
  guestName: string;
  couple: string;
  title: string;
  /** Already formatted, e.g. "Saturday, 12 December 2026". */
  dateLabel: string;
  venue: string;
  area?: string | null;
  dressCode?: string | null;
  rsvpUrl: string;
}

export function invitationEmailSubject(title: string): string {
  return `You are invited: ${title}`.slice(0, 150);
}

export function buildInvitationEmail(input: InvitationEmailInput): {
  html: string;
  text: string;
} {
  const e = escapeHtml;
  const place = [input.venue, input.area].filter(Boolean).join(", ");
  const rows = [
    ["When", input.dateLabel],
    ["Where", place],
    ...(input.dressCode ? [["Dress code", input.dressCode]] : []),
  ].filter(([, v]) => v);

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#f7f2ea;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;color:#1c0f14;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#fffaf0;border:1px solid #e6d3a3;border-radius:20px;overflow:hidden;" cellpadding="0" cellspacing="0">
<tr><td style="background:#4a0f1c;padding:28px 24px;text-align:center;">
<div style="color:#e9c98a;font:600 11px Arial,sans-serif;letter-spacing:3px;text-transform:uppercase;">You are invited</div>
<div style="color:#fff6dc;font-size:28px;line-height:1.2;margin-top:10px;">${e(input.title)}</div>
<div style="color:#f4e8cc;font-size:16px;font-style:italic;margin-top:6px;">${e(input.couple)}</div>
</td></tr>
<tr><td style="padding:26px 24px 8px;">
<p style="font-size:17px;line-height:1.5;margin:0 0 16px;">Dear ${e(input.guestName)},</p>
<p style="font-size:16px;line-height:1.55;margin:0 0 18px;">We would be honoured to have you celebrate with us. Please let us know if you can come.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e6d3a3;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #efe2bd;font:600 11px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#7a5612;width:96px;vertical-align:top;">${e(k)}</td><td style="padding:10px 0;border-bottom:1px solid #efe2bd;font-size:16px;">${e(v)}</td></tr>`
  )
  .join("\n")}
</table></td></tr>
<tr><td style="padding:18px 24px 28px;text-align:center;">
<a href="${e(input.rsvpUrl)}" style="display:inline-block;background:#4a0f1c;color:#fff6dc;text-decoration:none;font:600 16px Arial,sans-serif;padding:15px 34px;border-radius:999px;">Open my invitation &amp; RSVP</a>
<p style="font:13px Arial,sans-serif;color:#6b5a60;margin:18px 0 0;line-height:1.5;">This link is just for you. Please do not forward it.<br>If the button does not work, paste this into your browser:<br><span style="word-break:break-all;color:#4a0f1c;">${e(input.rsvpUrl)}</span></p>
</td></tr></table>
<p style="font:12px Arial,sans-serif;color:#8a7a80;margin:16px 0 0;">Sent with Àríyá</p>
</td></tr></table></body></html>`;

  const text = [
    `Dear ${input.guestName},`,
    "",
    `You are invited: ${input.title} (${input.couple}).`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Open your invitation and RSVP: ${input.rsvpUrl}`,
    "This link is just for you. Please do not forward it.",
  ].join("\n");

  return { html, text };
}

/** What a person should read when the provider refuses an email. */
export function describeEmailError(errorClass?: string): string {
  switch (errorClass) {
    case "validation_error":
      return "Email is not fully set up yet: the sending domain has not been verified with the email provider. Nothing was sent.";
    case "rate_limit_exceeded":
    case "daily_quota_exceeded":
    case "monthly_quota_exceeded":
      return "The email provider's sending limit was reached. Try again later or upgrade the email plan.";
    case "invalid_api_key":
    case "restricted_api_key":
    case "missing_api_key":
      return "The email provider's key is missing or wrong.";
    default:
      return "The email could not be sent. Please try again.";
  }
}

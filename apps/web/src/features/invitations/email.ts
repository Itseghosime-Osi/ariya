import type { EmailFailureReason } from "@/lib/email/provider-error";

/** The invitation email: one personal link, in Àríyá’s brand colours. Pure, so it is testable. */

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
  const venue = input.venue.trim();
  const area = input.area?.trim() ?? "";
  const normalise = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const normalVenue = normalise(venue);
  const normalArea = normalise(area);
  const includesArea =
    normalArea &&
    (normalVenue === normalArea || normalVenue.endsWith(` ${normalArea}`));
  const place = [venue, includesArea ? "" : area].filter(Boolean).join(", ");
  const headline = input.couple.trim() || input.title;
  const subtitle = headline === input.title ? "" : input.title;
  const logoUrl = new URL("/icons/icon-512.png", input.rsvpUrl).href;
  const preview = `${input.guestName}, you are invited to ${input.title}. Open your personal invitation to reply.`;
  const rows = [
    ["When", input.dateLabel],
    ["Where", place],
    ...(input.dressCode ? [["Dress code", input.dressCode]] : []),
  ].filter(([, v]) => v);

  const headlineHtml = headline
    .split(/(\s&\s)/)
    .map((part) =>
      part.trim() === "&"
        ? '<span style="font-family:Georgia,serif;font-style:italic;font-weight:normal;color:#946b24;"> &amp; </span>'
        : e(part)
    )
    .join("");

  const html = `<!doctype html>
<html lang="en-NG">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(invitationEmailSubject(input.title))}</title></head>
<body style="margin:0;padding:0;background:#3a1020;color:#29151c;font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${e(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#3a1020"><tr><td align="center" style="padding:24px 14px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 8px 23px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="44"><img src="${e(logoUrl)}" alt="Àríyá" width="40" height="40" style="display:block;width:40px;height:40px;border:0;border-radius:10px;"></td><td style="padding-left:9px;font-family:Baskerville,Georgia,serif;font-size:25px;font-weight:bold;color:#fff4df;">Àríyá</td><td align="right" style="font-size:9px;letter-spacing:2px;line-height:1.8;color:#edcf8f;text-transform:uppercase;">One invitation.<br>All this joy.</td></tr></table>
</td></tr>
<tr><td style="padding:9px;border:1px solid #b99255;border-radius:250px 250px 24px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" bgcolor="#fbf3e5" style="background:#fbf3e5;border-radius:240px 240px 0 0;padding:48px 22px 30px;">
<p style="margin:0 0 15px;font-family:Georgia,serif;font-size:25px;line-height:1;color:#946b24;" aria-hidden="true">✦</p>
<p style="margin:0 0 23px;font-size:9px;line-height:1.8;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#7a5612;">Good company starts with you</p>
<h1 style="margin:0;font-family:'Bodoni Moda',Baskerville,'Palatino Linotype',Georgia,serif;font-size:66px;font-weight:normal;line-height:0.98;letter-spacing:-3px;color:#621b32;">You’re<br><em style="font-weight:normal;">invited.</em></h1>
<p style="margin:25px 0 12px;font-size:9px;line-height:1.7;letter-spacing:2px;text-transform:uppercase;color:#7a5612;">To celebrate with</p>
<h2 style="margin:0;font-family:'Bodoni Moda',Baskerville,Georgia,serif;font-size:34px;font-weight:normal;line-height:1.2;letter-spacing:-1px;color:#3a1020;overflow-wrap:anywhere;">${headlineHtml}</h2>
${subtitle ? `<p style="margin:12px 0 0;font-size:12px;line-height:1.8;color:#6b5057;overflow-wrap:anywhere;">${e(subtitle)}</p>` : ""}
<table role="presentation" width="170" cellpadding="0" cellspacing="0" border="0" style="margin:25px auto 0;"><tr><td width="70" style="border-top:1px solid #c2a36b;"></td><td align="center" width="30" style="font:16px Georgia,serif;color:#946b24;" aria-hidden="true">✧</td><td width="70" style="border-top:1px solid #c2a36b;"></td></tr></table>
</td></tr>
<tr><td bgcolor="#fbf3e5" style="padding:4px 22px 22px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffcf7" style="border:1px solid #e5d6bb;border-radius:18px;"><tr><td style="padding:24px 20px;">
<p style="margin:0 0 12px;font-family:Baskerville,Georgia,serif;font-size:23px;line-height:1.4;font-weight:bold;color:#621b32;">Dear ${e(input.guestName)},</p>
<p style="margin:0;font-size:14px;line-height:1.9;color:#654c55;">Some days are better with your favourite people in the room. We would love you to be there for ours.</p>
<p style="margin:14px 0 0;font-size:14px;line-height:1.9;color:#654c55;">Here’s a little of what’s waiting for you.</p>
</td></tr></table>
</td></tr>
<tr><td bgcolor="#fbf3e5" style="padding:0 22px 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows.map(([label, value], index) => `<tr><td style="padding:0 0 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${index % 2 === 0 ? "#ecd5d3" : "#eddfbd"}" style="border-radius:14px;"><tr><td width="45" valign="top" style="padding:18px 0 18px 16px;font:italic 21px Georgia,serif;color:#8d5f25;">${["i", "ii", "iii"][index]}</td><td style="padding:17px 16px 17px 5px;"><p style="margin:0 0 5px;font-size:9px;font-weight:bold;letter-spacing:2px;line-height:1.7;text-transform:uppercase;color:#621b32;">${e(label)}</p><p style="margin:0;font-size:14px;line-height:1.8;color:#3a1020;overflow-wrap:anywhere;">${e(value)}</p></td></tr></table></td></tr>`).join("\n")}
</table>
</td></tr>
<tr><td bgcolor="#edcf8f" align="center" style="background:#edcf8f;padding:25px 22px 27px;border-top:2px dashed #ac8151;border-radius:0 0 15px 15px;">
<p style="margin:0 0 8px;font-family:Baskerville,Georgia,serif;font-size:25px;line-height:1.2;font-style:italic;color:#4e1729;">A little reply. A lovely day.</p>
<p style="margin:0 0 19px;font-size:12px;line-height:1.8;color:#5c392a;">Open your invitation and tell us if you can make it.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#621b32" style="border:1px solid #621b32;border-radius:999px;mso-padding-alt:15px 22px;"><a href="${e(input.rsvpUrl)}" style="display:inline-block;padding:15px 22px;font-size:14px;font-weight:bold;line-height:1.5;color:#fff7e6;text-decoration:none;border-radius:999px;">Open my invitation &amp; RSVP</a></td></tr></table>
<p style="margin:17px 0 0;font-size:10px;line-height:1.8;color:#5c392a;">Made for you. Please keep your personal link private.</p>
</td></tr>
</table>
</td></tr>
<tr><td align="center" style="padding:24px 10px 0;">
<p style="margin:0 0 7px;font-size:11px;line-height:1.8;color:#eddbc7;">Button taking the day off? Copy this link into your browser:</p>
<p style="margin:0;font-size:11px;line-height:1.8;word-break:break-all;overflow-wrap:anywhere;"><a href="${e(input.rsvpUrl)}" style="color:#edcf8f;text-decoration:underline;word-break:break-all;">${e(input.rsvpUrl)}</a></p>
<p style="margin:22px 0 0;font-family:Baskerville,Georgia,serif;font-size:18px;font-style:italic;color:#edcf8f;">Here’s to your kind of celebration.</p>
<p style="margin:7px 0 0;font-size:10px;line-height:1.8;letter-spacing:1px;color:#eddbc7;">Sent with Àríyá</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

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
export function describeEmailError(
  errorClass?: string,
  reason?: EmailFailureReason
): string {
  if (reason === "domain_unverified")
    return "The email provider has not verified the sending domain for this account. Nothing was sent.";
  if (reason === "test_recipients_only")
    return "The email provider is restricting sending to test recipients. Check that the API key belongs to the account with your verified sending domain. Nothing was sent.";
  if (reason === "invalid_address")
    return "The email provider rejected an email address. Check the guest’s email address and the configured sender. Nothing was sent.";
  switch (errorClass) {
    case "validation_error":
      return "The email provider rejected the message as invalid. Check the failed request in your email provider’s logs for the exact reason. Nothing was sent.";
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

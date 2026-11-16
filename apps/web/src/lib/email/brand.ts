/**
 * Àríyá's one email design, shared by every email the app sends: a velvet wine page, an ivory arch
 * with a Bodoni headline, a personal letter, numbered detail cards, a gold "ticket" with the one
 * button that matters, and a short signed footer. Table-based with inline styles, so it holds in
 * Gmail, Outlook and Apple Mail alike, and pure, so every email can be tested without sending.
 *
 * The guest invitation (features/invitations/email.ts) is the design this was drawn from.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const e = escapeHtml;

/** A headline line; `em` lines are set in italic, as on the invitation card. */
export type HeadlineLine = string | { em: string };

export interface BrandEmailRow {
  label: string;
  value: string;
}

export interface BrandEmail {
  /** The line inbox apps show beside the subject. */
  preview: string;
  /** Small capitals above the headline, e.g. "Welcome to Àríyá". */
  kicker: string;
  headline: HeadlineLine[];
  /** A line under the headline (the couple, a celebration's title). */
  subtitle?: string | null;
  /** "Hello Ada," — left out when there is no name. */
  greeting?: string | null;
  paragraphs: string[];
  /** Numbered cards (i, ii, iii…) for steps or the facts of a celebration. */
  rows?: BrandEmailRow[];
  cta?: {
    title: string;
    note?: string;
    label: string;
    url: string;
    /** Small print under the button. */
    finePrint?: string;
    /** A quieter second link under the button. */
    secondary?: { label: string; url: string };
  };
  /** Shows the button's link in full under the card, for clients that strip buttons. */
  showFallbackLink?: boolean;
  signoff?: string;
  signature?: string;
  /** Why this person got the email. */
  reason: string;
  /** The site, for the logo and the footer link. */
  siteUrl: string;
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
const ROW_TINTS = ["#ecd5d3", "#eddfbd"];

function headlineHtml(lines: HeadlineLine[]): string {
  return lines
    .map((line) =>
      typeof line === "string"
        ? e(line)
        : `<em style="font-weight:normal;">${e(line.em)}</em>`
    )
    .join("<br>");
}

function headlineText(lines: HeadlineLine[]): string {
  return lines
    .map((line) => (typeof line === "string" ? line : line.em))
    .join(" ");
}

export function renderBrandEmail(input: BrandEmail): {
  html: string;
  text: string;
} {
  const site = input.siteUrl.replace(/\/$/, "");
  const logoUrl = `${site}/icons/icon-512.png`;
  const host = site.replace(/^https?:\/\//, "");
  const signoff = input.signoff ?? "Here’s to every yes ahead of you.";
  const signature = input.signature ?? "With love, the Àríyá team";

  const rows = (input.rows ?? []).filter((row) => row.value.trim());

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${e(input.kicker)}</title></head>
<body style="margin:0;padding:0;background:#3a1020;color:#29151c;font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(input.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#3a1020"><tr><td align="center" style="padding:24px 14px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:2px 6px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="44"><img src="${e(logoUrl)}" alt="Àríyá" width="40" height="40" style="display:block;width:40px;height:40px;border:0;border-radius:10px;"></td>
<td style="padding-left:9px;font-family:Baskerville,Georgia,serif;font-size:25px;font-weight:bold;color:#fff4df;">Àríyá</td>
<td align="right" style="font-size:9px;letter-spacing:2px;line-height:1.8;color:#edcf8f;text-transform:uppercase;">The yes<br>begins here.</td>
</tr></table>
</td></tr>
<tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" bgcolor="#fbf3e5" style="background:#fbf3e5;border-radius:240px 240px 0 0;padding:52px 24px 30px;">
<p style="margin:0 0 15px;font-family:Georgia,serif;font-size:25px;line-height:1;color:#946b24;" aria-hidden="true">✦</p>
<p style="margin:0 0 22px;font-size:9px;line-height:1.8;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;color:#7a5612;">${e(input.kicker)}</p>
<h1 style="margin:0;font-family:'Bodoni Moda',Baskerville,'Palatino Linotype',Georgia,serif;font-size:52px;font-weight:normal;line-height:1.02;letter-spacing:-2px;color:#621b32;overflow-wrap:anywhere;">${headlineHtml(input.headline)}</h1>
${input.subtitle ? `<p style="margin:16px 0 0;font-family:'Bodoni Moda',Baskerville,Georgia,serif;font-size:24px;line-height:1.3;color:#3a1020;overflow-wrap:anywhere;">${e(input.subtitle)}</p>` : ""}
<table role="presentation" width="170" cellpadding="0" cellspacing="0" border="0" style="margin:26px auto 0;"><tr><td width="70" style="border-top:1px solid #c2a36b;"></td><td align="center" width="30" style="font:16px Georgia,serif;color:#946b24;" aria-hidden="true">✧</td><td width="70" style="border-top:1px solid #c2a36b;"></td></tr></table>
</td></tr>
<tr><td bgcolor="#fbf3e5" style="background:#fbf3e5;padding:6px 22px ${rows.length ? "18px" : "26px"};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fffcf7" style="border:1px solid #e5d6bb;border-radius:18px;"><tr><td style="padding:26px 22px;">
${input.greeting ? `<p style="margin:0 0 12px;font-family:Baskerville,Georgia,serif;font-size:23px;line-height:1.4;font-weight:bold;color:#621b32;overflow-wrap:anywhere;">${e(input.greeting)}</p>` : ""}
${input.paragraphs.map((p, i) => `<p style="margin:${i === 0 ? "0" : "14px 0 0"};font-size:14px;line-height:1.9;color:#654c55;overflow-wrap:anywhere;">${e(p)}</p>`).join("\n")}
</td></tr></table>
</td></tr>
${
  rows.length
    ? `<tr><td bgcolor="#fbf3e5" style="background:#fbf3e5;padding:0 22px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows
  .map(
    (row, i) =>
      `<tr><td style="padding:0 0 ${i === rows.length - 1 ? "0" : "10px"};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${ROW_TINTS[i % 2]}" style="border-radius:14px;"><tr><td width="45" valign="top" style="padding:18px 0 18px 16px;font:italic 21px Georgia,serif;color:#8d5f25;">${ROMAN[i] ?? i + 1}</td><td style="padding:17px 16px 17px 5px;"><p style="margin:0 0 5px;font-size:9px;font-weight:bold;letter-spacing:2px;line-height:1.7;text-transform:uppercase;color:#621b32;">${e(row.label)}</p><p style="margin:0;font-size:14px;line-height:1.8;color:#3a1020;overflow-wrap:anywhere;">${e(row.value)}</p></td></tr></table></td></tr>`
  )
  .join("\n")}
</table>
</td></tr>`
    : ""
}
${
  input.cta
    ? `<tr><td bgcolor="#edcf8f" align="center" style="background:#edcf8f;padding:26px 22px 28px;border-top:2px dashed #ac8151;border-radius:0 0 15px 15px;">
<p style="margin:0 0 8px;font-family:Baskerville,Georgia,serif;font-size:25px;line-height:1.2;font-style:italic;color:#4e1729;">${e(input.cta.title)}</p>
${input.cta.note ? `<p style="margin:0 0 19px;font-size:12px;line-height:1.8;color:#5c392a;">${e(input.cta.note)}</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td align="center" bgcolor="#621b32" style="border:1px solid #621b32;border-radius:999px;mso-padding-alt:15px 24px;"><a href="${e(input.cta.url)}" style="display:inline-block;padding:15px 24px;font-size:14px;font-weight:bold;line-height:1.5;color:#fff7e6;text-decoration:none;border-radius:999px;">${e(input.cta.label)}</a></td></tr></table>
${input.cta.secondary ? `<p style="margin:16px 0 0;font-size:11px;line-height:1.8;color:#5c392a;">or <a href="${e(input.cta.secondary.url)}" style="color:#621b32;font-weight:bold;">${e(input.cta.secondary.label)}</a></p>` : ""}
${input.cta.finePrint ? `<p style="margin:16px 0 0;font-size:10px;line-height:1.8;color:#5c392a;">${e(input.cta.finePrint)}</p>` : ""}
</td></tr>`
    : `<tr><td bgcolor="#fbf3e5" style="background:#fbf3e5;padding:0;border-radius:0 0 15px 15px;height:12px;line-height:12px;font-size:0;">&nbsp;</td></tr>`
}
</table>
</td></tr>
<tr><td align="center" style="padding:26px 12px 0;">
${
  input.cta && input.showFallbackLink
    ? `<p style="margin:0 0 7px;font-size:11px;line-height:1.8;color:#eddbc7;">Button taking the day off? Copy this link into your browser:</p>
<p style="margin:0 0 22px;font-size:11px;line-height:1.8;word-break:break-all;overflow-wrap:anywhere;"><a href="${e(input.cta.url)}" style="color:#edcf8f;text-decoration:underline;word-break:break-all;">${e(input.cta.url)}</a></p>`
    : ""
}
<p style="margin:0;font-family:Baskerville,Georgia,serif;font-size:19px;font-style:italic;color:#edcf8f;">${e(signoff)}</p>
<p style="margin:6px 0 0;font-size:12px;line-height:1.8;color:#eddbc7;">${e(signature)}</p>
<table role="presentation" width="120" cellpadding="0" cellspacing="0" border="0" style="margin:20px auto;"><tr><td style="border-top:1px solid #6e3646;"></td></tr></table>
<p style="margin:0;font-size:10px;line-height:1.8;color:#c9aeb3;overflow-wrap:anywhere;">${e(input.reason)}</p>
<p style="margin:10px 0 0;font-size:10px;line-height:1.8;letter-spacing:1px;color:#c9aeb3;">Àríyá · <a href="${e(site)}" style="color:#edcf8f;text-decoration:none;">${e(host)}</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;

  const text = [
    input.kicker.toUpperCase(),
    headlineText(input.headline),
    input.subtitle ?? "",
    "",
    input.greeting ?? "",
    ...input.paragraphs.flatMap((p) => [p, ""]),
    ...rows.map((row) => `${row.label}: ${row.value}`),
    rows.length ? "" : null,
    input.cta ? `${input.cta.label}: ${input.cta.url}` : null,
    input.cta?.secondary
      ? `${input.cta.secondary.label}: ${input.cta.secondary.url}`
      : null,
    input.cta?.finePrint ?? null,
    "",
    signoff,
    signature,
    "",
    input.reason,
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, text };
}

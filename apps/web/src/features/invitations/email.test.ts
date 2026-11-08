import { describe, expect, it } from "vitest";
import { buildInvitationEmail, describeEmailError, escapeHtml } from "./email";

const base = {
  guestName: "Ada",
  couple: "Ade & Bisi",
  title: "Ade & Bisi's Wedding",
  dateLabel: "Saturday, 12 December 2026",
  venue: "Eko Hotel",
  area: "Victoria Island",
  dressCode: "Aso-ebi",
  rsvpUrl: "https://ariyaday.com/i/abc123",
};

describe("invitation email", () => {
  it("escapes HTML in names so a guest cannot inject markup", () => {
    expect(escapeHtml(`<img src=x onerror="1">&'`)).toBe(
      "&lt;img src=x onerror=&quot;1&quot;&gt;&amp;&#39;"
    );
    const { html } = buildInvitationEmail({
      ...base,
      guestName: `<script>alert(1)</script>`,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("carries the link, the details and a plain-text version", () => {
    const { html, text } = buildInvitationEmail(base);
    expect(html).toContain('href="https://ariyaday.com/i/abc123"');
    expect(html).toContain("Eko Hotel, Victoria Island");
    expect(html).toContain('src="https://ariyaday.com/icons/icon-512.png"');
    expect(html).toContain("Aso-ebi");
    expect(text).toContain("https://ariyaday.com/i/abc123");
    expect(text).toContain("When: Saturday, 12 December 2026");
  });

  it("leaves out rows it has nothing for", () => {
    const { html } = buildInvitationEmail({ ...base, dressCode: null });
    expect(html).not.toContain("Dress code");
  });

  it("prints the supplied guest name without adding an edit label", () => {
    expect(buildInvitationEmail(base).html).not.toContain("Edited");
    const { html, text } = buildInvitationEmail({
      ...base,
      guestName: "Tola Ade — Edited",
    });
    expect(html).toContain("Dear Tola Ade — Edited,");
    expect(text).toContain("Dear Tola Ade — Edited,");
  });

  it("does not repeat an area already at the end of the venue", () => {
    const { html, text } = buildInvitationEmail({
      ...base,
      venue: "Eko Hotel, Victoria Island, Lagos",
      area: "victoria island, Lagos",
    });
    expect(html).toContain("Eko Hotel, Victoria Island, Lagos");
    expect(text).toContain("Where: Eko Hotel, Victoria Island, Lagos");
    expect(text).not.toContain("Lagos, victoria");
  });

  it("retains distinct location details and treats similar names separately", () => {
    const { text } = buildInvitationEmail({
      ...base,
      venue: "NewLagos",
      area: "Lagos",
    });
    expect(text).toContain("Where: NewLagos, Lagos");
    const distinct = buildInvitationEmail({
      ...base,
      venue: "Lagos Hall",
      area: "Ikeja",
    });
    expect(distinct.text).toContain("Where: Lagos Hall, Ikeja");
  });

  it("keeps long and untrusted event details escaped in the email", () => {
    const { html } = buildInvitationEmail({
      ...base,
      couple: '<img src=x onerror="bad">',
      title: "<script>bad</script>",
      venue: "A & B Hall",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("A &amp; B Hall");
    expect(html).toContain('role="presentation"');
  });

  it("does not assume a validation error means the domain is unverified", () => {
    expect(describeEmailError("validation_error")).toMatch(/logs/i);
    expect(describeEmailError("validation_error")).not.toMatch(
      /has not verified/i
    );
    expect(describeEmailError("validation_error", "domain_unverified")).toMatch(
      /sending domain/i
    );
    expect(
      describeEmailError("validation_error", "test_recipients_only")
    ).toMatch(/test recipients/i);
    expect(describeEmailError("validation_error", "invalid_address")).toMatch(
      /email address/i
    );
    expect(describeEmailError("anything_else")).toMatch(/try again/i);
  });
});

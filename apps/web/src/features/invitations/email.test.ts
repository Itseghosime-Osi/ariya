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
    expect(html).toContain("Aso-ebi");
    expect(text).toContain("https://ariyaday.com/i/abc123");
    expect(text).toContain("When: Saturday, 12 December 2026");
  });

  it("leaves out rows it has nothing for", () => {
    const { html } = buildInvitationEmail({ ...base, dressCode: null });
    expect(html).not.toContain("Dress code");
  });

  it("explains an unverified domain in plain words", () => {
    expect(describeEmailError("validation_error")).toMatch(/domain/i);
    expect(describeEmailError("anything_else")).toMatch(/try again/i);
  });
});

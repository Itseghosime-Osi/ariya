import { describe, expect, it } from "vitest";
import { renderBrandEmail } from "./brand";
import {
  authLinkEmail,
  reminderEmail,
  rsvpAcceptedEmail,
  rsvpDeclinedEmail,
  rsvpRevisedEmail,
  welcomeEmail,
} from "./templates";

const SITE = "https://www.ariyaday.com";

describe("the brand email", () => {
  it("escapes everything a person typed", () => {
    const { html } = renderBrandEmail({
      siteUrl: SITE,
      preview: "p",
      kicker: "k",
      headline: ["<b>x</b>"],
      greeting: "Dear <script>alert(1)</script>,",
      paragraphs: ['"quoted" & <i>tagged</i>'],
      rows: [{ label: "Venue", value: "<img src=x>" }],
      cta: { title: "t", label: "Go", url: 'https://x.test/?a="1"' },
      reason: "r",
    });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&quot;quoted&quot; &amp;");
  });

  it("drops empty detail rows and numbers the rest", () => {
    const { html, text } = renderBrandEmail({
      siteUrl: SITE,
      preview: "p",
      kicker: "k",
      headline: ["h"],
      paragraphs: ["p"],
      rows: [
        { label: "Date", value: "Saturday" },
        { label: "Dress code", value: "  " },
        { label: "Venue", value: "Eko Hotel" },
      ],
      reason: "r",
    });
    expect(html).not.toContain("Dress code");
    expect(text).toContain("Venue: Eko Hotel");
    expect(html).toMatch(/>ii<\/td>/);
    expect(html).not.toMatch(/>iii<\/td>/);
  });
});

describe("the emails", () => {
  it("welcomes a new host by first name, once, with a way to start", () => {
    const mail = welcomeEmail({
      name: "Ada Obi",
      email: "ada@example.com",
      siteUrl: SITE,
    });
    expect(mail.subject).toBe("Welcome to Àríyá, Ada ✦");
    expect(mail.html).toContain("Hello Ada,");
    expect(mail.html).toContain(`${SITE}/events/new`);
    expect(mail.html).toContain("ada@example.com");
    expect(mail.text).toContain("Start my first celebration");
  });

  it("still reads well without a name", () => {
    const mail = welcomeEmail({ email: "x@example.com", siteUrl: SITE });
    expect(mail.subject).toBe("Welcome to Àríyá ✦");
    expect(mail.html).toContain("Hello,");
  });

  it("confirms an email and resets a passcode with the link in full", () => {
    const confirm = authLinkEmail({
      kind: "confirm",
      name: "Ada",
      email: "ada@example.com",
      url: "https://www.ariyaday.com/auth/confirm?token_hash=abc&type=signup",
      siteUrl: SITE,
    });
    expect(confirm.subject).toBe("Confirm your email for Àríyá");
    expect(confirm.html).toContain("Confirm my email");
    expect(confirm.html).toContain("token_hash=abc&amp;type=signup");
    expect(confirm.html).toContain("Button taking the day off?");

    const reset = authLinkEmail({
      kind: "reset",
      email: "ada@example.com",
      url: "https://www.ariyaday.com/auth/confirm?type=recovery",
      siteUrl: SITE,
    });
    expect(reset.subject).toBe("Reset your Àríyá passcode");
    expect(reset.html).toContain("Choose a new passcode");
  });

  it("tells a guest their seat is reserved, with the table only when there is one", () => {
    const base = {
      guestName: "Tolu",
      couple: "Ada & Obi",
      title: "Ada & Obi’s Wedding",
      passUrl: "https://www.ariyaday.com/i/tok",
      siteUrl: SITE,
      date: "Saturday, 12 December 2026",
      venue: "Eko Hotel",
      attendingCount: 2,
    };
    const seated = rsvpAcceptedEmail({ ...base, tableName: "Table 4" });
    expect(seated.subject).toContain("Your seat is reserved");
    expect(seated.html).toContain("2 seats");
    expect(seated.html).toContain("Table 4");
    expect(rsvpAcceptedEmail(base).html).not.toContain("Your table");
  });

  it("acknowledges regrets and updates", () => {
    const base = {
      guestName: "Tolu",
      couple: "Ada & Obi",
      title: "The Wedding",
      passUrl: "https://www.ariyaday.com/i/tok",
      siteUrl: SITE,
    };
    expect(rsvpDeclinedEmail(base).html).toContain("Update my reply");
    const revised = rsvpRevisedEmail({
      ...base,
      status: "accepted",
      attendingCount: 1,
      dietary: "No nuts",
    });
    expect(revised.html).toContain("1 guest");
    expect(revised.html).toContain("No nuts");
  });

  it("reminds a guest with the host's own words, escaped", () => {
    const mail = reminderEmail({
      guestName: "Tolu",
      couple: "Ada & Obi",
      title: "The Wedding",
      date: "Saturday, 12 December 2026",
      venue: "Eko Hotel",
      subject: "Final call for seating",
      message: "Please reply <b>today</b>",
      rsvpUrl: "https://www.ariyaday.com/i/tok",
      siteUrl: SITE,
    });
    expect(mail.subject).toBe("Final call for seating");
    expect(mail.html).toContain("Please reply &lt;b&gt;today&lt;/b&gt;");
    expect(
      reminderEmail({
        guestName: "Tolu",
        couple: "Ada & Obi",
        date: "d",
        venue: "v",
        rsvpUrl: "u",
        siteUrl: SITE,
      }).subject
    ).toBe("A gentle reminder: the celebration of Ada & Obi");
  });
});

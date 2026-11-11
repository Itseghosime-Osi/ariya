import { test, expect } from "@playwright/test";
import { createAndLoginUser, createTestEvent } from "./fixtures/test-helpers";
import { serviceRoleClient } from "./fixtures/service-role";
import { inspectInvitationImage } from "./fixtures/invitation-image";
import { writeFileSync } from "node:fs";

/** Very long couple and guest names, and what guests see after the host edits the event. */
test("long names fit the guest card and pass; event edits follow the saved design", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  test.setTimeout(300000);
  page.setDefaultTimeout(15000);
  const results: Record<string, unknown> = {};
  await createAndLoginUser(page, undefined, "studio_guest_extra");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const couple =
    "Oluwaseyifunmitayo Chukwuemeka-Babatunde & Oluwadamilare Adebayowale-Ogunleye";
  const { eventId } = await createTestEvent(page, {
    couple,
    title: "Long names verification",
    venue: "The Grand Ballroom of the Federal Palace Hotel and Towers",
  });
  await page.goto(`/events/${eventId}/page-editor`);
  await page.getByRole("tab", { name: /rsvp.*card/i }).click();
  const access = page.getByRole("switch", {
    name: /give each guest an access card/i,
  });
  if ((await access.getAttribute("aria-checked")) !== "true") {
    await access.click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(
      page.getByText(/guests see this when they reply/i)
    ).toBeVisible();
  }
  await page.getByRole("tab", { name: /film/i }).click();
  const live = page.getByRole("switch", {
    name: "Invitation is live",
    exact: true,
  });
  if ((await live.getAttribute("aria-checked")) !== "true") {
    await live.click();
    await expect(
      page.getByText("The invitation is live. Guests can open it.", {
        exact: true,
      })
    ).toBeVisible();
  }
  // Save the house design once, so the guest card is the host's saved artwork.
  await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
  const designCard = page
    .getByTestId("designer-stage")
    .locator("[data-invitation-canvas]");
  await expect(designCard).toBeVisible();
  await page
    .getByTestId("layer-row-names")
    .locator("[data-layer-select]")
    .click();
  const headline = "Ẹ wá bá wa ṣayẹyẹ: " + couple;
  await page.getByRole("textbox", { name: "Text", exact: true }).fill(headline);
  await expect(
    page.getByTestId("studio-top-header").getByRole("status")
  ).toHaveText(/^saved/, { timeout: 20000 });

  const guestName =
    "Chief Dr. Oluwafunmilayo Adaeze Chukwuebuka Nwachukwu-Onyekachukwu Jr.";
  await page.goto(`/events/${eventId}/guests`);
  await page.getByRole("button", { name: /add guest/i }).click();
  await page
    .getByPlaceholder("Chief Olawale Adeyemi", { exact: true })
    .fill(guestName);
  await page.getByRole("button", { name: /add to guestbook/i }).click();
  await page.getByText(guestName, { exact: true }).first().click();
  await page
    .getByRole("button", { name: /copy link/i })
    .first()
    .click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const origin = new URL(baseURL!);
  expect(["127.0.0.1", "localhost"]).toContain(origin.hostname);

  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const guest = await guestContext.newPage();
  guest.setDefaultTimeout(20000);
  try {
    await guest.goto(new URL(new URL(link).pathname, origin).href);
    await guest.getByLabel(/Joyfully Accept/i).check();
    await guest.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(
      guest.getByRole("button", { name: "Save my invitation", exact: true })
    ).toBeVisible();
    const card = guest
      .getByRole("region", { name: "Your invitation", exact: true })
      .locator("[data-invitation-canvas]");
    await expect(card.locator('[data-layer-id="names"]')).toHaveText(headline);
    // DES-126 and DES-245: nothing the long names produce leaves the card or hides behind other text.
    const fit = await card.evaluate((el) => {
      const c = el.getBoundingClientRect();
      const rows = [...el.querySelectorAll<HTMLElement>("[data-layer-id]")]
        .filter((e) => !e.hasAttribute("data-entry-seal"))
        .map((e) => {
          const r = e.getBoundingClientRect();
          return {
            id: e.getAttribute("data-layer-id"),
            left: r.left - c.left,
            right: c.right - r.right,
            bottom: c.bottom - r.bottom,
            clipped: e.scrollWidth > e.clientWidth + 1,
          };
        });
      return rows.filter(
        (r) => r.left < -1 || r.right < -1 || r.bottom < -1 || r.clipped
      );
    });
    results.cardOverflow = fit;
    expect(fit, "no layer overflows or is clipped").toEqual([]);
    const guestLabel = guest
      .getByText(guestName.slice(0, 20), { exact: false })
      .first();
    await expect(guestLabel).toBeVisible();
    const pending = guest.waitForEvent("download", { timeout: 90000 });
    await guest
      .getByRole("button", { name: "Save my invitation", exact: true })
      .click();
    const file = await pending;
    const name = file.suggestedFilename();
    results.downloadName = name.replace(/[A-Za-zÀ-ɏḀ-ỿ]{12,}/g, "…");
    expect(name).toMatch(/\.png$/);
    expect(name.length).toBeLessThanOrEqual(140);
    const stream = await file.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk as Buffer);
    const png = Buffer.concat(chunks);
    const { decoded } = await inspectInvitationImage(guest, card, png);
    const expected = (await guest.locator("span.font-mono").allTextContents())
      .map((text) => text.trim())
      .find((text) => text.startsWith("ARY-"));
    results.passDecodes = Boolean(expected) && decoded === expected;
    expect(
      results.passDecodes,
      "the exported pass still scans with long names"
    ).toBe(true);

    // DES-249: the host edits the event after the design was saved.
    const admin = serviceRoleClient();
    const newVenue = "Eko Hotels and Suites, Adetokunbo Ademola Street";
    const { error } = await admin
      .from("events")
      .update({ venue: newVenue })
      .eq("id", eventId);
    expect(error).toBeNull();
    // The saved card keeps the host's words until the host chooses to update it.
    await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
    const venueLayer = page
      .getByTestId("designer-stage")
      .locator('[data-invitation-canvas] [data-layer-id="venue"]');
    await expect(venueLayer).toBeVisible();
    results.venueBeforeUpdate = await venueLayer.textContent();
    expect(results.venueBeforeUpdate).not.toContain("Eko Hotels");
    const banner = page.getByTestId("event-facts-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Venue");
    await expect(banner).not.toContainText("Date");
    await banner.getByRole("button", { name: "Update the card" }).click();
    await expect(venueLayer).toContainText("Eko Hotels");
    await expect(banner).toHaveCount(0);
    // One Undo puts the old wording back.
    await page.keyboard.press("Control+z");
    await expect(venueLayer).not.toContainText("Eko Hotels");
    await page.keyboard.press("Control+Shift+z");
    await expect(venueLayer).toContainText("Eko Hotels");
    await expect(
      page.getByTestId("studio-top-header").getByRole("status")
    ).toHaveText(/^saved/, { timeout: 20000 });
    await guest.reload();
    await expect(card.locator('[data-layer-id="venue"]')).toContainText(
      "Eko Hotels"
    );
    results.guestCardVenueAfterUpdate = await card
      .locator('[data-layer-id="venue"]')
      .textContent();
    // "Keep my wording" hides the offer for those exact changes, and survives a reload.
    const { error: dressError } = await admin
      .from("events")
      .update({ dress_code: "Aso-ebi, gold and ivory" })
      .eq("id", eventId);
    expect(dressError).toBeNull();
    await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
    await expect(page.getByTestId("event-facts-banner")).toBeVisible();
    await page.getByRole("button", { name: "Keep my wording" }).click();
    await expect(page.getByTestId("event-facts-banner")).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByTestId("designer-stage").locator("[data-invitation-canvas]")
    ).toBeVisible();
    await expect(page.getByTestId("event-facts-banner")).toHaveCount(0);
    console.log("GUESTEXTRA", JSON.stringify(results));
  } finally {
    writeFileSync(
      test.info().outputPath("guest-extra-results.json"),
      JSON.stringify(results, null, 2)
    );
    await guestContext.close();
  }
});

import { test, expect } from "@playwright/test";
import {
  createAndLoginUser,
  createTestEvent,
  showAllInspectorOptions,
} from "./fixtures/test-helpers";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { inspectInvitationImage } from "./fixtures/invitation-image";

test("saved invitation reaches an accepted guest and downloads at document resolution", async ({
  page,
  context,
  browser,
  baseURL,
}) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(12000);
  await showAllInspectorOptions(page);
  if (process.env.STUDIO_TEST_EMAIL) {
    await page.goto("/sign-in");
    await page.locator("#signin-email").fill(process.env.STUDIO_TEST_EMAIL);
    await page.locator("#signin-password").fill("Celebration2026!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/events/, { timeout: 45000 });
  } else await createAndLoginUser(page, undefined, "studio_guest");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const { eventId } = await createTestEvent(page, {
    couple: "Ọlá & Adéṣọlá",
    title: "Guest invitation verification",
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
  await page.goto(`/events/${eventId}/invitations/design?mode=pro`);
  const headline = "Ẹ wá bá Ọlá àti Adéṣọlá ṣayẹyẹ";
  await page
    .getByTestId("layer-row-names")
    .locator("[data-layer-select]")
    .click();
  await page.getByRole("textbox", { name: "Text", exact: true }).fill(headline);
  await expect(
    page.getByTestId("studio-top-header").getByRole("status")
  ).toHaveText(/^saved/, { timeout: 15000 });
  await page.reload();
  await expect(
    page.getByTestId("designer-stage").locator('[data-layer-id="names"]')
  ).toHaveText(headline);
  // Backups from older editors can contain destructive pass styling. It must not reach the seal.
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page
    .getByRole("button")
    .filter({ hasText: "Design Backup (.json)" })
    .click();
  const backupPending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON", exact: true })
    .click();
  const backupStream = await (await backupPending).createReadStream();
  const backupChunks = [];
  for await (const chunk of backupStream!) backupChunks.push(chunk);
  const document = JSON.parse(Buffer.concat(backupChunks).toString());
  const seal = document.layers.find(
    (layer: { kind: string }) => layer.kind === "code"
  );
  Object.assign(seal, {
    opacity: 0,
    blur: 30,
    flipX: true,
    flipY: true,
    blendMode: "screen",
    visible: false,
  });
  document.palette.title = document.palette.paper;
  await page
    .getByLabel("Choose an invitation design backup", { exact: true })
    .setInputFiles({
      name: "protected-pass.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(document)),
    });
  const passRow = page.getByTestId(`layer-row-${seal.id}`);
  await passRow.locator("[data-layer-select]").click();
  await expect(passRow.getByRole("button", { name: /^Hide / })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Flip horizontal", exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Flip vertical", exact: true })
  ).toBeDisabled();
  await expect(page.getByLabel("See-through", { exact: true })).toBeDisabled();
  await expect(
    page.getByLabel("Layer opacity", { exact: true })
  ).toBeDisabled();
  const sample = page
    .getByTestId("designer-stage")
    .locator("[data-entry-seal]");
  await expect(sample).toBeVisible();
  await expect(sample).toHaveCSS("opacity", "1");
  await expect(sample).toHaveCSS("filter", "none");
  await expect(sample).toHaveCSS("mix-blend-mode", "normal");
  await expect(sample).toHaveCSS("transform", "none");
  await page.keyboard.press("Control+j");
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await passRow.locator("[data-layer-select]").click();
  await expect(
    page
      .getByTestId("inspector-layer")
      .getByRole("button", { name: "Delete", exact: true })
  ).toBeDisabled();
  await page.keyboard.press("Delete");
  await expect(sample).toHaveCount(1);
  await expect(
    page.getByTestId("studio-top-header").getByRole("status")
  ).toHaveText(/^saved/, { timeout: 15000 });
  const choosing = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Place image / photo", exact: true })
    .click();
  await (
    await choosing
  ).setFiles(path.resolve(__dirname, "fixtures/designer/sample.jpg"));
  await expect(
    page.getByLabel("Frame mask shape", { exact: true })
  ).toBeVisible();
  const pictureFields = ["X", "Y", "Width", "Height"];
  for (const [index, value] of [800, 160, 160, 100].entries()) {
    const field = page.getByLabel(pictureFields[index], { exact: true });
    await field.fill(String(value));
    await field.blur();
  }
  const picture = page
    .getByTestId("designer-stage")
    .locator("[data-layer-id]")
    .last();
  const pictureId = (await picture.getAttribute("data-layer-id"))!;
  const pictureStyle = await picture.evaluate((el) => {
    const s = (el as HTMLElement).style;
    return {
      left: s.left,
      top: s.top,
      width: s.width,
      height: s.height,
      background: s.backgroundImage,
    };
  });
  await expect(
    page.getByTestId("studio-top-header").getByRole("status")
  ).toHaveText(/^saved/, { timeout: 15000 });
  const links: string[] = [];
  for (const name of ["Nnenna Ọlá-Adeṣọlá", "Emeka Okafor"]) {
    await page.goto(`/events/${eventId}/guests`);
    await page.getByRole("button", { name: /add guest/i }).click();
    await page
      .getByPlaceholder("Chief Olawale Adeyemi", { exact: true })
      .fill(name);
    if (name === "Nnenna Ọlá-Adeṣọlá") {
      await page.getByLabel("Party size", { exact: true }).fill("2");
      await page
        .getByRole("switch", { name: "Allow a +1 companion", exact: true })
        .click();
    }
    await page.getByRole("button", { name: /add to guestbook/i }).click();
    await page.getByText(name, { exact: true }).first().click();
    await page
      .getByRole("button", { name: /copy link/i })
      .first()
      .click();
    links.push(await page.evaluate(() => navigator.clipboard.readText()));
  }
  const link = links[0];
  // Never follow a copied link to a hosted database while running this local acceptance test.
  const origin = new URL(baseURL!);
  expect(["127.0.0.1", "localhost"]).toContain(origin.hostname);
  const target = new URL(link);
  const personalPath = target.pathname;
  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    acceptDownloads: true,
  });
  const guest = await guestContext.newPage();
  guest.setDefaultTimeout(15000);
  try {
    await guest.goto(new URL(personalPath, origin).href);
    await expect(
      guest.getByText("Nnenna Ọlá-Adeṣọlá", { exact: false }).first()
    ).toBeVisible();
    await expect(guest.locator("[data-entry-seal]")).toHaveCount(0);
    await guest.getByLabel(/Joyfully Accept/i).check();
    await guest.getByLabel(/Number of Attending Guests/).selectOption("3");
    await guest
      .getByLabel("Plus One Full Name", { exact: true })
      .fill("Adaora Okeke");
    await guest.getByLabel(/Dietary Requirements/).fill("No peanuts");
    await guest.getByRole("button", { name: /submit rsvp response/i }).click();
    await expect(
      guest.getByRole("button", { name: "Save my invitation", exact: true })
    ).toBeVisible();
    await expect(guest.getByText("3 attendees", { exact: true })).toBeVisible();
    await expect(
      guest.getByText("Adaora Okeke", { exact: true })
    ).toBeVisible();
    await expect(guest.getByText("No peanuts", { exact: true })).toBeVisible();
    const card = guest
      .getByRole("region", { name: "Your invitation", exact: true })
      .locator("[data-invitation-canvas]");
    await expect(card.locator('[data-layer-id="names"]')).toHaveText(headline);
    await expect(card.locator("[data-entry-seal]")).toHaveCount(1);
    const guestPicture = card.locator(`[data-layer-id="${pictureId}"]`);
    await expect(guestPicture).toBeVisible();
    expect(
      await guestPicture.evaluate((el) => {
        const s = (el as HTMLElement).style;
        return {
          left: s.left,
          top: s.top,
          width: s.width,
          height: s.height,
          background: s.backgroundImage,
        };
      })
    ).toEqual(pictureStyle);
    const dimensions = [];
    for (const width of [390, 1440]) {
      await guest.setViewportSize({ width, height: 950 });
      const pending = guest.waitForEvent("download", { timeout: 90000 });
      await guest
        .getByRole("button", { name: "Save my invitation", exact: true })
        .click();
      const file = await pending;
      expect(file.suggestedFilename()).toBe(
        "invitation-Nnenna-Ọlá-Adeṣọlá.png"
      );
      const stream = await file.createReadStream();
      const chunks = [];
      for await (const chunk of stream!) chunks.push(chunk);
      const png = Buffer.concat(chunks);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      dimensions.push([png.readUInt32BE(16), png.readUInt32BE(20)]);
      const { decoded, photoPixel } = await inspectInvitationImage(
        guest,
        card,
        png,
        guestPicture
      );
      expect(photoPixel[0]).toBeGreaterThan(160);
      expect(photoPixel[1]).toBeGreaterThan(100);
      expect(photoPixel[2]).toBeLessThan(180);
      const expected = (await guest.locator("span.font-mono").allTextContents())
        .map((text) => text.trim())
        .find((text) => text.startsWith("ARY-"));
      expect(
        Boolean(expected) && decoded === expected,
        "The exported seal must match this guest's entry code"
      ).toBe(true);
    }
    expect(dimensions).toEqual([
      [3240, 4536],
      [3240, 4536],
    ]);
    await guest.reload();
    await expect(card.locator('[data-layer-id="names"]')).toHaveText(headline);
    await expect(card.locator("[data-entry-seal]")).toHaveCount(1);
    await guest
      .getByRole("link", { name: /Update RSVP or dietary preferences/i })
      .click();
    await expect(guest.getByLabel(/Number of Attending Guests/)).toHaveValue(
      "3"
    );
    await expect(
      guest.getByLabel("Plus One Full Name", { exact: true })
    ).toHaveValue("Adaora Okeke");
    await expect(guest.getByLabel(/Dietary Requirements/)).toHaveValue(
      "No peanuts"
    );
    await guest.getByLabel(/Number of Attending Guests/).selectOption("1");
    await expect(
      guest.getByLabel("Plus One Full Name", { exact: true })
    ).toHaveCount(0);
    await guest
      .getByRole("button", { name: /update.*rsvp|submit rsvp response/i })
      .click();
    await expect(guest.getByText("1 attendee", { exact: true })).toBeVisible();
    await expect(guest.getByText("Adaora Okeke", { exact: true })).toHaveCount(
      0
    );
    await expect(guest.getByText("No peanuts", { exact: true })).toBeVisible();
    const declining = await guestContext.newPage();
    await declining.goto(new URL(new URL(links[1]).pathname, origin).href);
    await expect(
      declining.getByText("Emeka Okafor", { exact: false }).first()
    ).toBeVisible();
    await expect(
      declining.getByText("Nnenna Ọlá-Adeṣọlá", { exact: false })
    ).toHaveCount(0);
    await declining.getByLabel(/Regretfully Decline/i).check();
    await declining
      .getByRole("button", { name: /submit rsvp response/i })
      .click();
    await expect(
      declining.getByText("Regrets Recorded", { exact: true })
    ).toBeVisible();
    await expect(declining.locator("[data-entry-seal]")).toHaveCount(0);
    await expect(
      declining.getByRole("button", { name: "Save my invitation", exact: true })
    ).toHaveCount(0);
    await declining.close();
    // The access-card setting governs guest output even when a seal remains in the saved design.
    await page.goto(`/events/${eventId}/page-editor`);
    await page.getByRole("tab", { name: /rsvp.*card/i }).click();
    await page
      .getByRole("switch", { name: /give each guest an access card/i })
      .click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(
      page.getByText(/guests see this when they reply/i)
    ).toBeVisible();
    await guest.reload();
    await expect(guest.locator("[data-entry-seal]")).toHaveCount(0);
    await expect(card.locator('[data-layer-id="names"]')).toHaveText(headline);
    await expect(
      guest.getByText(/If the seal will not scan, give this code at the desk/)
    ).toHaveCount(0);
    await expect(
      guest.getByRole("button", { name: "Save my invitation", exact: true })
    ).toBeVisible();
    await page
      .getByRole("switch", { name: /give each guest an access card/i })
      .click();
    await page.getByRole("button", { name: /^save$/i }).click();
    await expect(
      page.getByText(/guests see this when they reply/i)
    ).toBeVisible();
    await guest.reload();
    await expect(card.locator("[data-entry-seal]")).toHaveCount(1);
    writeFileSync(
      test.info().outputPath("guest-evidence.json"),
      JSON.stringify(
        {
          checks: [
            "saved host wording and uploaded artwork reach the anonymous guest",
            "image geometry matches the saved designer and image pixels appear in both PNG exports",
            "required pass cannot be hidden, deleted, duplicated or mirrored",
            "imported transparency, blur and low-contrast colours cannot erase the seal",
            "unaccepted guest has no entry seal",
            "accepted guest has exactly one personal seal",
            "guest state and artwork survive reload",
            "party count, companion name and dietary requirements persist on reload and revision",
            "reducing a party from three to one clears the companion without losing dietary notes",
            "a second guest sees their own details and receives no pass after declining",
            "turning access cards off retains the host artwork while removing only the pass",
            "turning access cards back on restores the personal seal",
            "phone and desktop PNG dimensions agree",
            "both exported seals independently decode to the personal entry code",
          ],
          pngDimensions: dimensions,
          scope:
            "Local fictional event only; no personal links or entry codes recorded",
        },
        null,
        2
      )
    );
  } finally {
    await guestContext.close();
  }
});
